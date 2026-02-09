import { DeviceManager } from '../server-mgmt/device-manager.js';
import { CommandExecutor } from '../server-mgmt/executor.js';
import * as os from 'os';

const manager = new DeviceManager();
const executor = new CommandExecutor();

export function buildSshCmd(device: any, cmd: string): string {
  // Wrap in login shell so PATH includes npm/node etc.
  const wrapped = `bash -l -c ${shellQuote(cmd)}`;
  const escaped = wrapped.replace(/"/g, '\\"');
  const sshOpts = '-o ConnectTimeout=10 -o StrictHostKeyChecking=no';
  const target = `${device.username}@${device.host}`;
  if (device.authType === 'privateKey' && device.privateKeyPath) {
    const keyPath = device.privateKeyPath.replace('~', os.homedir());
    return `ssh -i "${keyPath}" ${sshOpts} -p ${device.port} ${target} "${escaped}"`;
  }
  if (device.password) {
    return `sshpass -p "${device.password}" ssh ${sshOpts} -p ${device.port} ${target} "${escaped}"`;
  }
  return `ssh ${sshOpts} -p ${device.port} ${target} "${escaped}"`;
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export interface DeployConfig {
  providers: Record<string, any>;
  channels: Record<string, any>;
  primaryModel: string;
  gatewayPort: number;
}

export function generateOpenClawConfig(cfg: DeployConfig): object {
  return {
    models: {
      mode: 'merge',
      providers: cfg.providers,
    },
    agents: {
      defaults: {
        model: { primary: cfg.primaryModel, fallbacks: [] },
        workspace: '/root/.openclaw/workspace',
        maxConcurrent: 4,
        subagents: { maxConcurrent: 8 },
      },
    },
    channels: cfg.channels,
    gateway: {
      port: cfg.gatewayPort,
      mode: 'local',
      bind: 'lan',
      auth: { mode: 'token', token: randomToken() },
    },
  };
}

function randomToken(): string {
  const chars = 'abcdef0123456789';
  let t = '';
  for (let i = 0; i < 48; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export interface DeployLog {
  step: string;
  status: 'running' | 'done' | 'error' | 'info' | 'warn' | 'output';
  message: string;
  detail?: string;
}

/** Run SSH command and return result, yielding verbose output */
async function* runSsh(
  device: any,
  cmd: string,
  step: string,
): AsyncGenerator<DeployLog, { ok: boolean; output: string; error: string }> {
  yield { step, status: 'output', message: `$ ${cmd}` };
  const r = await executor.execute(buildSshCmd(device, cmd));
  const out = (r.output || '').trim();
  const err = (r.error || '').trim();
  if (out) {
    // Yield output lines (limit to last 20 lines to avoid flooding)
    const lines = out.split('\n');
    const show = lines.length > 20 ? lines.slice(-20) : lines;
    if (lines.length > 20) {
      yield { step, status: 'output', message: `... (${lines.length - 20} lines omitted)` };
    }
    for (const line of show) {
      yield { step, status: 'output', message: line };
    }
  }
  if (err && r.exitCode !== 0) {
    const errLines = err.split('\n').slice(-10);
    for (const line of errLines) {
      yield { step, status: 'output', message: `stderr: ${line}` };
    }
  }
  return { ok: r.exitCode === 0, output: out, error: err };
}

/** Run a multi-line script on remote via base64 to avoid escaping issues */
async function* runSshScript(
  device: any,
  script: string,
  step: string,
  label?: string,
): AsyncGenerator<DeployLog, { ok: boolean; output: string; error: string }> {
  if (label) yield { step, status: 'output', message: `$ ${label}` };
  const b64 = Buffer.from(script).toString('base64');
  // Send script as base64, decode and execute on remote
  const cmd = `echo '${b64}' | base64 -d | bash`;
  const r = await executor.execute(buildSshCmd(device, cmd));
  const out = (r.output || '').trim();
  const err = (r.error || '').trim();
  if (out) {
    const lines = out.split('\n');
    const show = lines.length > 20 ? lines.slice(-20) : lines;
    if (lines.length > 20) {
      yield { step, status: 'output', message: `... (${lines.length - 20} lines omitted)` };
    }
    for (const line of show) {
      yield { step, status: 'output', message: line };
    }
  }
  if (err && r.exitCode !== 0) {
    const errLines = err.split('\n').slice(-10);
    for (const line of errLines) {
      yield { step, status: 'output', message: `stderr: ${line}` };
    }
  }
  return { ok: r.exitCode === 0, output: out, error: err };
}

/** Detect remote OS type and glibc version */
async function detectOS(device: any): Promise<{ distro: string; pm: string; glibcMajorMinor: number }> {
  const r = await executor.execute(
    buildSshCmd(device, 'cat /etc/os-release 2>/dev/null || echo "unknown"'),
  );
  const text = (r.output || '').toLowerCase();

  // Detect glibc version (e.g. "2.17" → 2.17, "2.31" → 2.31)
  const glibcR = await executor.execute(
    buildSshCmd(device, 'ldd --version 2>&1 | head -1'),
  );
  let glibcMajorMinor = 0;
  const glibcMatch = (glibcR.output || '').match(/(\d+\.\d+)\s*$/);
  if (glibcMatch) glibcMajorMinor = parseFloat(glibcMatch[1]);

  if (text.includes('ubuntu') || text.includes('debian')) {
    return { distro: 'debian', pm: 'apt-get', glibcMajorMinor };
  }
  if (text.includes('centos') || text.includes('rhel') || text.includes('rocky') || text.includes('alma')) {
    return { distro: 'rhel', pm: 'yum', glibcMajorMinor };
  }
  if (text.includes('alpine')) {
    return { distro: 'alpine', pm: 'apk', glibcMajorMinor };
  }
  if (text.includes('arch')) {
    return { distro: 'arch', pm: 'pacman', glibcMajorMinor };
  }
  return { distro: 'unknown', pm: 'apt-get', glibcMajorMinor };
}

export async function* deployOpenClaw(
  deviceId: string,
  config: DeployConfig,
): AsyncGenerator<DeployLog> {
  const device = manager.getDevice(deviceId);
  if (!device) {
    yield { step: 'init', status: 'error', message: 'Device not found' };
    return;
  }

  // ── Step 1: Test SSH ──
  yield { step: 'ssh', status: 'running', message: 'Testing SSH connection...' };

  // Check sshpass availability for password auth
  if (device.password && !device.privateKeyPath) {
    const sshpassCheck = await executor.execute('which sshpass 2>/dev/null');
    if (sshpassCheck.exitCode !== 0) {
      yield { step: 'ssh', status: 'warn', message: 'sshpass not found — required for password auth' };
      yield { step: 'ssh', status: 'info', message: 'Installing sshpass...' };
      const installR = await executor.execute(
        process.platform === 'darwin'
          ? 'brew install sshpass 2>/dev/null || brew install hudochenkov/sshpass/sshpass 2>&1'
          : 'apt-get install -y sshpass 2>/dev/null || yum install -y sshpass 2>&1',
      );
      if (installR.exitCode !== 0) {
        yield { step: 'ssh', status: 'error', message: 'sshpass is required for password-based SSH but could not be installed' };
        yield { step: 'ssh', status: 'info', message: process.platform === 'darwin'
          ? 'Run: brew install hudochenkov/sshpass/sshpass'
          : 'Run: apt-get install sshpass' };
        yield { step: 'ssh', status: 'info', message: 'Or switch to SSH key auth in the Servers page' };
        return;
      }
      yield { step: 'ssh', status: 'info', message: 'sshpass installed' };
    }
  }

  const sshGen = runSsh(device, 'echo "SSH OK" && whoami && uname -a', 'ssh');
  let sshResult = await sshGen.next();
  while (!sshResult.done) {
    yield sshResult.value;
    sshResult = await sshGen.next();
  }
  if (!sshResult.value.ok) {
    yield { step: 'ssh', status: 'error', message: `SSH connection failed: ${sshResult.value.error}` };
    if (sshResult.value.error.includes('Permission denied')) {
      yield { step: 'ssh', status: 'info', message: 'Password or key is incorrect. Check credentials in Servers page.' };
    } else if (sshResult.value.error.includes('Connection refused') || sshResult.value.error.includes('Connection timed out')) {
      yield { step: 'ssh', status: 'info', message: 'Server unreachable. Check host/port and firewall settings.' };
    } else {
      yield { step: 'ssh', status: 'info', message: 'Check: host reachable? port correct? credentials valid?' };
    }
    return;
  }
  yield { step: 'ssh', status: 'done', message: 'SSH connection OK' };

  // ── Step 2: Detect OS ──
  yield { step: 'env', status: 'running', message: 'Detecting server environment...' };
  const osInfo = await detectOS(device);
  yield { step: 'env', status: 'info', message: `OS: ${osInfo.distro}, package manager: ${osInfo.pm}, glibc: ${osInfo.glibcMajorMinor || 'unknown'}` };

  // Check disk space
  const diskGen = runSsh(device, 'df -h / | tail -1', 'env');
  let diskResult = await diskGen.next();
  while (!diskResult.done) {
    yield diskResult.value;
    diskResult = await diskGen.next();
  }
  yield { step: 'env', status: 'done', message: 'Environment detected' };

  // ── Step 3: Check & Install Node.js ──
  yield { step: 'node', status: 'running', message: 'Checking Node.js...' };
  const nodeGen = runSsh(device, 'node --version 2>&1', 'node');
  let nodeResult = await nodeGen.next();
  while (!nodeResult.done) {
    yield nodeResult.value;
    nodeResult = await nodeGen.next();
  }

  let useDocker = false;

  if (!nodeResult.value.ok || !nodeResult.value.output.startsWith('v')) {
    yield { step: 'node', status: 'warn', message: 'Node.js not found — installing...' };
    const installed = yield* installNode(device, osInfo);
    if (!installed) {
      yield { step: 'node', status: 'warn', message: 'All Node.js methods failed — switching to Docker mode' };
      const dockerOk = yield* installDocker(device, osInfo);
      if (!dockerOk) {
        yield { step: 'node', status: 'error', message: 'Neither Node.js nor Docker could be installed' };
        return;
      }
      useDocker = true;
    }
  } else {
    const ver = nodeResult.value.output.replace('v', '').split('.')[0];
    const major = parseInt(ver, 10);
    if (major < 18) {
      yield { step: 'node', status: 'warn', message: `Node.js v${ver} too old (need >= 18), upgrading...` };
      const installed = yield* installNode(device, osInfo);
      if (!installed) {
        yield { step: 'node', status: 'warn', message: 'Upgrade failed — switching to Docker mode' };
        const dockerOk = yield* installDocker(device, osInfo);
        if (!dockerOk) {
          yield { step: 'node', status: 'error', message: 'Neither Node.js nor Docker could be installed' };
          return;
        }
        useDocker = true;
      }
    } else {
      yield { step: 'node', status: 'done', message: `Node.js ${nodeResult.value.output} ready` };
    }
  }

  // ── Docker mode: skip native steps, deploy via container ──
  if (useDocker) {
    yield* deployViaDocker(device, config);
    return;
  }

  // Verify npm is available
  const npmGen = runSsh(device, 'npm --version 2>&1', 'node');
  let npmResult = await npmGen.next();
  while (!npmResult.done) {
    yield npmResult.value;
    npmResult = await npmGen.next();
  }
  if (!npmResult.value.ok) {
    yield { step: 'node', status: 'warn', message: 'npm not found, attempting fix...' };
    const fixGen = runSsh(device, `${osInfo.pm === 'apt-get' ? 'apt-get install -y npm' : 'npm install -g npm'}`, 'node');
    let fixResult = await fixGen.next();
    while (!fixResult.done) {
      yield fixResult.value;
      fixResult = await fixGen.next();
    }
    if (!fixResult.value.ok) {
      yield { step: 'node', status: 'error', message: 'Failed to install npm. Please install Node.js 22+ manually.' };
      return;
    }
  }
  yield { step: 'node', status: 'done', message: `npm ${npmResult.value.output || 'ready'}` };

  // ── Step 4: Install OpenClaw ──
  yield { step: 'install', status: 'running', message: 'Installing OpenClaw...' };

  // Check if already installed
  const checkGen = runSsh(device, 'openclaw --version 2>&1', 'install');
  let checkResult = await checkGen.next();
  while (!checkResult.done) {
    yield checkResult.value;
    checkResult = await checkGen.next();
  }

  if (checkResult.value.ok && checkResult.value.output) {
    yield { step: 'install', status: 'info', message: `OpenClaw already installed: ${checkResult.value.output}` };
    yield { step: 'install', status: 'running', message: 'Upgrading to latest version...' };
  }

  const installGen = runSsh(device, 'npm install -g openclaw@latest 2>&1', 'install');
  let installResult = await installGen.next();
  while (!installResult.done) {
    yield installResult.value;
    installResult = await installGen.next();
  }

  if (!installResult.value.ok) {
    yield { step: 'install', status: 'warn', message: 'npm install failed, trying with --unsafe-perm...' };
    const retryGen = runSsh(device, 'npm install -g openclaw@latest --unsafe-perm 2>&1', 'install');
    let retryResult = await retryGen.next();
    while (!retryResult.done) {
      yield retryResult.value;
      retryResult = await retryGen.next();
    }
    if (!retryResult.value.ok) {
      yield { step: 'install', status: 'error', message: 'OpenClaw installation failed' };
      yield { step: 'install', status: 'info', message: `Error: ${retryResult.value.error.slice(0, 200)}` };
      return;
    }
  }

  // Verify installation
  const verifyInstGen = runSsh(device, 'openclaw --version 2>&1', 'install');
  let verifyInstResult = await verifyInstGen.next();
  while (!verifyInstResult.done) {
    yield verifyInstResult.value;
    verifyInstResult = await verifyInstGen.next();
  }
  if (!verifyInstResult.value.ok) {
    yield { step: 'install', status: 'error', message: 'OpenClaw binary not found after install' };
    return;
  }
  yield { step: 'install', status: 'done', message: `OpenClaw ${verifyInstResult.value.output} installed` };

  // ── Step 5: Write config ──
  yield { step: 'config', status: 'running', message: 'Writing configuration...' };
  const ocConfig = generateOpenClawConfig(config);
  const json = JSON.stringify(ocConfig, null, 2);

  yield { step: 'config', status: 'info', message: 'Config preview:' };
  // Show first few lines of config
  const cfgLines = json.split('\n').slice(0, 12);
  for (const line of cfgLines) {
    yield { step: 'config', status: 'output', message: line };
  }
  if (json.split('\n').length > 12) {
    yield { step: 'config', status: 'output', message: '  ...' };
  }

  const mkdirGen = runSsh(device, 'mkdir -p ~/.openclaw/workspace', 'config');
  let mkdirResult = await mkdirGen.next();
  while (!mkdirResult.done) {
    yield mkdirResult.value;
    mkdirResult = await mkdirGen.next();
  }

  // Write config via base64 to avoid shell escaping issues
  const b64 = Buffer.from(JSON.stringify(ocConfig, null, 2)).toString('base64');
  const writeCmd = `echo '${b64}' | base64 -d > ~/.openclaw/openclaw.json`;
  const writeGen = runSsh(device, writeCmd, 'config');
  let writeResult = await writeGen.next();
  while (!writeResult.done) {
    yield writeResult.value;
    writeResult = await writeGen.next();
  }
  if (!writeResult.value.ok) {
    yield { step: 'config', status: 'error', message: `Config write failed: ${writeResult.value.error}` };
    return;
  }

  // Verify config was written correctly
  const catGen = runSsh(device, 'cat ~/.openclaw/openclaw.json | head -3', 'config');
  let catResult = await catGen.next();
  while (!catResult.done) {
    yield catResult.value;
    catResult = await catGen.next();
  }
  if (!catResult.value.ok || !catResult.value.output.includes('{')) {
    yield { step: 'config', status: 'error', message: 'Config verification failed — file not written correctly' };
    return;
  }
  yield { step: 'config', status: 'done', message: 'Configuration written to ~/.openclaw/openclaw.json' };

  // ── Step 6: Create systemd service ──
  yield { step: 'service', status: 'running', message: 'Creating systemd service...' };

  // Check if systemd is available
  const sysdGen = runSsh(device, 'systemctl --version 2>&1 | head -1', 'service');
  let sysdResult = await sysdGen.next();
  while (!sysdResult.done) {
    yield sysdResult.value;
    sysdResult = await sysdGen.next();
  }

  const hasSystemd = sysdResult.value.ok && sysdResult.value.output.includes('systemd');

  if (hasSystemd) {
    yield* setupSystemdService(device);
  } else {
    yield { step: 'service', status: 'warn', message: 'systemd not available, using nohup fallback' };
    yield* setupNohupService(device);
  }

  // ── Step 7: Start gateway ──
  yield { step: 'start', status: 'running', message: 'Starting OpenClaw gateway...' };

  if (hasSystemd) {
    const startGen = runSsh(device, 'systemctl restart openclaw 2>&1', 'start');
    let startResult = await startGen.next();
    while (!startResult.done) {
      yield startResult.value;
      startResult = await startGen.next();
    }
    if (!startResult.value.ok) {
      yield { step: 'start', status: 'warn', message: 'systemctl start failed, checking logs...' };
      const logGen = runSsh(device, 'journalctl -u openclaw --no-pager -n 20 2>&1', 'start');
      let logResult = await logGen.next();
      while (!logResult.done) {
        yield logResult.value;
        logResult = await logGen.next();
      }
      yield { step: 'start', status: 'error', message: 'Gateway failed to start. See logs above.' };
      return;
    }
  } else {
    const startGen = runSsh(
      device,
      'nohup openclaw gateway run > /var/log/openclaw.log 2>&1 & echo $!',
      'start',
    );
    let startResult = await startGen.next();
    while (!startResult.done) {
      yield startResult.value;
      startResult = await startGen.next();
    }
    if (!startResult.value.ok) {
      yield { step: 'start', status: 'error', message: 'Failed to start gateway process' };
      return;
    }
  }

  // Wait a moment for the service to start
  await new Promise((r) => setTimeout(r, 3000));
  yield { step: 'start', status: 'info', message: 'Waiting for gateway to initialize...' };

  // ── Step 8: Verify deployment ──
  yield { step: 'verify', status: 'running', message: 'Verifying deployment...' };

  // Check process is running
  const psGen = runSsh(device, 'pgrep -f "openclaw" && echo RUNNING || echo STOPPED', 'verify');
  let psResult = await psGen.next();
  while (!psResult.done) {
    yield psResult.value;
    psResult = await psGen.next();
  }

  if (!psResult.value.output.includes('RUNNING')) {
    yield { step: 'verify', status: 'warn', message: 'Process not detected, checking service status...' };
    if (hasSystemd) {
      const statusGen = runSsh(device, 'systemctl status openclaw 2>&1', 'verify');
      let statusResult = await statusGen.next();
      while (!statusResult.done) {
        yield statusResult.value;
        statusResult = await statusGen.next();
      }
    }
    yield { step: 'verify', status: 'error', message: 'OpenClaw gateway is not running after start' };
    return;
  }

  // Check gateway port is listening
  const port = config.gatewayPort || 18789;
  const portGen = runSsh(device, `ss -tlnp | grep :${port} || netstat -tlnp 2>/dev/null | grep :${port}`, 'verify');
  let portResult = await portGen.next();
  while (!portResult.done) {
    yield portResult.value;
    portResult = await portGen.next();
  }

  if (portResult.value.output.includes(`:${port}`)) {
    yield { step: 'verify', status: 'info', message: `Gateway listening on port ${port}` };
  } else {
    yield { step: 'verify', status: 'warn', message: `Port ${port} not yet listening (gateway may still be starting)` };
  }

  yield { step: 'verify', status: 'done', message: `Deployment complete — access at http://${device.host}:${port}` };
}

/** Pick Node.js versions to try based on glibc */
function nodeVersionsForGlibc(glibc: number): number[] {
  // Node 22+ needs glibc >= 2.28; Node 18 unofficial builds work on 2.17
  // For old glibc, try 18 first (has unofficial builds), then 20
  if (glibc > 0 && glibc < 2.28) return [18, 20];
  return [22, 20, 18];
}

/** Install Node.js with OS-specific method and smart fallbacks */
async function* installNode(
  device: any,
  osInfo: { distro: string; pm: string; glibcMajorMinor: number },
): AsyncGenerator<DeployLog, boolean> {
  const step = 'node';
  const versions = nodeVersionsForGlibc(osInfo.glibcMajorMinor);

  if (osInfo.glibcMajorMinor > 0 && osInfo.glibcMajorMinor < 2.28) {
    yield { step, status: 'warn', message: `glibc ${osInfo.glibcMajorMinor} detected (old) — will try Node.js ${versions.join(', ')}` };
  }

  // ── Method 1: Package manager (NodeSource / apk) ──
  for (const ver of versions) {
    const installed = yield* tryPackageManager(device, osInfo, ver);
    if (installed) return true;
  }

  // ── Method 2: nvm fallback — try each version ──
  yield { step, status: 'info', message: 'Trying nvm (universal fallback)...' };

  // Install nvm first (separate command for reliability)
  const nvmInstGen = runSsh(
    device,
    'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash 2>&1',
    step,
  );
  let nvmR = await nvmInstGen.next();
  while (!nvmR.done) { yield nvmR.value; nvmR = await nvmInstGen.next(); }

  // Try each version via nvm (use runSshScript to avoid escaping issues)
  for (const ver of versions) {
    yield { step, status: 'info', message: `nvm: trying Node.js ${ver}...` };
    const nvmScript = `#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install ${ver} 2>&1
node --version`;
    const installGen = runSshScript(device, nvmScript, step, `nvm install ${ver}`);
    let r = await installGen.next();
    while (!r.done) { yield r.value; r = await installGen.next(); }

    if (r.value.ok && r.value.output.includes('v')) {
      yield { step, status: 'info', message: 'Creating symlinks for node/npm...' };
      const linkScript = `#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use ${ver} 2>&1
ln -sf "$(which node)" /usr/local/bin/node
ln -sf "$(which npm)" /usr/local/bin/npm
ln -sf "$(which npx)" /usr/local/bin/npx 2>&1`;
      const linkGen = runSshScript(device, linkScript, step, 'symlink node/npm');
      let lr = await linkGen.next();
      while (!lr.done) { yield lr.value; lr = await linkGen.next(); }
      yield { step, status: 'done', message: `Node.js ${ver} installed via nvm` };
      return true;
    }
    yield { step, status: 'warn', message: `nvm: Node.js ${ver} failed on this system` };
  }

  // ── Method 3: Download prebuilt binary directly ──
  yield { step, status: 'info', message: 'Trying direct binary download...' };
  for (const ver of versions) {
    const installed = yield* tryDirectBinary(device, ver);
    if (installed) return true;
  }

  yield { step, status: 'error', message: 'All Node.js installation methods failed' };
  yield { step, status: 'info', message: 'Please install Node.js 18+ manually and retry' };
  return false;
}

/** Try installing Node via package manager */
async function* tryPackageManager(
  device: any,
  osInfo: { distro: string; pm: string; glibcMajorMinor: number },
  ver: number,
): AsyncGenerator<DeployLog, boolean> {
  const step = 'node';

  if (osInfo.distro === 'debian') {
    yield { step, status: 'info', message: `NodeSource: trying Node.js ${ver} for Debian/Ubuntu...` };
    const gen = runSsh(
      device,
      `curl -fsSL https://deb.nodesource.com/setup_${ver}.x | bash - && apt-get install -y nodejs 2>&1`,
      step,
    );
    let r = await gen.next();
    while (!r.done) { yield r.value; r = await gen.next(); }
    if (r.value.ok) {
      yield { step, status: 'done', message: `Node.js ${ver} installed via NodeSource` };
      return true;
    }
    yield { step, status: 'warn', message: `NodeSource Node.js ${ver} failed` };
  }

  if (osInfo.distro === 'rhel') {
    yield { step, status: 'info', message: `NodeSource: trying Node.js ${ver} for RHEL/CentOS...` };
    const gen = runSsh(
      device,
      `curl -fsSL https://rpm.nodesource.com/setup_${ver}.x | bash - && yum install -y nodejs 2>&1`,
      step,
    );
    let r = await gen.next();
    while (!r.done) { yield r.value; r = await gen.next(); }
    if (r.value.ok) {
      yield { step, status: 'done', message: `Node.js ${ver} installed via NodeSource` };
      return true;
    }
    yield { step, status: 'warn', message: `NodeSource Node.js ${ver} failed` };
  }

  if (osInfo.distro === 'alpine') {
    yield { step, status: 'info', message: 'Installing Node.js via apk...' };
    const gen = runSsh(device, 'apk add --no-cache nodejs npm 2>&1', step);
    let r = await gen.next();
    while (!r.done) { yield r.value; r = await gen.next(); }
    if (r.value.ok) {
      yield { step, status: 'done', message: 'Node.js installed via apk' };
      return true;
    }
    yield { step, status: 'warn', message: 'apk install failed' };
  }

  return false;
}

/** Try downloading Node.js binary directly */
async function* tryDirectBinary(
  device: any,
  ver: number,
): AsyncGenerator<DeployLog, boolean> {
  const step = 'node';
  yield { step, status: 'info', message: `Direct download: trying Node.js ${ver}...` };

  // Detect arch
  const archGen = runSsh(device, 'uname -m', step);
  let archR = await archGen.next();
  while (!archR.done) { yield archR.value; archR = await archGen.next(); }
  const uarch = archR.value.output.trim();
  const arch = uarch === 'aarch64' ? 'arm64' : 'x64';

  // For old glibc, try unofficial builds (https://unofficial-builds.nodejs.org)
  const urls = [
    `https://unofficial-builds.nodejs.org/download/release/latest-v${ver}.x/node-v${ver}.0.0-linux-${arch}-glibc-217.tar.gz`,
    `https://nodejs.org/dist/latest-v${ver}.x/node-v${ver}.0.0-linux-${arch}.tar.gz`,
  ];

  // Use a simpler approach: let the server figure out the latest version
  const dlCmd = `cd /tmp && curl -fsSL "https://unofficial-builds.nodejs.org/download/release/latest-v${ver}.x/" 2>&1 | grep -oP 'node-v[0-9.]+' | head -1`;
  const dlGen = runSsh(device, dlCmd, step);
  let dlR = await dlGen.next();
  while (!dlR.done) { yield dlR.value; dlR = await dlGen.next(); }

  // Try unofficial glibc-217 build via script
  const unofficialScript = `#!/bin/bash
set -e
cd /tmp
VER=$(curl -fsSL "https://unofficial-builds.nodejs.org/download/release/latest-v${ver}.x/" 2>/dev/null | grep -oP 'v${ver}\\.[0-9]+\\.[0-9]+' | sort -V | tail -1)
echo "Downloading Node.js $VER (unofficial glibc-217 build)..."
curl -fsSL "https://unofficial-builds.nodejs.org/download/release/$VER/node-$VER-linux-${arch}-glibc-217.tar.gz" -o node.tar.gz
tar xzf node.tar.gz
cp -f node-$VER-linux-${arch}-glibc-217/bin/node /usr/local/bin/node
cp -rf node-$VER-linux-${arch}-glibc-217/lib/node_modules /usr/local/lib/
ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
rm -rf node.tar.gz node-$VER-linux-${arch}-glibc-217
node --version`;

  const instGen = runSshScript(device, unofficialScript, step, `download node ${ver} (unofficial glibc-217)`);
  let instR = await instGen.next();
  while (!instR.done) { yield instR.value; instR = await instGen.next(); }

  if (instR.value.ok && instR.value.output.includes('v')) {
    yield { step, status: 'done', message: `Node.js ${ver} installed via unofficial build` };
    return true;
  }

  // Try official build as last resort
  yield { step, status: 'warn', message: `Unofficial build failed, trying official Node.js ${ver}...` };
  const officialScript = `#!/bin/bash
set -e
cd /tmp
VER=$(curl -fsSL "https://nodejs.org/dist/latest-v${ver}.x/" 2>/dev/null | grep -oP 'v${ver}\\.[0-9]+\\.[0-9]+' | sort -V | tail -1)
echo "Downloading Node.js $VER (official)..."
curl -fsSL "https://nodejs.org/dist/$VER/node-$VER-linux-${arch}.tar.gz" -o node.tar.gz
tar xzf node.tar.gz
cp -f node-$VER-linux-${arch}/bin/node /usr/local/bin/node
cp -rf node-$VER-linux-${arch}/lib/node_modules /usr/local/lib/
ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
rm -rf node.tar.gz node-$VER-linux-${arch}
node --version`;

  const offGen = runSshScript(device, officialScript, step, `download node ${ver} (official)`);
  let offR = await offGen.next();
  while (!offR.done) { yield offR.value; offR = await offGen.next(); }

  if (offR.value.ok && offR.value.output.includes('v')) {
    yield { step, status: 'done', message: `Node.js ${ver} installed via official binary` };
    return true;
  }

  return false;
}

/** Install Docker on remote server */
async function* installDocker(
  device: any,
  osInfo: { distro: string; pm: string; glibcMajorMinor: number },
): AsyncGenerator<DeployLog, boolean> {
  const step = 'node';

  // Check if Docker is already installed
  const checkGen = runSsh(device, 'docker --version 2>&1', step);
  let checkR = await checkGen.next();
  while (!checkR.done) { yield checkR.value; checkR = await checkGen.next(); }

  if (checkR.value.ok && checkR.value.output.includes('Docker')) {
    yield { step, status: 'info', message: `Docker already installed: ${checkR.value.output.trim()}` };
    return true;
  }

  yield { step, status: 'info', message: 'Installing Docker...' };

  // Try get.docker.com script (works on most distros including CentOS 7)
  const dockerScript = `#!/bin/bash
set -e
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh 2>&1
rm -f /tmp/get-docker.sh
systemctl start docker 2>/dev/null || service docker start 2>/dev/null || dockerd &
docker --version`;

  const instGen = runSshScript(device, dockerScript, step, 'install docker via get.docker.com');
  let instR = await instGen.next();
  while (!instR.done) { yield instR.value; instR = await instGen.next(); }

  if (instR.value.ok && instR.value.output.includes('Docker')) {
    yield { step, status: 'done', message: 'Docker installed successfully' };
    return true;
  }

  // Fallback: try distro-specific install
  if (osInfo.distro === 'rhel') {
    yield { step, status: 'warn', message: 'get.docker.com failed, trying yum...' };
    const yumGen = runSsh(device,
      'yum install -y yum-utils && yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && yum install -y docker-ce docker-ce-cli containerd.io && systemctl start docker 2>&1',
      step);
    let yumR = await yumGen.next();
    while (!yumR.done) { yield yumR.value; yumR = await yumGen.next(); }
    if (yumR.value.ok) {
      yield { step, status: 'done', message: 'Docker installed via yum' };
      return true;
    }
  }

  yield { step, status: 'error', message: 'Failed to install Docker' };
  return false;
}

/** Deploy OpenClaw via Docker container (fallback for old glibc) */
async function* deployViaDocker(
  device: any,
  config: DeployConfig,
): AsyncGenerator<DeployLog> {
  // ── Write config first ──
  yield { step: 'config', status: 'running', message: 'Writing configuration...' };
  const ocConfig = generateOpenClawConfig(config);
  const json = JSON.stringify(ocConfig, null, 2);

  const cfgLines = json.split('\n').slice(0, 8);
  for (const line of cfgLines) {
    yield { step: 'config', status: 'output', message: line };
  }
  if (json.split('\n').length > 8) {
    yield { step: 'config', status: 'output', message: '  ...' };
  }

  const mkGen = runSsh(device, 'mkdir -p ~/.openclaw/workspace', 'config');
  let mkR = await mkGen.next();
  while (!mkR.done) { yield mkR.value; mkR = await mkGen.next(); }

  const b64 = Buffer.from(json).toString('base64');
  const writeGen = runSsh(device, `echo '${b64}' | base64 -d > ~/.openclaw/openclaw.json`, 'config');
  let writeR = await writeGen.next();
  while (!writeR.done) { yield writeR.value; writeR = await writeGen.next(); }
  if (!writeR.value.ok) {
    yield { step: 'config', status: 'error', message: `Config write failed: ${writeR.value.error}` };
    return;
  }
  yield { step: 'config', status: 'done', message: 'Configuration written' };

  // ── Stop existing container if any ──
  yield { step: 'service', status: 'running', message: 'Setting up Docker container...' };
  const stopGen = runSsh(device, 'docker rm -f openclaw 2>/dev/null; echo ok', 'service');
  let stopR = await stopGen.next();
  while (!stopR.done) { yield stopR.value; stopR = await stopGen.next(); }

  yield { step: 'service', status: 'done', message: 'Docker container configured' };

  // ── Start container ──
  const port = config.gatewayPort || 18789;
  yield { step: 'start', status: 'running', message: 'Starting OpenClaw in Docker...' };

  const runScript = `#!/bin/bash
set -e
docker pull node:20-slim 2>&1 | tail -3
docker run -d \\
  --name openclaw \\
  --restart=unless-stopped \\
  -v /root/.openclaw:/root/.openclaw \\
  -p ${port}:${port} \\
  -e HOME=/root \\
  node:20-slim \\
  sh -c "npm install -g openclaw@latest 2>&1 && openclaw gateway run"
echo "Container started"
docker ps --filter name=openclaw --format "{{.ID}} {{.Status}}"`;

  const runGen = runSshScript(device, runScript, 'start', 'docker run openclaw');
  let runR = await runGen.next();
  while (!runR.done) { yield runR.value; runR = await runGen.next(); }

  if (!runR.value.ok) {
    yield { step: 'start', status: 'error', message: 'Failed to start Docker container' };
    yield { step: 'start', status: 'info', message: `Error: ${runR.value.error.slice(0, 200)}` };
    return;
  }

  yield { step: 'start', status: 'info', message: 'Container starting, waiting for openclaw to install inside container...' };
  await new Promise((r) => setTimeout(r, 15000));

  // ── Verify ──
  yield { step: 'verify', status: 'running', message: 'Verifying Docker deployment...' };

  const psGen = runSsh(device, 'docker ps --filter name=openclaw --format "{{.Status}}"', 'verify');
  let psR = await psGen.next();
  while (!psR.done) { yield psR.value; psR = await psGen.next(); }

  if (!psR.value.ok || !psR.value.output) {
    yield { step: 'verify', status: 'warn', message: 'Container may not be running, checking logs...' };
    const logGen = runSsh(device, 'docker logs openclaw --tail 20 2>&1', 'verify');
    let logR = await logGen.next();
    while (!logR.done) { yield logR.value; logR = await logGen.next(); }
  }

  // Check port
  const portGen = runSsh(device, `ss -tlnp | grep :${port} || netstat -tlnp 2>/dev/null | grep :${port} || echo "port not ready"`, 'verify');
  let portR = await portGen.next();
  while (!portR.done) { yield portR.value; portR = await portGen.next(); }

  if (portR.value.output.includes(`:${port}`)) {
    yield { step: 'verify', status: 'info', message: `Gateway listening on port ${port}` };
  } else {
    yield { step: 'verify', status: 'warn', message: `Port ${port} not yet listening (container may still be installing openclaw — check again in a minute)` };
  }

  yield { step: 'verify', status: 'done', message: `Deployment complete (Docker) — access at http://${device.host}:${port}` };
}

/** Setup systemd service unit */
async function* setupSystemdService(device: any): AsyncGenerator<DeployLog> {
  const step = 'service';
  const unit = `[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=root
Environment=HOME=/root
ExecStart=/usr/bin/env bash -l -c "openclaw gateway run"
Restart=on-failure
RestartSec=5
WorkingDirectory=/root

[Install]
WantedBy=multi-user.target`;

  // Write via base64 to avoid escaping issues
  const b64 = Buffer.from(unit).toString('base64');
  const writeCmd = `echo '${b64}' | base64 -d > /etc/systemd/system/openclaw.service`;
  const writeGen = runSsh(device, writeCmd, step);
  let writeResult = await writeGen.next();
  while (!writeResult.done) {
    yield writeResult.value;
    writeResult = await writeGen.next();
  }
  if (!writeResult.value.ok) {
    yield { step, status: 'error', message: `Failed to write service file: ${writeResult.value.error}` };
    return;
  }

  const reloadGen = runSsh(device, 'systemctl daemon-reload && systemctl enable openclaw 2>&1', step);
  let reloadResult = await reloadGen.next();
  while (!reloadResult.done) {
    yield reloadResult.value;
    reloadResult = await reloadGen.next();
  }
  yield { step, status: 'done', message: 'Systemd service created and enabled' };
}

/** Fallback: setup nohup-based service for non-systemd systems */
async function* setupNohupService(device: any): AsyncGenerator<DeployLog> {
  const step = 'service';
  // Create a simple start script
  const script = `#!/bin/bash
cd /root
export HOME=/root
source ~/.bashrc 2>/dev/null || true
source ~/.nvm/nvm.sh 2>/dev/null || true
exec openclaw gateway run
`;
  const b64 = Buffer.from(script).toString('base64');
  const writeGen = runSsh(
    device,
    `echo '${b64}' | base64 -d > /usr/local/bin/openclaw-start.sh && chmod +x /usr/local/bin/openclaw-start.sh`,
    step,
  );
  let writeResult = await writeGen.next();
  while (!writeResult.done) {
    yield writeResult.value;
    writeResult = await writeGen.next();
  }
  yield { step, status: 'done', message: 'Start script created at /usr/local/bin/openclaw-start.sh' };
}
