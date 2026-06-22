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

/* ───────── File API ───────── */

export interface FolderEntry {
  path: string;
  last_modified: string | null;
}

export interface FileEntry {
  bucket?: string;
  object_name: string;
  filename: string;
  size: number;
  last_modified: string | null;
  content_type?: string;
}

export interface ListFilesResult {
  status: string;
  bucket: string;
  prefix: string | null;
  folders: FolderEntry[];
  files: FileEntry[];
  total: number;
  offset: number;
  limit: number;
}

export async function listFiles(params?: {
  offset?: number;
  limit?: number;
  prefix?: string;
  recursive?: boolean;
}): Promise<ListFilesResult> {
  const query = new URLSearchParams();
  if (params?.offset !== undefined) query.append('offset', params.offset.toString());
  if (params?.limit !== undefined) query.append('limit', params.limit.toString());
  if (params?.prefix) query.append('prefix', params.prefix);
  if (params?.recursive) query.append('recursive', 'true');
  const qs = query.toString();
  const response = await fetch(`${API_BASE_URL}/api/v1/files${qs ? '?' + qs : ''}`);
  if (!response.ok) throw new Error('Failed to list files');
  return response.json();
}

export async function uploadFile(
  file: File,
  options?: { prefix?: string; relativePath?: string },
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.prefix) formData.append('prefix', options.prefix);
  if (options?.relativePath) formData.append('relative_path', options.relativePath);
  const response = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload failed');
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

export async function searchFiles(q: string): Promise<{ files: FileEntry[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/search?q=${encodeURIComponent(q)}`);
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

export async function shareFile(objectName: string, expiresHours: number = 24): Promise<{ share_url: string; expires_in_hours: number }> {
  const formData = new FormData();
  formData.append('expires_hours', expiresHours.toString());
  const response = await fetch(`${API_BASE_URL}/api/v1/files/share/${encodeURIComponent(objectName)}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to generate share link');
  return response.json();
}

export async function batchDeleteFiles(objectNames: string[]): Promise<{ deleted: string[]; errors: string[] }> {
  const formData = new FormData();
  formData.append('object_names', JSON.stringify(objectNames));
  const response = await fetch(`${API_BASE_URL}/api/v1/files/batch-delete`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Batch delete failed');
  return response.json();
}

/* ───────── Conversion API ───────── */

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

export interface CapabilityItem {
  key: string;
  name: string;
  from_ext: string;
  to_ext: string;
  group: string;
  quality: 'high' | 'medium' | 'low';
  stability: 'stable' | 'beta' | 'alpha';
  description: string;
}

export interface CapabilityGroup {
  group: string;
  name: string;
  items: CapabilityItem[];
}

export async function getConversionCapabilities(): Promise<{
  capabilities: CapabilityItem[];
  groups: CapabilityGroup[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/v1/convert/capabilities`);
  if (!response.ok) throw new Error('Failed to get conversion capabilities');
  return response.json();
}

export async function convertFile(
  file: File,
  targetFormat: string,
  options?: ConversionOptions & { displayName?: string },
): Promise<{ task_id: string, status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_format', targetFormat);
  if (options?.displayName) formData.append('display_name', options.displayName);
  if (options) {
    const { displayName, ...rest } = options;
    if (Object.keys(rest).length) formData.append('conversion_options', JSON.stringify(rest));
  }
  const response = await fetch(`${API_BASE_URL}/api/v1/convert`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Convert failed');
  return response.json();
}
export async function convertExistingFile(
  objectName: string,
  targetFormat: string,
  options?: ConversionOptions & { displayName?: string },
): Promise<{ task_id: string, status: string }> {
  const formData = new FormData();
  formData.append('object_name', objectName);
  formData.append('target_format', targetFormat);
  if (options?.displayName) formData.append('display_name', options.displayName);
  if (options) {
    const { displayName, ...rest } = options;
    if (Object.keys(rest).length) formData.append('conversion_options', JSON.stringify(rest));
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/convert/existing`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Convert failed');
  return response.json();
}
export async function extractPdfPages(objectName: string): Promise<{
  status: string;
  preview_id: string;
  source_object_name: string;
  pages: Array<{ page_num: number; url: string; width?: number; height?: number }>;
}> {
  const formData = new FormData();
  formData.append('object_name', objectName);
  const response = await fetch(`${API_BASE_URL}/api/v1/convert/pdf/extract-pages`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to extract PDF pages');
  const payload = await response.json();
  return {
    ...payload,
    pages: payload.pages.map((p: any) => ({ ...p, url: toAbsoluteApiUrl(p.url) })),
  };
}

export interface PDFPageProcessConfig {
  source_object_name: string;
  page_num: number;
  rotation: number;
  canvas_width?: number;
  canvas_height?: number;
  annotations?: PDFAnnotationExport[];
}

export interface PDFAnnotationExport {
  tool: 'pen' | 'rect' | 'arrow' | 'line' | 'text';
  points?: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  size: number;
}

export async function processPdf(pages: PDFPageProcessConfig[], outputFilename: string = "processed.pdf"): Promise<{ task_id: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/convert/pdf/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages, output_filename: outputFilename }),
  });
  if (!response.ok) throw new Error('Failed to process PDF');
  return response.json();
}

