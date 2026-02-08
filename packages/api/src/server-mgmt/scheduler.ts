import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CommandExecutor } from './executor';

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  command: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
}

export class Scheduler {
  private configPath: string;
  private executor: CommandExecutor;

  constructor() {
    const configDir = path.join(os.homedir(), '.openasst');
    this.configPath = path.join(configDir, 'schedules.json');
    this.executor = new CommandExecutor();
    this.ensureConfig();
  }

  private ensureConfig(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, JSON.stringify({ tasks: [] }, null, 2));
    }
  }

  getTasks(): ScheduledTask[] {
    try {
      const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      return data.tasks || [];
    } catch {
      return [];
    }
  }

  private saveTasks(tasks: ScheduledTask[]): void {
    fs.writeFileSync(this.configPath, JSON.stringify({ tasks }, null, 2));
  }

  async createTask(task: Omit<ScheduledTask, 'id' | 'createdAt'>): Promise<ScheduledTask> {
    const tasks = this.getTasks();

    const newTask: ScheduledTask = {
      ...task,
      id: `task_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    if (task.enabled) {
      await this.installCronJob(newTask);
    }

    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
      return false;
    }

    const task = tasks[index];
    await this.removeCronJob(task);

    tasks.splice(index, 1);
    this.saveTasks(tasks);
    return true;
  }

  async toggleTask(taskId: string, enabled: boolean): Promise<boolean> {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      return false;
    }

    if (enabled) {
      await this.installCronJob(task);
    } else {
      await this.removeCronJob(task);
    }

    task.enabled = enabled;
    this.saveTasks(tasks);
    return true;
  }

  private async installCronJob(task: ScheduledTask): Promise<void> {
    const cronLine = `${task.schedule} ${task.command} # openasst:${task.id}`;

    const result = await this.executor.execute('crontab -l 2>/dev/null || echo ""');
    let crontab = result.output || '';

    crontab = crontab.split('\n')
      .filter(line => !line.includes(`openasst:${task.id}`))
      .join('\n');

    crontab = crontab.trim() + '\n' + cronLine + '\n';

    await this.executor.execute(`echo "${crontab}" | crontab -`);
  }

  private async removeCronJob(task: ScheduledTask): Promise<void> {
    const result = await this.executor.execute('crontab -l 2>/dev/null || echo ""');
    let crontab = result.output || '';

    crontab = crontab.split('\n')
      .filter(line => !line.includes(`openasst:${task.id}`))
      .join('\n');

    await this.executor.execute(`echo "${crontab}" | crontab -`);
  }

  parseSchedule(expression: string): string {
    const presets: { [key: string]: string } = {
      'every minute': '* * * * *',
      'every hour': '0 * * * *',
      'every day': '0 0 * * *',
      'every week': '0 0 * * 0',
      'every month': '0 0 1 * *',
      'daily': '0 0 * * *',
      'weekly': '0 0 * * 0',
      'monthly': '0 0 1 * *'
    };

    return presets[expression.toLowerCase()] || expression;
  }
}
