export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TABULAR' | 'OTHER';

export interface Job {
  id: string;
  status: JobStatus;
  original_filename: string;
  original_key: string | null;
  media_type?: MediaType;
  mime_type?: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  output_key: string | null;
  preview_key?: string | null;
  meta?: Record<string, any> | null;
  error: string | null;
  download_url: string | null;
  original_url: string | null;
  preview_url?: string | null;
}

export interface JobListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Job[];
}

export interface QueueStats {
  name: string;
  depth: number;
  consumer_count: number;
  broker_connected: boolean;
}

export interface DatabaseStats {
  status: string;
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  media_types?: Record<string, number>;
}

export interface StorageStats {
  bucket: string;
  status: string;
}

export interface SystemStats {
  status: string;
  queue: QueueStats;
  database: DatabaseStats;
  storage: StorageStats;
}

export interface CreateJobResponse {
  id: string;
  status: JobStatus;
  original_filename: string;
  original_key: string;
  media_type?: string;
  mime_type?: string;
}
