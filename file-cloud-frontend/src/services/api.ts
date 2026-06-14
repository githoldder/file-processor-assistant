import { FileItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (pathOrUrl.includes(':9000/')) {
    throw new Error('Unsafe storage URL blocked. Please retry the conversion.');
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `${API_BASE_URL}${pathOrUrl}`;
}

export async function uploadFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  return response.json();
}

export async function listFiles(): Promise<{ files: any[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files`);
  if (!response.ok) throw new Error('Failed to list files');
  return response.json();
}

export async function deleteFile(objectId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/${encodeURIComponent(objectId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete file');
}

export async function getDownloadUrl(objectId: string): Promise<{ download_url: string; api_download_url?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/download/${encodeURIComponent(objectId)}`);
  if (!response.ok) throw new Error('Failed to get download URL');
  const payload = await response.json();
  return {
    ...payload,
    api_download_url: payload.api_download_url ? toAbsoluteApiUrl(payload.api_download_url) : undefined,
  };
}

export async function renameFile(objectId: string, newFilename: string): Promise<{ object_name: string; filename: string }> {
  const formData = new FormData();
  formData.append('new_filename', newFilename);

  const response = await fetch(`${API_BASE_URL}/api/v1/files/rename/${encodeURIComponent(objectId)}`, {
    method: 'PATCH',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to rename file');
  return response.json();
}

export async function statFile(objectId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/stat/${encodeURIComponent(objectId)}`);
  if (!response.ok) throw new Error('Failed to stat file');
  return response.json();
}

export interface ConversionOptions {
  excel_layout?: {
    page_size: 'A4' | 'A3';
    orientation: 'portrait' | 'landscape';
    max_columns: number;
    font_size: number;
    include_all_sheets: boolean;
    repeat_header: boolean;
  };
}

export async function convertFile(file: File, targetFormat: string, options?: ConversionOptions): Promise<{ task_id: string, status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_format', targetFormat);
  if (options) {
    formData.append('conversion_options', JSON.stringify(options));
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/convert`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Convert failed');
  return response.json();
}

export async function getTaskStatus(taskId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
  if (!response.ok) throw new Error('Task not found');
  const payload = await response.json();
  return {
    ...payload,
    result_url: payload.result_url ? toAbsoluteApiUrl(payload.result_url) : payload.result_url,
  };
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
export async function convertExistingFile(objectName: string, targetFormat: string, options?: ConversionOptions): Promise<{ task_id: string, status: string }> {
  const formData = new FormData();
  formData.append('object_name', objectName);
  formData.append('target_format', targetFormat);
  if (options) {
    formData.append('conversion_options', JSON.stringify(options));
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/convert/existing`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Convert failed');
  return response.json();
}

export interface TaskItem {
  task_id: string;
  kind: string;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result_url?: string;
}

export async function listTasks(params: { offset?: number; limit?: number; status?: string; kind?: string }): Promise<{ items: TaskItem[]; total: number; offset: number; limit: number }> {
  const query = new URLSearchParams();
  if (params.offset !== undefined) query.append('offset', params.offset.toString());
  if (params.limit !== undefined) query.append('limit', params.limit.toString());
  if (params.status) query.append('status', params.status);
  if (params.kind) query.append('kind', params.kind);

  const response = await fetch(`${API_BASE_URL}/api/v1/tasks?${query.toString()}`);
  if (!response.ok) throw new Error('Failed to list tasks');
  return response.json();
}

export async function getQueueLength(): Promise<{ queue_length: number; length: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/queue-length`);
  if (!response.ok) throw new Error('Failed to get queue length');
  const payload = await response.json();
  return {
    ...payload,
    length: payload.queue_length
  };
}

export async function getClusterOverview(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/cluster/overview`);
  if (!response.ok) throw new Error('Failed to get cluster overview');
  return response.json();
}

export async function getRecentFailures(limit: number = 5): Promise<{ tasks: TaskItem[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/recent-failures?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to get recent failures');
  const payload = await response.json();
  return {
    tasks: payload.failures || []
  };
}

export interface HealthStatus {
  services: Record<string, {
    status: string;
    latency_ms?: number;
    [key: string]: any;
  }>;
}

export interface LogEvent {
  timestamp: string;
  type: string;
  message: string;
}

export async function getSystemHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/system/health`);
  if (!response.ok) throw new Error('Failed to get system health');
  return response.json();
}

export async function getLogTimeline(hours: number = 24, event_type?: string, limit: number = 50): Promise<{ events: LogEvent[]; count: number }> {
  const query = new URLSearchParams();
  query.append('hours', hours.toString());
  if (event_type) query.append('event_type', event_type);
  query.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/api/v1/logs/timeline?${query.toString()}`);
  if (!response.ok) throw new Error('Failed to get log timeline');
  return response.json();
}

export async function getLogStats(hours: number = 24): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/logs/stats?hours=${hours}`);
  if (!response.ok) throw new Error('Failed to get log stats');
  return response.json();
}
