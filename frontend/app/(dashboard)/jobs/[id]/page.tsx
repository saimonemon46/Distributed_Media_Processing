"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileImage,
  FileText,
  Table as TableIcon,
  Video as VideoIcon,
  RefreshCw,
  ExternalLink,
  Code2,
  FileSpreadsheet,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDuration } from "@/lib/utils";

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["jobDetail", id],
    queryFn: () => apiClient.getJob(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when reached a terminal state
      if (status === "COMPLETED" || status === "FAILED") {
        return false;
      }
      return 2500; // Poll active jobs every 2.5s
    },
  });

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Job Not Found</h2>
        <p className="text-sm text-slate-500">
          {error instanceof Error ? error.message : "The requested task ID does not exist in the database."}
        </p>
        <Link href="/jobs">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Jobs</span>
          </Button>
        </Link>
      </div>
    );
  }

  const isTerminal = job.status === "COMPLETED" || job.status === "FAILED";
  const mediaType = job.media_type || "IMAGE";
  const meta = job.meta || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Jobs</span>
        </Link>

        <div className="flex items-center gap-2">
          {!isTerminal && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Worker executing...</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            className="h-8 px-2.5 text-xs gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Main Details Header Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {mediaType} Processing Job
              </span>
              <Badge variant="status" status={job.status} />
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {mediaType}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="font-mono text-sm sm:text-base font-bold text-slate-900 break-all">
                {job.id}
              </h1>
              <button
                onClick={handleCopyId}
                className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                title="Copy Job ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {job.download_url && (
            <a href={job.download_url} target="_blank" rel="noopener noreferrer" download>
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                <Download className="w-4 h-4" />
                <span>Download Result</span>
              </Button>
            </a>
          )}
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Lifecycle State Timeline */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Distributed Task Lifecycle
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Created */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1. Ingested & Enqueued</span>
                </div>
                <p className="text-[11px] text-slate-500">{formatDate(job.created_at)}</p>
                <p className="text-[11px] text-slate-600">Saved in Postgres, enqueued in RabbitMQ</p>
              </div>

              {/* Step 2: Processing */}
              <div
                className={`p-3.5 rounded-lg border space-y-1 ${
                  job.started_at
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-slate-200 bg-slate-50/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {job.started_at ? (
                    <Clock className="w-4 h-4 text-blue-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-300 inline-block" />
                  )}
                  <span>2. Worker Picked Up</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {job.started_at ? formatDate(job.started_at) : "Waiting in queue..."}
                </p>
                <p className="text-[11px] text-slate-600">
                  Worker downloaded bytes & ran {mediaType} pipeline
                </p>
              </div>

              {/* Step 3: Terminal (Completed or Failed) */}
              <div
                className={`p-3.5 rounded-lg border space-y-1 ${
                  job.status === "COMPLETED"
                    ? "border-emerald-200 bg-emerald-50/60"
                    : job.status === "FAILED"
                    ? "border-rose-200 bg-rose-50/60"
                    : "border-slate-200 bg-slate-50/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  {job.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : job.status === "FAILED" ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-300 inline-block" />
                  )}
                  <span>
                    3. {job.status === "FAILED" ? "Task Failed" : "Completed in S3"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {job.completed_at ? formatDate(job.completed_at) : "Awaiting completion..."}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  {job.duration_seconds !== null
                    ? `Duration: ${formatDuration(job.duration_seconds)}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Failure Banner if FAILED */}
          {job.status === "FAILED" && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-sm text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Worker Execution Error</span>
              </div>
              <p className="text-xs font-mono bg-white/70 p-2.5 rounded border border-rose-200 break-all text-rose-950">
                {job.error || "Unknown worker processing failure"}
              </p>
            </div>
          )}

          {/* Multi-Modal Interactive Viewer */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Media Asset Viewer & Technical Previews
            </h3>

            {/* VIDEO VIEWER */}
            {mediaType === "VIDEO" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {job.original_url && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-black/5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700">HTML5 Video Player</span>
                        <a href={job.original_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 flex items-center gap-1 text-[11px]">
                          <span>Open Full Video</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        <video
                          src={job.original_url}
                          poster={job.preview_url || undefined}
                          controls
                          className="max-h-full max-w-full"
                        />
                      </div>
                    </div>
                  )}

                  {job.preview_url && (
                    <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/20 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-purple-900">Extracted Poster Frame (at 1.0s)</span>
                        <a href={job.preview_url} target="_blank" rel="noopener noreferrer" className="text-purple-700 flex items-center gap-1 text-[11px]">
                          <span>Download Poster</span>
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.preview_url}
                          alt="Poster Frame"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {meta && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">Duration</span>
                      <span className="font-semibold font-mono text-slate-800">{meta.duration_seconds ? `${meta.duration_seconds}s` : "—"}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">Resolution</span>
                      <span className="font-semibold font-mono text-slate-800">{meta.width && meta.height ? `${meta.width} × ${meta.height}` : "—"}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">Codec</span>
                      <span className="font-semibold font-mono text-slate-800 uppercase">{meta.codec || "—"}</span>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-slate-500 block text-[11px]">Framerate</span>
                      <span className="font-semibold font-mono text-slate-800">{meta.fps || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENT (PDF) VIEWER */}
            {mediaType === "DOCUMENT" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {job.preview_url ? (
                    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/20 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-amber-900">Rendered Page 1 Poster (150 DPI)</span>
                        <a href={job.preview_url} target="_blank" rel="noopener noreferrer" className="text-amber-700 flex items-center gap-1 text-[11px]">
                          <span>Open Image</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="h-72 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.preview_url}
                          alt="PDF Page 1 Poster"
                          className="max-h-full max-w-full object-contain shadow-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-72 border border-dashed rounded-xl flex items-center justify-center text-slate-400">
                      No poster preview available
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                      <span className="font-semibold text-slate-800">PDF Metadata & Schema</span>
                      <div className="space-y-2 text-slate-600 pt-1">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span>Total Page Count</span>
                          <span className="font-bold text-slate-900 font-mono">{meta.page_count ?? "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span>Title</span>
                          <span className="font-medium text-slate-900">{meta.title || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span>Author</span>
                          <span className="font-medium text-slate-900">{meta.author || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span>Creator Tool</span>
                          <span className="font-mono text-[11px] text-slate-700">{meta.creator || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {job.original_url && (
                      <a href={job.original_url} target="_blank" rel="noopener noreferrer" className="block">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <ExternalLink className="w-4 h-4" />
                          <span>Open Original PDF in New Tab</span>
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TABULAR (CSV / EXCEL) VIEWER */}
            {mediaType === "TABULAR" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-[11px]">Total Rows</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{meta.rows ?? "—"}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-[11px]">Columns Count</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{meta.columns_count ?? (meta.columns?.length ?? "—")}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-[11px]">File Format</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm uppercase">{meta.format || "CSV"}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-[11px]">Summary Artifact</span>
                    <span className="font-medium text-slate-800 text-[11px] truncate block">summary.json</span>
                  </div>
                </div>

                {/* Interactive Data Table Preview */}
                {Array.isArray(meta.preview_rows) && meta.preview_rows.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Interactive Head Preview (First {meta.preview_rows.length} Rows)</span>
                      </span>
                      {job.download_url && (
                        <a href={job.download_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium hover:underline">
                          Download Schema JSON
                        </a>
                      )}
                    </div>
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0 font-mono">
                          <tr>
                            {meta.columns?.map((col: string) => (
                              <th key={col} className="px-3 py-2 whitespace-nowrap">
                                <div>{col}</div>
                                {meta.dtypes?.[col] && (
                                  <div className="text-[10px] font-normal text-slate-500">{meta.dtypes[col]}</div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {meta.preview_rows.map((row: Record<string, any>, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              {meta.columns?.map((col: string) => (
                                <td key={col} className="px-3 py-2 text-slate-800 whitespace-nowrap">
                                  {row[col] !== undefined && row[col] !== null ? String(row[col]) : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMAGE VIEWER */}
            {mediaType === "IMAGE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original Preview */}
                {job.original_url && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Original Uploaded File</span>
                      <a
                        href={job.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <span>Open Raw</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="h-56 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={job.original_url}
                        alt="Original media"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Processed Thumbnail Preview */}
                {(job.preview_url || job.download_url) && (
                  <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-800">Pillow Aspect-Preserved Thumbnail</span>
                      <a
                        href={job.download_url || job.preview_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                      >
                        <span>Direct Download</span>
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="h-56 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={job.preview_url || job.download_url!}
                        alt="Processed media thumbnail"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Technical Inspector: JSON Metadata Accordion */}
          {meta && Object.keys(meta).length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Worker Output Metadata
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="h-7 text-xs gap-1 text-slate-600"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showRawJson ? "Hide Raw JSON" : "View Raw JSON"}</span>
                </Button>
              </div>

              {showRawJson && (
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Asset Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="font-semibold text-slate-800">Ingress Asset Storage</span>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span>Filename:</span>
                  <span className="font-medium text-slate-900">{job.original_filename}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span>MinIO Raw S3 Key:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[200px]" title={job.original_key || ""}>
                    {job.original_key || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Media Classification:</span>
                  <span className="font-mono font-semibold text-indigo-600">{mediaType}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="font-semibold text-slate-800">Processing Output Artifact</span>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span>MinIO Output Key:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[200px]" title={job.output_key || ""}>
                    {job.output_key || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span>Presigned Link Expiry:</span>
                  <span className="font-mono text-slate-700">3600s (Time-bound S3 URL)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Processing Latency:</span>
                  <span className="font-mono text-emerald-600">
                    {job.duration_seconds !== null ? `${job.duration_seconds}s` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
