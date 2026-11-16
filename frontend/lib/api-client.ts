import { Job, JobListResponse, SystemStats, CreateJobResponse } from "@/types";

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("mediaflow_api_base_url");
    if (customUrl) return customUrl.replace(/\/+$/, "");
    // Use the same-origin Next.js proxy rewrite by default in browsers
    // to prevent any CORS or cross-origin localhost resolution issues
    return "/api/backend";
  }
  return DEFAULT_API_BASE.replace(/\/+$/, "");
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    if (!url) {
      localStorage.removeItem("mediaflow_api_base_url");
    } else {
      localStorage.setItem("mediaflow_api_base_url", url.replace(/\/+$/, ""));
    }
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = "An unexpected error occurred";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new ApiError(errorDetail, response.status);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  async getHealth(): Promise<{ status: string }> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    return handleResponse<{ status: string }>(res);
  },

  async getStats(): Promise<SystemStats> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/stats`, { cache: "no-store" });
    return handleResponse<SystemStats>(res);
  },

  async listJobs(params: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
  } = {}): Promise<JobListResponse> {
    const base = getApiBaseUrl();
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", params.limit.toString());
    if (params.offset !== undefined) query.set("offset", params.offset.toString());
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);

    const qs = query.toString();
    const url = `${base}/jobs${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    return handleResponse<JobListResponse>(res);
  },

  async getJob(id: string): Promise<Job> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/jobs/${id}`, { cache: "no-store" });
    return handleResponse<Job>(res);
  },

  async uploadJob(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<CreateJobResponse> {
    const base = getApiBaseUrl();
    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${base}/jobs`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data as CreateJobResponse);
          } catch {
            reject(new ApiError("Invalid response JSON from server", xhr.status));
          }
        } else {
          let msg = `Upload failed with HTTP ${xhr.status}`;
          try {
            const err = JSON.parse(xhr.responseText);
            if (err.detail) msg = err.detail;
          } catch {
            // fallback
          }
          reject(new ApiError(msg, xhr.status));
        }
      };

      xhr.onerror = () => {
        reject(new ApiError("Network error: Unable to connect to the backend server. Verify that the FastAPI API server is running and accessible.", 0));
      };

      xhr.send(formData);
    });
  },
};
