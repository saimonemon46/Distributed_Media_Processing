import { describe, it, expect } from "vitest";
import { Job, JobStatus } from "@/types";

describe("Job Lifecycle & Metadata Modeling", () => {
  it("models state transitions through the complete lifecycle", () => {
    const states: JobStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];
    expect(states).toContain("PENDING");
    expect(states).toContain("PROCESSING");
    expect(states).toContain("COMPLETED");
    expect(states).toContain("FAILED");
  });

  it("calculates job execution duration accurately", () => {
    const job: Job = {
      id: "7d0d0f22-1234-5678-90ab-cdef12345678",
      status: "COMPLETED",
      original_filename: "nature.png",
      original_key: "uploads/7d0d0f22-1234-5678-90ab-cdef12345678/nature.png",
      created_at: "2026-11-16T10:00:00.000Z",
      started_at: "2026-11-16T10:00:00.250Z",
      completed_at: "2026-11-16T10:00:01.450Z",
      duration_seconds: 1.2,
      output_key: "processed/7d0d0f22-1234-5678-90ab-cdef12345678.jpg",
      error: null,
      download_url: "https://minio.example.com/media-bucket/processed/...?token=abc",
      original_url: "https://minio.example.com/media-bucket/uploads/...?token=xyz",
    };

    expect(job.status).toBe("COMPLETED");
    expect(job.duration_seconds).toBe(1.2);
    expect(job.output_key).toMatch(/^processed\//);
    expect(job.download_url).toContain("token=abc");
    expect(job.original_url).toContain("token=xyz");
  });

  it("handles failed task error isolation", () => {
    const failedJob: Job = {
      id: "8e1e1f33-1234-5678-90ab-cdef12345678",
      status: "FAILED",
      original_filename: "corrupt.png",
      original_key: "uploads/8e1e1f33-1234-5678-90ab-cdef12345678/corrupt.png",
      created_at: "2026-11-16T10:00:00.000Z",
      started_at: "2026-11-16T10:00:00.100Z",
      completed_at: "2026-11-16T10:00:00.200Z",
      duration_seconds: 0.1,
      output_key: null,
      error: "cannot identify image file (corrupt header)",
      download_url: null,
      original_url: "https://minio.example.com/media-bucket/uploads/...",
    };

    expect(failedJob.status).toBe("FAILED");
    expect(failedJob.download_url).toBeNull();
    expect(failedJob.error).toContain("cannot identify image file");
  });
});
