"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import confetti from "canvas-confetti";
import {
  UploadCloud,
  FileImage,
  FileText,
  Table as TableIcon,
  Video as VideoIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";

type MediaCategory = "IMAGE" | "DOCUMENT" | "TABULAR" | "VIDEO" | "UNKNOWN";

function getFileCategory(file: File): MediaCategory {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (name.endsWith(".pdf") || type.includes("pdf")) return "DOCUMENT";
  if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("csv") || type.includes("spreadsheet")) return "TABULAR";
  if (name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm") || type.startsWith("video/")) return "VIDEO";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp") || name.endsWith(".gif") || type.startsWith("image/")) return "IMAGE";
  return "UNKNOWN";
}

export default function UploadPage() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

  const fileCategory = useMemo(() => {
    return selectedFile ? getFileCategory(selectedFile) : null;
  }, [selectedFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMessage(null);
    setSubmittedJobId(null);
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      // Create local preview if image or video
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/webm": [".webm"],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB limit
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0]?.message || "Invalid file selection";
      setErrorMessage(err);
    },
  });

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setSubmittedJobId(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const result = await apiClient.uploadJob(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setSubmittedJobId(result.id);
      setIsUploading(false);

      // Trigger celebratory confetti for smooth recruiter demo feedback
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore if confetti fails in testing
      }
    } catch (err: unknown) {
      setIsUploading(false);
      const msg = err instanceof Error ? err.message : "Failed to upload and enqueue job";
      setErrorMessage(msg);
    }
  };

  const renderCategoryIcon = (category: MediaCategory | null) => {
    switch (category) {
      case "DOCUMENT":
        return <FileText className="w-8 h-8 text-amber-600" />;
      case "TABULAR":
        return <TableIcon className="w-8 h-8 text-emerald-600" />;
      case "VIDEO":
        return <VideoIcon className="w-8 h-8 text-purple-600" />;
      default:
        return <FileImage className="w-8 h-8 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Multi-Modal Media Upload & Distributed Processing
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload images, documents, tabular datasets, or videos. Assets are stored in MinIO and dispatched to RabbitMQ workers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Dropzone & Previews (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Media Asset</CardTitle>
              <CardDescription>
                Supports Images, PDFs, CSV/Excel spreadsheets, and MP4/WebM videos (up to 100MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[240px] ${
                    isDragActive
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {isDragActive ? "Drop the file right here" : "Drag & drop your media file here, or browse"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Images (JPG, PNG, WebP), PDFs, CSV / Excel, Video (MP4, MOV, WebM)
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline" className="text-[10px]">Images</Badge>
                    <Badge variant="outline" className="text-[10px]">PDFs</Badge>
                    <Badge variant="outline" className="text-[10px]">CSV / Excel</Badge>
                    <Badge variant="outline" className="text-[10px]">Video</Badge>
                  </div>
                </div>
              ) : (
                /* Selected File Preview Box */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {previewUrl && fileCategory === "IMAGE" ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt="Upload preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          {renderCategoryIcon(fileCategory)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatBytes(selectedFile.size)} • {selectedFile.type || "Auto-detected"}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="default" className="text-[10px]">
                            {fileCategory} Pipeline
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Ready for Ingress
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {!isUploading && !submittedJobId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="text-slate-400 hover:text-slate-700"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Upload Progress Bar */}
                  {isUploading && (
                    <div className="space-y-2 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                      <div className="flex items-center justify-between text-xs font-medium text-indigo-900">
                        <span>Streaming raw bytes to MinIO S3...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-indigo-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-200 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-indigo-600 font-mono">
                        FastAPI ingress returning HTTP 202 Accepted...
                      </p>
                    </div>
                  )}

                  {/* Submission Success Box */}
                  {submittedJobId && (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-sm">
                          Task Enqueued Successfully!
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700">
                        The job was registered in PostgreSQL and published to RabbitMQ. The distributed background worker will process the {fileCategory?.toLowerCase()} asset asynchronously.
                      </p>
                      <div className="p-2.5 rounded bg-white/80 border border-emerald-200 text-xs font-mono break-all text-slate-800">
                        Job ID: {submittedJobId}
                      </div>
                      <div className="pt-1 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/jobs/${submittedJobId}`)}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <span>Track Job Execution</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="border-emerald-300 text-emerald-800"
                        >
                          Upload Another
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <span className="font-semibold">Submission Failure</span>
                        <p>{errorMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {selectedFile && !submittedJobId && (
              <CardFooter className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  isLoading={isUploading}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Submit Task to Broker</span>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Right Column: Active Processing Pipeline Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Processing Pipeline</span>
              </CardTitle>
              <CardDescription>
                {fileCategory ? `${fileCategory} pipeline parameters` : "Multi-modal worker capabilities"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {fileCategory === "DOCUMENT" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-1">
                    <span className="font-semibold text-amber-900">PyMuPDF Document Parser</span>
                    <p className="text-amber-700 text-[11px]">
                      Extracts page count, author, and title metadata, and renders Page 1 as high-res poster preview.
                    </p>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Engine</span>
                      <span className="font-mono text-slate-800 font-medium">PyMuPDF (Fitz)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Preview Rendering</span>
                      <span className="text-emerald-600 font-medium">Page 1 @ 150 DPI</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Output Format</span>
                      <span className="font-mono text-slate-800">image/jpeg</span>
                    </div>
                  </div>
                </div>
              )}

              {fileCategory === "TABULAR" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 space-y-1">
                    <span className="font-semibold text-emerald-900">Pandas Data Profiler</span>
                    <p className="text-emerald-700 text-[11px]">
                      Computes row/column dimensions, column data types, missing value statistics, and top-row preview.
                    </p>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Engine</span>
                      <span className="font-mono text-slate-800 font-medium">Pandas & OpenPyXL</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Output Artifact</span>
                      <span className="font-mono text-slate-800">summary.json</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Null Detection</span>
                      <span className="text-emerald-600 font-medium">Per-column aggregation</span>
                    </div>
                  </div>
                </div>
              )}

              {fileCategory === "VIDEO" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 space-y-1">
                    <span className="font-semibold text-purple-900">FFmpeg Poster & Probe</span>
                    <p className="text-purple-700 text-[11px]">
                      Probes duration, resolution, codec, and fps in 1-2s and extracts a crisp poster frame at 1s.
                    </p>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Engine</span>
                      <span className="font-mono text-slate-800 font-medium">FFmpeg Subprocess</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Poster Frame</span>
                      <span className="text-purple-600 font-medium">Extracted at 1.0s</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Queue Latency</span>
                      <span className="text-emerald-600 font-medium">~1.2s (Zero blocking)</span>
                    </div>
                  </div>
                </div>
              )}

              {(!fileCategory || fileCategory === "IMAGE" || fileCategory === "UNKNOWN") && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-semibold text-slate-700">Pillow Image Optimizer</span>
                    <p className="text-slate-500 text-[11px]">
                      Generates an aspect-ratio preserving thumbnail bound inside a 500x500 box.
                    </p>
                  </div>
                  <div className="space-y-2 text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Max Boundaries</span>
                      <span className="font-mono text-slate-800 font-semibold">500 × 500 px</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Aspect Ratio</span>
                      <span className="text-emerald-600 font-medium">Preserved (thumbnail)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Output Format</span>
                      <span className="font-mono text-slate-800">image/jpeg (85% Q)</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fair Dispatch (Prefetch: 1)</span>
                </div>
                <p className="text-indigo-700">
                  Workers pull exactly 1 message at a time to prevent Head-of-Line queue starvation across fast and heavy jobs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
