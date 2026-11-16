"use client";

import React, { useState } from "react";
import {
  FileCode2,
  Copy,
  Check,
  Server,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Code2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiBaseUrl } from "@/lib/api-client";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto border border-slate-800 group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded bg-slate-800 transition-colors"
        title="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  const baseUrl = getApiBaseUrl();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Developer API Reference
          </h1>
          <Badge variant="default" className="text-xs">
            v1.0.0 REST
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete HTTP interface documentation for integrating MediaFlow into external applications.
        </p>
      </div>

      {/* Base URL and Architecture Note */}
      <Card>
        <CardHeader>
          <CardTitle>Base Endpoint & Authentication</CardTitle>
          <CardDescription>Current configured target API host</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 font-mono">
            <span className="font-semibold text-slate-600">Base URL:</span>
            <code className="text-indigo-600 font-bold">{baseUrl}</code>
          </div>

          <p className="text-slate-600 leading-relaxed">
            The media processing API uses asynchronous request delegation. Ingress endpoints return an immediate <code className="font-mono font-semibold">202 Accepted</code> containing the job UUID, decoupling HTTP connections from heavy image transformations.
          </p>
        </CardContent>
      </Card>

      {/* Endpoints Reference */}
      <div className="space-y-6">
        {/* 1. Health Check */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-700">
                  GET
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">/health</span>
              </div>
              <Badge variant="secondary">Liveness Probe</Badge>
            </div>
            <CardDescription>Verifies API server responsiveness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">Sample Request:</p>
            <CodeBlock code={`curl -X GET "${baseUrl}/health"`} />

            <p className="text-xs text-slate-600">Response (200 OK):</p>
            <CodeBlock
              code={JSON.stringify(
                {
                  status: "Healthy",
                },
                null,
                2
              )}
              language="json"
            />
          </CardContent>
        </Card>

        {/* 2. System Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-700">
                  GET
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">/stats</span>
              </div>
              <Badge variant="secondary">System Telemetry</Badge>
            </div>
            <CardDescription>Returns live RabbitMQ queue depth and database job totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">Sample Request:</p>
            <CodeBlock code={`curl -X GET "${baseUrl}/stats"`} />

            <p className="text-xs text-slate-600">Response (200 OK):</p>
            <CodeBlock
              code={JSON.stringify(
                {
                  status: "Healthy",
                  queue: {
                    name: "media_processing_jobs",
                    depth: 0,
                    consumer_count: 1,
                    broker_connected: true,
                  },
                  database: {
                    status: "connected",
                    total_jobs: 24,
                    pending_jobs: 0,
                    processing_jobs: 0,
                    completed_jobs: 24,
                    failed_jobs: 0,
                  },
                  storage: {
                    bucket: "media-bucket",
                    status: "connected",
                  },
                },
                null,
                2
              )}
              language="json"
            />
          </CardContent>
        </Card>

        {/* 3. Submit Media Processing Job */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-100 text-emerald-700">
                  POST
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">/jobs</span>
              </div>
              <Badge variant="default">Upload & Enqueue</Badge>
            </div>
            <CardDescription>
              Uploads raw image to MinIO S3, inserts PENDING record into PostgreSQL, and enqueues task to RabbitMQ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">Sample Request (Multipart Form):</p>
            <CodeBlock
              code={`curl -X POST "${baseUrl}/jobs" \\
  -F "file=@/path/to/my_image.png"`}
            />

            <p className="text-xs text-slate-600">Response (202 Accepted):</p>
            <CodeBlock
              code={JSON.stringify(
                {
                  id: "e49c7162-bb17-4ef6-bb4d-61fa4cba9456",
                  status: "PENDING",
                  original_filename: "my_image.png",
                  original_key: "uploads/e49c7162-bb17-4ef6-bb4d-61fa4cba9456/my_image.png",
                },
                null,
                2
              )}
              language="json"
            />
          </CardContent>
        </Card>

        {/* 4. Query Job Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-700">
                  GET
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">/jobs/{"{job_id}"}</span>
              </div>
              <Badge variant="secondary">Job Status & Presigned URLs</Badge>
            </div>
            <CardDescription>
              Polls lifecycle execution. Returns temporary presigned S3 download URL once status is COMPLETED.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">Sample Request:</p>
            <CodeBlock
              code={`curl -X GET "${baseUrl}/jobs/e49c7162-bb17-4ef6-bb4d-61fa4cba9456"`}
            />

            <p className="text-xs text-slate-600">Response (200 OK):</p>
            <CodeBlock
              code={JSON.stringify(
                {
                  id: "e49c7162-bb17-4ef6-bb4d-61fa4cba9456",
                  status: "COMPLETED",
                  original_filename: "my_image.png",
                  original_key: "uploads/e49c7162-bb17-4ef6-bb4d-61fa4cba9456/my_image.png",
                  created_at: "2026-11-16T15:30:00.123456+00:00",
                  started_at: "2026-11-16T15:30:00.345678+00:00",
                  completed_at: "2026-11-16T15:30:01.234567+00:00",
                  duration_seconds: 0.89,
                  output_key: "processed/e49c7162-bb17-4ef6-bb4d-61fa4cba9456.jpg",
                  error: null,
                  download_url: "http://localhost:9000/media-bucket/processed/...?AWSAccessKeyId=...",
                  original_url: "http://localhost:9000/media-bucket/uploads/...?AWSAccessKeyId=...",
                },
                null,
                2
              )}
              language="json"
            />
          </CardContent>
        </Card>

        {/* 5. List Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 text-blue-700">
                  GET
                </span>
                <span className="font-mono text-sm font-semibold text-slate-900">/jobs</span>
              </div>
              <Badge variant="secondary">Pagination & Filter</Badge>
            </div>
            <CardDescription>Lists jobs with optional status filter, search, and pagination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">Sample Request:</p>
            <CodeBlock code={`curl -X GET "${baseUrl}/jobs?limit=20&status=COMPLETED"`} />

            <p className="text-xs text-slate-600">Response (200 OK):</p>
            <CodeBlock
              code={JSON.stringify(
                {
                  total: 42,
                  limit: 20,
                  offset: 0,
                  items: [
                    {
                      id: "e49c7162-bb17-4ef6-bb4d-61fa4cba9456",
                      status: "COMPLETED",
                      original_filename: "my_image.png",
                      duration_seconds: 0.89,
                      download_url: "http://localhost:9000/...",
                    },
                  ],
                },
                null,
                2
              )}
              language="json"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
