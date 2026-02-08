import { Hono } from 'hono';
import { DeviceManager } from '../server-mgmt/device-manager.js';
import { CommandExecutor } from '../server-mgmt/executor.js';
import * as os from 'os';

export const deviceRoutes = new Hono();

const manager = new DeviceManager();
const executor = new CommandExecutor();

// Map backend DeviceConfig to frontend Device shape
function toFrontendDevice(d: any) {
  return {
    id: d.id,
    label: d.name || d.label || d.id,
    host: d.host,
    port: d.port || 22,
    username: d.username,
    group: d.group,
    authType: d.authType === 'privateKey' ? 'key' : d.authType || 'password',
    connected: d.connected || false,
  };
}

// GET /devices - list all devices
deviceRoutes.get('/', (c) => {
  try {
    const devices = manager.listDevices().map(toFrontendDevice);
    return c.json({ devices });
  } catch {
    return c.json({ error: 'Failed to read devices' }, 500);
  }
});

// POST /devices - add device
deviceRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { host, username } = body;

    if (!host || !username) {
      return c.json({ error: 'host and username are required' }, 400);
    }

    // Map frontend field names to backend
    const deviceData = {
      ...body,
      name: body.label || body.name || body.host,
      authType: body.authType === 'key' ? 'privateKey' : body.authType || 'password',
      privateKeyPath: body.keyPath || body.privateKeyPath,
    };

    const device = await manager.addDevice(deviceData);
    return c.json({ device: toFrontendDevice(device) }, 201);
  } catch {
    return c.json({ error: 'Failed to add device' }, 500);
  }
});

// DELETE /devices/:id - remove device
deviceRoutes.delete('/:id', (c) => {
  try {
    const { id } = c.req.param();
    const removed = manager.removeDevice(id);
    if (!removed) {
      return c.json({ error: 'Device not found' }, 404);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete device' }, 500);
  }
});

// POST /devices/:id/test - test connection
deviceRoutes.post('/:id/test', async (c) => {
  try {
    const { id } = c.req.param();
    const device = manager.getDevice(id);
    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }
    const result = await manager.testConnection(id);
    return c.json({ success: result.ok, error: result.error });
  } catch {
    return c.json({ error: 'Failed to test connection' }, 500);
  }
});

// POST /devices/:id/connect - connect to device (test + mark connected)
deviceRoutes.post('/:id/connect', async (c) => {
  try {
    const { id } = c.req.param();
    const device = manager.getDevice(id);
    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }
    const result = await manager.testConnection(id);
    if (result.ok) {
      manager.updateDevice(id, { ...device, connected: true } as any);
    }
    return c.json({ success: result.ok, connected: result.ok, error: result.error });
  } catch {
    return c.json({ error: 'Failed to connect' }, 500);
  }
});

// GET /devices/groups - list groups
deviceRoutes.get('/groups', (c) => {
  try {
    const groups = manager.listGroups();
    return c.json({ groups });
  } catch {
    return c.json({ error: 'Failed to read groups' }, 500);
  }
});

// POST /devices/execute - execute command on a device via SSH
deviceRoutes.post('/execute', async (c) => {
  try {
    const { deviceId, command } = await c.req.json();
    if (!deviceId || !command) {
      return c.json({ error: 'deviceId and command are required' }, 400);
    }

    const device = manager.getDevice(deviceId);
    if (!device) {
      return c.json({ error: 'Device not found' }, 404);
    }

    // Build SSH command based on device config
    let sshCmd: string;
    const escapedCmd = command.replace(/"/g, '\\"');

    if (device.authType === 'privateKey' && device.privateKeyPath) {
      const keyPath = device.privateKeyPath.replace('~', os.homedir());
      sshCmd = `ssh -i "${keyPath}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "${escapedCmd}"`;
    } else if (device.password) {
      sshCmd = `sshpass -p "${device.password}" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "${escapedCmd}"`;
    } else {
      sshCmd = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p ${device.port} ${device.username}@${device.host} "${escapedCmd}"`;
    }

    const result = await executor.execute(sshCmd);
    return c.json({
      stdout: result.output,
      stderr: result.error || '',
      exitCode: result.exitCode,
    });
  } catch {
    return c.json({ error: 'Failed to execute command' }, 500);
  }
});

// POST /devices/groups - create group
deviceRoutes.post('/groups', async (c) => {
  try {
    const { name, description, deviceIds } = await c.req.json();
    if (!name) return c.json({ error: 'name is required' }, 400);
    manager.addGroup({ name, description, devices: deviceIds || [] });
    return c.json({ success: true }, 201);
  } catch {
    return c.json({ error: 'Failed to create group' }, 500);
  }
});

// PUT /devices/groups/:name - update group
deviceRoutes.put('/groups/:name', async (c) => {
  try {
    const { name } = c.req.param();
    const existing = manager.getGroup(name);
    if (!existing) return c.json({ error: 'Group not found' }, 404);
    const body = await c.req.json();
    manager.addGroup({
      name,
      description: body.description ?? existing.description,
      devices: body.deviceIds ?? existing.devices,
    });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update group' }, 500);
  }
});

// DELETE /devices/groups/:name - delete group
deviceRoutes.delete('/groups/:name', (c) => {
  try {
    const { name } = c.req.param();
    const removed = manager.removeGroup(name);
    if (!removed) return c.json({ error: 'Group not found' }, 404);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete group' }, 500);
  }
});
