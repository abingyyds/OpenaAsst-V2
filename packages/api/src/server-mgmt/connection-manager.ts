import { CommandExecutor, type ExecutionLog } from './executor.js';
import type { DeviceConfig, ConnectionType } from './device-manager.js';
import * as os from 'os';

export interface ConnectionExecutor {
  execute(command: string): Promise<ExecutionLog>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}

export class SSHExecutor implements ConnectionExecutor {
  private executor = new CommandExecutor();
  constructor(private device: DeviceConfig) {}

  private buildSSHPrefix(): string {
    const host = this.device.host;
    const port = this.device.port || 22;
    const user = this.device.username || 'root';

    if (this.device.authType === 'privateKey' && this.device.privateKeyPath) {
      const keyPath = this.device.privateKeyPath.replace('~', os.homedir());
      return `ssh -i "${keyPath}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${port} ${user}@${host}`;
    }
    if (this.device.password) {
      return `sshpass -p "${this.device.password}" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${port} ${user}@${host}`;
    }
    return `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${port} ${user}@${host}`;
  }

  async execute(command: string): Promise<ExecutionLog> {
    const escaped = command.replace(/"/g, '\\"');
    return this.executor.execute(`${this.buildSSHPrefix()} "${escaped}"`);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const result = await this.execute('echo OK');
    if (result.exitCode === 0 && result.output.trim() === 'OK') {
      return { ok: true };
    }
    return { ok: false, error: result.error || result.output || `exit code ${result.exitCode}` };
  }
}

export class LocalExecutor implements ConnectionExecutor {
  private executor = new CommandExecutor();

  async execute(command: string): Promise<ExecutionLog> {
    return this.executor.execute(command);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const result = await this.execute('echo OK');
    if (result.exitCode === 0) return { ok: true };
    return { ok: false, error: result.error || 'Local execution failed' };
  }
}

export class DockerExecutor implements ConnectionExecutor {
  private executor = new CommandExecutor();
  constructor(private device: DeviceConfig) {}

  async execute(command: string): Promise<ExecutionLog> {
    const container = this.device.containerName || this.device.containerId || '';
    const escaped = command.replace(/"/g, '\\"');
    return this.executor.execute(`docker exec ${container} sh -c "${escaped}"`);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const container = this.device.containerName || this.device.containerId || '';
    const result = await this.executor.execute(`docker inspect ${container} --format="{{.State.Running}}"`);
    if (result.exitCode === 0 && result.output.trim() === 'true') {
      return { ok: true };
    }
    return { ok: false, error: result.error || 'Container not running' };
  }
}

export class KubernetesExecutor implements ConnectionExecutor {
  private executor = new CommandExecutor();
  constructor(private device: DeviceConfig) {}

  async execute(command: string): Promise<ExecutionLog> {
    const pod = this.device.podName || '';
    const ns = this.device.namespace || 'default';
    const container = this.device.k8sContainerName;
    const containerFlag = container ? `-c ${container}` : '';
    const escaped = command.replace(/"/g, '\\"');
    return this.executor.execute(
      `kubectl exec ${pod} -n ${ns} ${containerFlag} -- sh -c "${escaped}"`
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const result = await this.execute('echo OK');
    if (result.exitCode === 0) return { ok: true };
    return { ok: false, error: result.error || 'Pod not reachable' };
  }
}

export class WSLExecutor implements ConnectionExecutor {
  private executor = new CommandExecutor();
  constructor(private device: DeviceConfig) {}

  async execute(command: string): Promise<ExecutionLog> {
    const distro = this.device.distributionName;
    const distroFlag = distro ? `-d ${distro}` : '';
    const escaped = command.replace(/"/g, '\\"');
    return this.executor.execute(`wsl ${distroFlag} -- sh -c "${escaped}"`);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const result = await this.execute('echo OK');
    if (result.exitCode === 0) return { ok: true };
    return { ok: false, error: result.error || 'WSL not reachable' };
  }
}

export class DockerRemoteExecutor implements ConnectionExecutor {
  private executor = new CommandExecutor();
  constructor(private device: DeviceConfig) {}

  private buildDockerHost(): string {
    const proto = this.device.dockerApiProtocol || 'http';
    const host = this.device.dockerApiHost || '127.0.0.1';
    const port = this.device.dockerApiPort || 2375;
    return `${proto}://${host}:${port}`;
  }

  async execute(command: string): Promise<ExecutionLog> {
    const container = this.device.containerName || this.device.containerId || '';
    const dockerHost = this.buildDockerHost();
    const escaped = command.replace(/"/g, '\\"');
    return this.executor.execute(
      `DOCKER_HOST=${dockerHost} docker exec ${container} sh -c "${escaped}"`
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    const dockerHost = this.buildDockerHost();
    const result = await this.executor.execute(`DOCKER_HOST=${dockerHost} docker info --format="{{.ServerVersion}}"`);
    if (result.exitCode === 0) return { ok: true };
    return { ok: false, error: result.error || 'Docker Remote API not reachable' };
  }
}

export class ConnectionManager {
  private cache = new Map<string, ConnectionExecutor>();

  getExecutor(device: DeviceConfig): ConnectionExecutor {
    const type = device.connectionType || 'ssh';
    const cached = this.cache.get(device.id);
    if (cached) return cached;

    let executor: ConnectionExecutor;
    switch (type) {
      case 'local':
        executor = new LocalExecutor();
        break;
      case 'docker':
        executor = new DockerExecutor(device);
        break;
      case 'docker-remote':
        executor = new DockerRemoteExecutor(device);
        break;
      case 'kubernetes':
        executor = new KubernetesExecutor(device);
        break;
      case 'wsl':
        executor = new WSLExecutor(device);
        break;
      case 'ssh':
      default:
        executor = new SSHExecutor(device);
        break;
    }

    this.cache.set(device.id, executor);
    return executor;
  }

  clearCache(deviceId?: string): void {
    if (deviceId) {
      this.cache.delete(deviceId);
    } else {
      this.cache.clear();
    }
  }
}
