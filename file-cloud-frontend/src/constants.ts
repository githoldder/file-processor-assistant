import { Task, WorkerNode, FileItem } from './types';

export const TASKS: Task[] = [
  { id: 'TX-90245-A', type: 'PDF_OPTIMIZE', workerNode: 'us-east-worker-04', processingTime: '1.2s', status: 'success' },
  { id: 'TX-90246-B', type: 'VIDEO_ENCODE_4K', workerNode: 'eu-west-worker-12', processingTime: '75%', status: 'processing', progress: 75 },
  { id: 'TX-90247-C', type: 'BATCH_RESIZE', workerNode: 'us-west-worker-01', processingTime: '--', status: 'queued' },
  { id: 'TX-90248-D', type: 'METADATA_EXTRACT', workerNode: 'ap-south-worker-09', processingTime: '450ms', status: 'failed' },
];

export const WORKER_NODES: WorkerNode[] = [
  { id: 'node-01', currentTask: 'PDF Optimization (Batch #992)', throughput: '422 MB/s', status: 'active', load: 88, memory: 75, storage: 45 },
  { id: 'node-02', currentTask: 'CSV to Parquet Stream', throughput: '1.1 GB/s', status: 'active', load: 42, memory: 35, storage: 80 },
  { id: 'node-03', currentTask: 'Idle (Awaiting Queue)', throughput: '0 B/s', status: 'standby', load: 2, memory: 12, storage: 15 },
  { id: 'node-04', currentTask: 'Image Processing Pipeline', throughput: '850 MB/s', status: 'active', load: 65, memory: 60, storage: 30 },
  { id: 'node-05', currentTask: 'Log Aggregation', throughput: '310 MB/s', status: 'active', load: 55, memory: 45, storage: 90 },
  { id: 'node-06', currentTask: 'Database Index Recovery', throughput: '2.4 GB/s', status: 'active', load: 92, memory: 88, storage: 65 },
];

export const FILES: FileItem[] = [
  { name: 'Data_Warehouse_2024', size: '--', type: 'Folder', lastModified: 'Oct 12, 2023', iconType: 'folder' },
  { name: 'Q3_System_Audit.pdf', size: '4.2 MB', type: 'PDF', lastModified: '2 hours ago', iconType: 'pdf' },
  { name: 'user_events_log.avro', size: '1.8 GB', type: 'AVRO', lastModified: 'Yesterday, 11:45 PM', iconType: 'avro' },
  { name: 'nodes_inventory.csv', size: '124 KB', type: 'CSV', lastModified: 'Sep 28, 2023', iconType: 'csv' },
  { name: 'legacy_backups_01.zip', size: '4.5 GB', type: 'ARCHIVE', lastModified: 'Aug 15, 2023', iconType: 'zip' },
];

export const SYSTEM_LOGS = [
  { time: '14:22:01', message: 'Worker-04 optimization complete.', type: 'info' },
  { time: '14:22:05', message: 'Dispatcher: Task TX-90246-B routed to Node-12.', type: 'info' },
  { time: '14:22:12', message: 'Warning: Node-09 memory threshold at 85%.', type: 'warning' },
  { time: '14:22:18', message: 'Queuing: 4 new ingestions from S3.', type: 'info' },
  { time: '14:22:25', message: 'Critical: Node-01 connection timed out.', type: 'error' },
];
