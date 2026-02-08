export interface AgentConnection {
  id: string;
  name: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  authenticated: boolean;
}

export interface WSMessage {
  type: string;
  taskId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface BroadcastResult {
  deviceName: string;
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

export interface DeployStatus {
  deviceId: string;
  deviceName: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
  message?: string;
}

export interface HubStatus {
  running: boolean;
  port: number;
  agents: { name: string; connectedAt: string; lastHeartbeat: string }[];
}
