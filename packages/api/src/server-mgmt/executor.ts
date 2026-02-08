import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecutionLog {
  timestamp: Date;
  command: string;
  output: string;
  exitCode: number;
  error?: string;
}

export class CommandExecutor {
  async execute(command: string): Promise<ExecutionLog> {
    const startTime = new Date();

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000,
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
      });

      return {
        timestamp: startTime,
        command,
        output: stdout || stderr,
        exitCode: 0,
        error: stderr || undefined
      };
    } catch (error: any) {
      return {
        timestamp: startTime,
        command,
        output: error.stdout || '',
        exitCode: error.code || 1,
        error: error.stderr || error.message
      };
    }
  }
}
