import { WebSocketServer, WebSocket } from 'ws';
import { DeviceManager } from '../server-mgmt/device-manager.js';
import * as crypto from 'crypto';

export interface AgentConn {
  id: string;
  name: string;
  ws: WebSocket;
  connectedAt: Date;
  lastHeartbeat: Date;
  authenticated: boolean;
  capabilities: string[];
  version?: string;
}

interface WSMsg {
  type: string;
  taskId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export class WSHub {
  private wss: WebSocketServer | null = null;
  private agents: Map<string, AgentConn> = new Map();
  private deviceManager: DeviceManager;
  private port: number;
  private secretKey: string;
  private pendingResults: Map<string, unknown[]> = new Map();
  private resultCallbacks: Map<string, (results: unknown[]) => void> = new Map();
  private taskProgressCallbacks: Map<string, (event: unknown) => void> = new Map();
  private taskResultCallbacks: Map<string, (result: unknown) => void> = new Map();
  private taskResultCounts: Map<string, { received: number; expected: number; results: unknown[] }> = new Map();

  constructor(deviceManager: DeviceManager) {
    this.deviceManager = deviceManager;
    this.port = deviceManager.getMasterPort();
    this.secretKey = deviceManager.getSecretKey();
  }

  start(): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      console.error(`[Hub] Error: ${error.message}`);
    });

    console.log(`[Hub] Started on port ${this.port}`);
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.agents.clear();
      console.log('[Hub] Stopped');
    }
  }

  isRunning(): boolean {
    return this.wss !== null;
  }

  getPort(): number {
    return this.port;
  }

  getOnlineAgents(): AgentConn[] {
    return Array.from(this.agents.values()).filter((a) => a.authenticated);
  }

  getAgentByName(name: string): AgentConn | undefined {
    for (const agent of this.agents.values()) {
      if (agent.name === name) return agent;
    }
    return undefined;
  }

  private handleConnection(ws: WebSocket): void {
    const connId = crypto.randomBytes(8).toString('hex');
    const conn: AgentConn = {
      id: connId,
      name: '',
      ws,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      authenticated: false,
      capabilities: ['command'],
    };

    this.agents.set(connId, conn);

    ws.on('message', (data) => {
      this.handleMessage(conn, data.toString());
    });

    ws.on('close', () => {
      this.agents.delete(connId);
    });

    ws.on('error', () => {});
  }

  private handleMessage(conn: AgentConn, data: string): void {
    try {
      const msg: WSMsg = JSON.parse(data);
      switch (msg.type) {
        case 'auth':
          this.handleAuth(conn, msg);
          break;
        case 'heartbeat':
          this.handleHeartbeat(conn);
          break;
        case 'command_result':
          this.handleCommandResult(msg);
          break;
        case 'task_progress':
          this.handleTaskProgress(msg);
          break;
        case 'task_result':
          this.handleTaskResult(msg);
          break;
        case 'config_sync_ack':
          this.handleConfigSyncAck(msg);
          break;
      }
    } catch {
      // ignore parse errors
    }
  }

  private handleAuth(conn: AgentConn, msg: WSMsg): void {
    const { agentName, secretKey, capabilities, version } = msg.payload as {
      agentName: string;
      secretKey: string;
      capabilities?: string[];
      version?: string;
    };

    if (secretKey === this.secretKey) {
      conn.authenticated = true;
      conn.name = agentName;
      conn.capabilities = capabilities || ['command'];
      conn.version = version;
      this.send(conn.ws, {
        type: 'auth_result',
        payload: { success: true },
        timestamp: Date.now(),
      });
    } else {
      this.send(conn.ws, {
        type: 'auth_result',
        payload: { success: false, error: 'Invalid secret key' },
        timestamp: Date.now(),
      });
    }
  }

  private handleHeartbeat(conn: AgentConn): void {
    conn.lastHeartbeat = new Date();
    this.send(conn.ws, {
      type: 'heartbeat_ack',
      payload: {},
      timestamp: Date.now(),
    });
  }

  private handleCommandResult(msg: WSMsg): void {
    if (!msg.taskId) return;
    const results = this.pendingResults.get(msg.taskId) || [];
    results.push(msg.payload);
    this.pendingResults.set(msg.taskId, results);

    const callback = this.resultCallbacks.get(msg.taskId);
    if (callback) callback(results);
  }

  private handleTaskProgress(msg: WSMsg): void {
    if (!msg.taskId) return;
    const callback = this.taskProgressCallbacks.get(msg.taskId);
    if (callback) callback(msg.payload);
  }

  private handleTaskResult(msg: WSMsg): void {
    if (!msg.taskId) return;
    const tracker = this.taskResultCounts.get(msg.taskId);
    if (tracker) {
      tracker.received++;
      tracker.results.push(msg.payload);
      if (tracker.received >= tracker.expected) {
        const cb = this.taskResultCallbacks.get(msg.taskId);
        if (cb) cb(tracker.results);
        this.taskResultCounts.delete(msg.taskId);
        this.taskResultCallbacks.delete(msg.taskId);
        this.taskProgressCallbacks.delete(msg.taskId);
      }
    }
  }

  private handleConfigSyncAck(msg: WSMsg): void {
    if (!msg.taskId) return;
    const results = this.pendingResults.get(msg.taskId) || [];
    results.push(msg.payload);
    this.pendingResults.set(msg.taskId, results);
    const callback = this.resultCallbacks.get(msg.taskId);
    if (callback) callback(results);
  }

  async broadcast(
    command: string,
    targetNames: string[],
    timeout: number = 60000,
  ): Promise<unknown[]> {
    const taskId = crypto.randomBytes(8).toString('hex');
    const targets =
      targetNames.length > 0
        ? this.getOnlineAgents().filter((a) => targetNames.includes(a.name))
        : this.getOnlineAgents();

    if (targets.length === 0) return [];

    this.pendingResults.set(taskId, []);

    for (const agent of targets) {
      this.send(agent.ws, {
        type: 'command',
        taskId,
        payload: { command },
        timestamp: Date.now(),
      });
    }

    return new Promise((resolve) => {
      const checkComplete = (newResults: unknown[]) => {
        if (newResults.length >= targets.length) {
          cleanup();
          resolve(newResults);
        }
      };

      const cleanup = () => {
        this.resultCallbacks.delete(taskId);
        this.pendingResults.delete(taskId);
        clearTimeout(timer);
      };

      this.resultCallbacks.set(taskId, checkComplete);

      const timer = setTimeout(() => {
        const partial = this.pendingResults.get(taskId) || [];
        cleanup();
        resolve(partial);
      }, timeout);
    });
  }

  private send(ws: WebSocket, msg: WSMsg): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Dispatch a high-level task to smart agents.
   * Returns results from all targeted agents.
   */
  async dispatchTask(
    task: string,
    targetNames: string[],
    timeout: number = 300000,
    onProgress?: (event: unknown) => void,
  ): Promise<unknown[]> {
    const taskId = crypto.randomBytes(8).toString('hex');
    const allOnline = this.getOnlineAgents();
    const targets = targetNames.length > 0
      ? allOnline.filter((a) => targetNames.includes(a.name))
      : allOnline;

    // Only dispatch to agents with 'task' capability
    const smartTargets = targets.filter((a) => a.capabilities.includes('task'));
    if (smartTargets.length === 0) return [];

    // Register progress callback
    if (onProgress) {
      this.taskProgressCallbacks.set(taskId, onProgress);
    }

    // Track expected results
    this.taskResultCounts.set(taskId, {
      received: 0,
      expected: smartTargets.length,
      results: [],
    });

    // Send task to each smart agent
    for (const agent of smartTargets) {
      this.send(agent.ws, {
        type: 'task',
        taskId,
        payload: { task },
        timestamp: Date.now(),
      });
    }

    return new Promise((resolve) => {
      this.taskResultCallbacks.set(taskId, (results) => {
        clearTimeout(timer);
        resolve(results as unknown[]);
      });

      const timer = setTimeout(() => {
        const tracker = this.taskResultCounts.get(taskId);
        const partial = tracker ? tracker.results : [];
        this.taskResultCounts.delete(taskId);
        this.taskResultCallbacks.delete(taskId);
        this.taskProgressCallbacks.delete(taskId);
        resolve(partial);
      }, timeout);
    });
  }

  /**
   * Check if any online agent has 'task' capability.
   */
  hasSmartAgents(targetNames?: string[]): boolean {
    const agents = targetNames?.length
      ? this.getOnlineAgents().filter((a) => targetNames.includes(a.name))
      : this.getOnlineAgents();
    return agents.some((a) => a.capabilities.includes('task'));
  }

  /**
   * Sync API config to connected agents.
   */
  async syncConfig(
    config: Record<string, unknown>,
    targetNames: string[],
    timeout: number = 30000,
  ): Promise<unknown[]> {
    const taskId = crypto.randomBytes(8).toString('hex');
    const allOnline = this.getOnlineAgents();
    const targets = targetNames.length > 0
      ? allOnline.filter((a) => targetNames.includes(a.name))
      : allOnline;

    if (targets.length === 0) return [];

    this.pendingResults.set(taskId, []);

    for (const agent of targets) {
      this.send(agent.ws, {
        type: 'config_sync',
        taskId,
        payload: { config },
        timestamp: Date.now(),
      });
    }

    return new Promise((resolve) => {
      const checkComplete = (results: unknown[]) => {
        if (results.length >= targets.length) {
          cleanup();
          resolve(results);
        }
      };

      const cleanup = () => {
        this.resultCallbacks.delete(taskId);
        this.pendingResults.delete(taskId);
        clearTimeout(timer);
      };

      this.resultCallbacks.set(taskId, checkComplete);

      const timer = setTimeout(() => {
        const partial = this.pendingResults.get(taskId) || [];
        cleanup();
        resolve(partial);
      }, timeout);
    });
  }
}
