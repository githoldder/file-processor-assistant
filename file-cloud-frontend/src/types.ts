export type ViewState = 'dashboard' | 'files' | 'convert' | 'task-monitor' | 'system-status' | 'pdf';
export type Language = 'en' | 'zh';

export interface Task {
  id: string;
  type: string;
  workerNode: string;
  processingTime: string;
  status: 'success' | 'processing' | 'queued' | 'failed';
  progress?: number;
}

export interface WorkerNode {
  id: string;
  currentTask: string;
  throughput: string;
  status: 'active' | 'standby';
  load: number;
  memory: number;
  storage: number;
}

export interface FileItem {
  name: string;
  size: string;
  type: string;
  lastModified: string;
  iconType: 'folder' | 'pdf' | 'avro' | 'csv' | 'zip';
}
