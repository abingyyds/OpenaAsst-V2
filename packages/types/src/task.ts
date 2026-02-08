export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  workDir: string;
  createdAt: Date;
  updatedAt: Date;
}
