import { Hono } from 'hono';
import { SkillManager } from '../server-mgmt/skill-manager.js';
import { ConnectionManager } from '../server-mgmt/connection-manager.js';
import { DeviceManager } from '../server-mgmt/device-manager.js';

export const skillRoutes = new Hono();

const skillMgr = new SkillManager();
const connMgr = new ConnectionManager();
const deviceMgr = new DeviceManager();

// GET /skills - list installed skills
skillRoutes.get('/', (c) => {
  try {
    const skills = skillMgr.getInstalledSkills();
    return c.json({ skills });
  } catch {
    return c.json({ error: 'Failed to list skills' }, 500);
  }
});

// GET /skills/builtin - list builtin skills
skillRoutes.get('/builtin', (c) => {
  try {
    const skills = skillMgr.getBuiltinSkills();
    return c.json({ skills });
  } catch {
    return c.json({ error: 'Failed to list builtin skills' }, 500);
  }
});

// POST /skills/install - install a skill
skillRoutes.post('/install', async (c) => {
  try {
    const skill = await c.req.json();
    if (!skill.id || !skill.name) {
      return c.json({ error: 'id and name are required' }, 400);
    }
    const ok = await skillMgr.installSkill(skill);
    if (!ok) {
      return c.json({ error: 'Skill already installed or dependency failed' }, 409);
    }
    return c.json({ success: true }, 201);
  } catch {
    return c.json({ error: 'Failed to install skill' }, 500);
  }
});

// DELETE /skills/:id - uninstall a skill
skillRoutes.delete('/:id', (c) => {
  try {
    const { id } = c.req.param();
    const ok = skillMgr.uninstallSkill(id);
    if (!ok) return c.json({ error: 'Skill not found' }, 404);
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to uninstall skill' }, 500);
  }
});

// POST /skills/:id/execute - execute a skill command locally
skillRoutes.post('/:id/execute', async (c) => {
  try {
    const { id } = c.req.param();
    const { command, params } = await c.req.json();
    if (!command) return c.json({ error: 'command is required' }, 400);
    const result = await skillMgr.executeSkillCommand(id, command, params || {});
    return c.json(result);
  } catch {
    return c.json({ error: 'Failed to execute skill command' }, 500);
  }
});

// POST /skills/:id/deploy - deploy skill to devices
skillRoutes.post('/:id/deploy', async (c) => {
  try {
    const { id } = c.req.param();
    const { deviceIds, command, params } = await c.req.json();
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return c.json({ error: 'deviceIds array is required' }, 400);
    }

    const skills = skillMgr.getInstalledSkills();
    const skill = skills.find((s) => s.id === id);
    if (!skill) return c.json({ error: 'Skill not found' }, 404);

    // Determine which commands to run
    let cmds = skill.commands;
    if (command) {
      const found = skill.commands.find((cmd) => cmd.name === command);
      if (!found) return c.json({ error: `Command "${command}" not found` }, 404);
      cmds = [found];
    }

    const results: Record<string, { success: boolean; outputs: { command: string; stdout: string; stderr: string; exitCode: number }[] }> = {};

    for (const deviceId of deviceIds) {
      const device = deviceMgr.getDevice(deviceId);
      if (!device) {
        results[deviceId] = { success: false, outputs: [{ command: '', stdout: '', stderr: 'Device not found', exitCode: -1 }] };
        continue;
      }

      const executor = connMgr.getExecutor(device);
      const outputs: { command: string; stdout: string; stderr: string; exitCode: number }[] = [];
      let allOk = true;

      // Run dependencies first
      if (skill.dependencies) {
        for (const dep of skill.dependencies) {
          const r = await executor.execute(dep);
          outputs.push({ command: dep, stdout: r.output, stderr: r.error || '', exitCode: r.exitCode });
          if (r.exitCode !== 0) { allOk = false; break; }
        }
      }

      // Run commands
      if (allOk) {
        for (const cmd of cmds) {
          let action = cmd.action;
          if (params) {
            for (const [k, v] of Object.entries(params)) {
              action = action.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
            }
          }
          const r = await executor.execute(action);
          outputs.push({ command: action, stdout: r.output, stderr: r.error || '', exitCode: r.exitCode });
          if (r.exitCode !== 0) { allOk = false; break; }
        }
      }

      results[deviceId] = { success: allOk, outputs };
    }

    return c.json({ results });
  } catch {
    return c.json({ error: 'Failed to deploy skill' }, 500);
  }
});
