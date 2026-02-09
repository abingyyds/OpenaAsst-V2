import { CommandExecutor } from './executor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const CONFIG_DIR = path.join(os.homedir(), '.openasst');
const DEVICES_FILE = path.join(CONFIG_DIR, 'devices.json');

export type ConnectionType = 'ssh' | 'local' | 'docker' | 'docker-remote' | 'kubernetes' | 'wsl';

export interface DeviceConfig {
  id: string;
  name: string;
  connectionType: ConnectionType;
  // SSH
  host?: string;
  port?: number;
  username?: string;
  authType?: 'password' | 'privateKey';
  password?: string;
  privateKeyPath?: string;
  // Docker
  containerName?: string;
  containerId?: string;
  isRemoteDocker?: boolean;
  // Docker Remote API
  dockerApiHost?: string;
  dockerApiPort?: number;
  dockerApiProtocol?: 'http' | 'https';
  dockerTlsCa?: string;
  dockerTlsCert?: string;
  dockerTlsKey?: string;
  // Kubernetes
  podName?: string;
  namespace?: string;
  k8sContainerName?: string;
  // WSL
  distributionName?: string;
  // Remote connection (for remote Docker/K8s)
  remoteHost?: string;
  remotePort?: number;
  remoteUsername?: string;
  remoteAuthType?: 'password' | 'privateKey';
  remotePassword?: string;
  remotePrivateKeyPath?: string;
  // General
  tags: string[];
  group?: string;
  description?: string;
  createdAt: Date;
}

export interface DeviceGroup {
  name: string;
  description?: string;
  devices: string[];
}

export class DeviceManager {
  private executor: CommandExecutor;
  private devices: Map<string, DeviceConfig> = new Map();
  private groups: Map<string, DeviceGroup> = new Map();
  private masterPort: number = 9527;
  private secretKey: string = '';

  constructor() {
    this.executor = new CommandExecutor();
    this.loadConfig();
  }

  // ============================================
  // Device CRUD Operations
  // ============================================

  async addDevice(device: Partial<DeviceConfig>): Promise<DeviceConfig> {
    const id = device.id || this.generateId();
    const newDevice: DeviceConfig = {
      id,
      name: device.name || id,
      connectionType: device.connectionType || 'ssh',
      host: device.host,
      port: device.port || 22,
      username: device.username || 'root',
      authType: device.authType || 'password',
      password: device.password,
      privateKeyPath: device.privateKeyPath,
      containerName: device.containerName,
      containerId: device.containerId,
      isRemoteDocker: device.isRemoteDocker,
      dockerApiHost: device.dockerApiHost,
      dockerApiPort: device.dockerApiPort,
      dockerApiProtocol: device.dockerApiProtocol,
      dockerTlsCa: device.dockerTlsCa,
      dockerTlsCert: device.dockerTlsCert,
      dockerTlsKey: device.dockerTlsKey,
      podName: device.podName,
      namespace: device.namespace,
      k8sContainerName: device.k8sContainerName,
      distributionName: device.distributionName,
      remoteHost: device.remoteHost,
      remotePort: device.remotePort,
      remoteUsername: device.remoteUsername,
      remoteAuthType: device.remoteAuthType,
      remotePassword: device.remotePassword,
      remotePrivateKeyPath: device.remotePrivateKeyPath,
      tags: device.tags || [],
      group: device.group,
      description: device.description,
      createdAt: new Date()
    };

    this.devices.set(id, newDevice);
    this.saveConfig();
    return newDevice;
  }

  getDevice(idOrName: string): DeviceConfig | null {
    // Try by ID first
    if (this.devices.has(idOrName)) {
      return this.devices.get(idOrName)!;
    }
    // Try by name
    for (const device of this.devices.values()) {
      if (device.name === idOrName) {
        return device;
      }
    }
    return null;
  }

  listDevices(): DeviceConfig[] {
    return Array.from(this.devices.values());
  }

  updateDevice(idOrName: string, updates: Partial<DeviceConfig>): boolean {
    const device = this.getDevice(idOrName);
    if (!device) {
      return false;
    }

    Object.assign(device, updates);
    this.devices.set(device.id, device);
    this.saveConfig();
    return true;
  }

  removeDevice(idOrName: string): boolean {
    const device = this.getDevice(idOrName);
    if (!device) {
      return false;
    }

    this.devices.delete(device.id);
    this.saveConfig();
    return true;
  }

  // ============================================
  // Device Filtering
  // ============================================