export async function conversionPreview(
  file: File,
  targetFormat: string,
  options?: { displayName?: string },
): Promise<{
  preview_object_name: string;
  preview_url: string;
  suggested_filename: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_format', targetFormat);
  if (options?.displayName) formData.append('display_name', options.displayName);
  const response = await fetch(`${API_BASE_URL}/api/v1/convert/preview`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Preview conversion failed');
  return response.json();
}

export async function exportPreview(
  previewObjectName: string,
  targetFilename: string,
): Promise<{ object_name: string; filename: string; download_url: string }> {
  const formData = new FormData();
  formData.append('preview_object_name', previewObjectName);
  formData.append('target_filename', targetFilename);
  const response = await fetch(`${API_BASE_URL}/api/v1/convert/export`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Export failed');
  return response.json();
}

/* ───────── Task API ───────── */

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

export async function getTaskStatus(taskId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
  if (!response.ok) throw new Error('Task not found');
  const payload = await response.json();
  return { ...payload, result_url: payload.result_url ? toAbsoluteApiUrl(payload.result_url) : payload.result_url };
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
  return { ...payload, length: payload.queue_length };
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
  return { tasks: payload.failures || [] };
}

/* ───────── System / Health API ───────── */

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

export interface HealthStatus {
  services: Record<string, { status: string; latency_ms?: number; [key: string]: any }>;
}

export async function getSystemHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/system/health`);
  if (!response.ok) throw new Error('Failed to get system health');
  return response.json();
}

export interface LogEvent {
  timestamp: string;
  type: string;
  message: string;
  category?: 'file' | 'folder' | 'conversion' | 'pdf' | 'system' | string;
  resource_type?: string;
  action?: string;
  severity?: 'info' | 'success' | 'warning' | 'error' | string;
  title_zh?: string;
  title_en?: string;
  user_id?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  task_id?: string | null;
  metadata?: Record<string, any>;
}

export async function getRecentLogs(limit: number = 50): Promise<{ events: LogEvent[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/logs/recent?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to get recent logs');
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

export async function getTaskStats(): Promise<{ total: number; queued: number; processing: number; completed: number; failed: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/stats`);
  if (!response.ok) throw new Error('Failed to get task stats');
  return response.json();
}

/* ───────── Auth / Role API ───────── */

export async function fetchRole(): Promise<{ role: 'user' | 'admin' }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`);
  if (!response.ok) throw new Error('Failed to fetch role');
  return response.json();
}

export async function setServerRole(role: 'user' | 'admin'): Promise<{ role: 'user' | 'admin' }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error('Failed to set role');
  return response.json();
}

/* ───────── Preview API ───────── */

export interface PreviewMetadata {
  status: string;
  object_name: string;
  filename: string;
  size: number;
  preview_type: 'pdf' | 'html' | 'text' | 'image' | 'unsupported';
  cached: boolean;
  content_url: string;
}

export async function getPreviewMetadata(objectName: string): Promise<PreviewMetadata> {
  const response = await fetch(`${API_BASE_URL}/api/v1/preview/${encodeURIComponent(objectName)}`);
  if (!response.ok) throw new Error('Preview not available');
  return response.json();
}

export const getPreview = getPreviewMetadata;

export function getPreviewContentUrl(objectName: string): string {
  return `${API_BASE_URL}/api/v1/preview/${encodeURIComponent(objectName)}/content`;
}

export async function clearPreviewCache(objectName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/preview/${encodeURIComponent(objectName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to clear preview cache');
}

/* ───────── Folder API ───────── */

export interface BrowseResult {
  status: string;
  bucket: string;
  path?: string;
  folders: FolderEntry[];
  files: FileEntry[];
}

export async function createFolder(path: string): Promise<{ status: string; folder: string; path: string }> {
  const formData = new FormData();
  formData.append('path', path);
  const response = await fetch(`${API_BASE_URL}/api/v1/files/folders`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to create folder');
  return response.json();
}

export async function browseRoot(): Promise<BrowseResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/folders`);
  if (!response.ok) throw new Error('Failed to browse root');
  return response.json();
}

export async function browseFolder(path: string): Promise<BrowseResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/folders/${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error('Failed to browse folder');
  return response.json();
}

export async function deleteFolder(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/folders/${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'Failed to delete folder');
  }
}

export async function renameFolder(path: string, newName: string): Promise<{ status: string; old_name: string; new_name: string; objects_moved: number }> {
  const formData = new FormData();
  formData.append('new_name', newName);
  const response = await fetch(`${API_BASE_URL}/api/v1/folders/rename/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to rename folder');
  return response.json();
}

export async function moveToFolder(objectName: string, targetFolder: string): Promise<{ status: string; object_name: string; filename: string }> {
  const formData = new FormData();
  formData.append('object_name', objectName);
  formData.append('target_folder', targetFolder);
  const response = await fetch(`${API_BASE_URL}/api/v1/folders/move`, {
    method: 'PUT',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to move file');
  return response.json();
}
