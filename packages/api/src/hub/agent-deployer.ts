import { CommandExecutor } from '../server-mgmt/executor.js';
import { DeviceManager, type DeviceConfig } from '../server-mgmt/device-manager.js';
import * as os from 'os';

export interface DeployProgress {
  deviceId: string;
  deviceName: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
  step?: string;
  message?: string;
}

export class AgentDeployer {
  private executor: CommandExecutor;
  private deviceManager: DeviceManager;

  constructor(deviceManager: DeviceManager) {
    this.executor = new CommandExecutor();
    this.deviceManager = deviceManager;
  }

  async deploy(deviceId: string): Promise<DeployProgress> {
    const device = this.deviceManager.getDevice(deviceId);
    if (!device) {
      return { deviceId, deviceName: deviceId, status: 'failed', message: 'Device not found' };
    }

    const progress: DeployProgress = {
      deviceId: device.id,
      deviceName: device.name,
      status: 'deploying',
    };

    try {
      // Step 1: Test SSH
      progress.step = 'Testing SSH connection';
      const testResult = await this.deviceManager.testConnection(device.id);
      if (!testResult.ok) {
        return { ...progress, status: 'failed', message: testResult.error || 'SSH connection failed' };
      }

      // Step 2: Check Node.js
      progress.step = 'Checking Node.js';
      const hasNode = await this.checkNodeJs(device);
      if (!hasNode) {
        progress.step = 'Installing Node.js';
        await this.installNodeJs(device);
      }

      // Step 3: Install OpenAsst CLI
      progress.step = 'Installing OpenAsst CLI';
      await this.installOpenAsstCLI(device);

      // Step 4: Configure agent
      progress.step = 'Configuring agent';
      await this.configureAgent(device);

      // Step 5: Push API config
      progress.step = 'Pushing API config';
      await this.pushAPIConfig(device);

      // Step 6: Create systemd service
      progress.step = 'Creating systemd service';
      await this.createSystemdService(device);

      // Step 7: Start
      progress.step = 'Starting agent';
      await this.sshExec(device, 'systemctl daemon-reload');
      await this.sshExec(device, 'systemctl enable openasst-agent');
      await this.sshExec(device, 'systemctl start openasst-agent');

      return { ...progress, status: 'success', message: 'Agent deployed' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...progress, status: 'failed', message: msg };
    }
  }

  async deployMultiple(deviceIds: string[]): Promise<DeployProgress[]> {
    const results = await Promise.allSettled(
      deviceIds.map((id) => this.deploy(id)),
    );
    return results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { deviceId: '', deviceName: '', status: 'failed' as const, message: String(r.reason) },
    );
  }

  private async checkNodeJs(device: DeviceConfig): Promise<boolean> {
    const result = await this.sshExec(device, 'node --version');
    return result.exitCode === 0;
  }

  private async installNodeJs(device: DeviceConfig): Promise<void> {
    const cmds = [
      'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
      'apt-get install -y nodejs || yum install -y nodejs',
    ];
    for (const cmd of cmds) {
      await this.sshExec(device, cmd);
    }
  }

  private async installOpenAsstCLI(device: DeviceConfig): Promise<void> {
    await this.sshExec(device, 'npm install -g openasst || true');
  }

  private async configureAgent(device: DeviceConfig): Promise<void> {
    const masterHost = this.getLocalIP();
    const config = {
      masterHost,
      masterPort: this.deviceManager.getMasterPort(),
      secretKey: this.deviceManager.getSecretKey(),
      agentName: device.name,
    };
    const json = JSON.stringify(config);
    await this.sshExec(device, 'mkdir -p /etc/openasst');
    await this.sshExec(device, `echo '${json}' > /etc/openasst/agent.json`);
  }

  private async pushAPIConfig(device: DeviceConfig): Promise<void> {
    // Read local API config and push to remote
    const { APIProvider } = await import('../server-mgmt/api-provider.js');
    const provider = new APIProvider();
    const endpoint = provider.getAPIEndpoint();
    if (!endpoint) return;

    const configJson = JSON.stringify(endpoint, null, 2);
    const escaped = configJson.replace(/'/g, "'\\''");
    await this.sshExec(device, 'mkdir -p ~/.openasst-cli');
    await this.sshExec(device, `echo '${escaped}' > ~/.openasst-cli/config.json`);
  }

  private async createSystemdService(device: DeviceConfig): Promise<void> {
    const service = [
      '[Unit]',
      'Description=OpenAsst Agent',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'ExecStart=/usr/bin/npx openasst agent serve',
      'Restart=always',
      'RestartSec=5',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
    ].join('\\n');

    await this.sshExec(
      device,
      `printf '${service}' > /etc/systemd/system/openasst-agent.service`,
    );
  }

  private async sshExec(device: DeviceConfig, command: string): Promise<{ output: string; error?: string; exitCode: number }> {
    const home = os.homedir();
    let sshCmd: string;
    const escaped = command.replace(/"/g, '\\"');

    if (device.authType === 'privateKey' && device.privateKeyPath) {
      const keyPath = device.privateKeyPath.replace('~', home);
      sshCmd = `ssh -i "${keyPath}" -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "${escaped}"`;
    } else if (device.password) {
      sshCmd = `sshpass -p "${device.password}" ssh -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "${escaped}"`;
    } else {
      sshCmd = `ssh -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "${escaped}"`;
    }

    return this.executor.execute(sshCmd);
  }

  private getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }
}
