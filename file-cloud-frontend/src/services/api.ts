import { FileItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function uploadFile(file: File): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  return response.json();
}

export async function getFileInfo(fileId: string): Promise<FileItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/files/${fileId}`);
  if (!response.ok) throw new Error('File not found');
  return response.json();
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
