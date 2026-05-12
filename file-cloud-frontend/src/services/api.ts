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