  getDevicesByTags(tags: string[]): DeviceConfig[] {
    return this.listDevices().filter(device =>
      tags.some(tag => device.tags.includes(tag))
    );
  }

  getDevicesByGroup(groupName: string): DeviceConfig[] {
    const group = this.groups.get(groupName);
    if (!group) return [];

    return group.devices
      .map(id => this.devices.get(id))
      .filter((d): d is DeviceConfig => d !== undefined);
  }

  getDevicesByIds(ids: string[]): DeviceConfig[] {
    return ids
      .map(id => this.getDevice(id))
      .filter((d): d is DeviceConfig => d !== null);
  }

  getAllOnlineDevices(): DeviceConfig[] {
    return this.listDevices();
  }

  // ============================================
  // Group Management
  // ============================================

  addGroup(group: DeviceGroup): void {
    this.groups.set(group.name, group);
    this.saveConfig();
  }

  getGroup(name: string): DeviceGroup | null {
    return this.groups.get(name) || null;
  }

  listGroups(): DeviceGroup[] {
    return Array.from(this.groups.values());
  }

  removeGroup(name: string): boolean {
    if (!this.groups.has(name)) {
      return false;
    }
    this.groups.delete(name);
    this.saveConfig();
    return true;
  }

  // ============================================
  // SSH Connection Test
  // ============================================

  async testConnection(idOrName: string): Promise<{ ok: boolean; error?: string }> {
    const device = this.getDevice(idOrName);
    if (!device) {
      return { ok: false, error: 'Device not found' };
    }

    try {
      let sshCmd: string;

      if (device.authType === 'privateKey' && device.privateKeyPath) {
        const keyPath = device.privateKeyPath.replace('~', os.homedir());
        sshCmd = `ssh -i "${keyPath}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "echo OK"`;
      } else if (device.password) {
        // Check sshpass availability
        const sshpassCheck = await this.executor.execute('which sshpass 2>/dev/null');
        if (sshpassCheck.exitCode !== 0) {
          const hint = process.platform === 'darwin'
            ? 'Run: brew install hudochenkov/sshpass/sshpass'
            : 'Run: apt-get install sshpass';
          return { ok: false, error: `sshpass not installed (required for password auth). ${hint}` };
        }
        sshCmd = `sshpass -p "${device.password}" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "echo OK"`;
      } else {
        sshCmd = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "echo OK"`;
      }

      const result = await this.executor.execute(sshCmd);

      if (result.exitCode === 0 && result.output.trim() === 'OK') {
        return { ok: true };
      }

      const errMsg = result.error || result.output || `exit code ${result.exitCode}`;
      return { ok: false, error: errMsg.trim() };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { ok: false, error: msg };
    }
  }

  // ============================================
  // Master Configuration
  // ============================================

  getMasterPort(): number {
    return this.masterPort;
  }

  setMasterPort(port: number): void {
    this.masterPort = port;
    this.saveConfig();
  }

  getSecretKey(): string {
    if (!this.secretKey) {
      this.secretKey = this.generateSecretKey();
      this.saveConfig();
    }
    return this.secretKey;
  }

  setSecretKey(key: string): void {
    this.secretKey = key;
    this.saveConfig();
  }

  // ============================================
  // Import/Export
  // ============================================

  importFromJson(filePath: string): number {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      let count = 0;

      if (Array.isArray(data)) {
        for (const device of data) {
          this.addDevice(device);
          count++;
        }
      } else if (data.devices) {
        for (const device of data.devices) {
          this.addDevice(device);
          count++;
        }
      }

      return count;
    } catch (error) {
      return 0;
    }
  }

  exportToJson(filePath: string): boolean {
    try {
      const data = {
        masterPort: this.masterPort,
        devices: this.listDevices(),
        groups: this.listGroups()
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private generateId(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(DEVICES_FILE)) {
        const data = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));

        if (data.devices) {
          for (const device of data.devices) {
            this.devices.set(device.id, device);
          }
        }

        if (data.groups) {
          for (const group of data.groups) {
            this.groups.set(group.name, group);
          }
        }

        if (data.masterPort) {
          this.masterPort = data.masterPort;
        }

        if (data.secretKey) {
          this.secretKey = data.secretKey;
        }
      }
    } catch (error) {
      // Failed to load devices config, starting fresh
    }
  }

  private saveConfig(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      const data = {
        masterPort: this.masterPort,
        secretKey: this.secretKey,
        devices: Array.from(this.devices.values()),
        groups: Array.from(this.groups.values())
      };

      fs.writeFileSync(DEVICES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      // Failed to save devices config
    }
  }
}
