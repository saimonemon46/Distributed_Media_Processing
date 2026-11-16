"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  FileText,
  Table as TableIcon,
  Video as VideoIcon,
  Download,
  SlidersHorizontal,
  UploadCloud,
  RefreshCw,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDuration } from "@/lib/utils";
import { ImageComparisonModal } from "@/components/media/image-comparison-modal";
import { Job } from "@/types";

export default function MediaLibraryPage() {
  const [selectedJobForCompare, setSelectedJobForCompare] = useState<Job | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("ALL");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["mediaLibraryCompletedJobs"],
    queryFn: () => apiClient.listJobs({ limit: 50, status: "COMPLETED" }),
    refetchInterval: 5000,
  });

  const allJobs = data?.items || [];
  const filteredJobs = selectedTab === "ALL"
    ? allJobs
    : allJobs.filter((j) => (j.media_type || "IMAGE") === selectedTab);

  const renderCardThumbnail = (job: Job) => {
    const type = job.media_type || "IMAGE";
    const previewSrc = job.preview_url || job.download_url;

    if (type === "IMAGE" || type === "DOCUMENT" || type === "VIDEO") {
      if (previewSrc) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={job.original_filename}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        );
      }
    }

    if (type === "TABULAR") {
      return (
        <div className="flex flex-col items-center justify-center gap-2 text-emerald-700">
          <TableIcon className="w-10 h-10" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">
            {job.meta?.rows ? `${job.meta.rows} Rows` : "Data Table"}
          </span>
        </div>
      );
    }

    return (
      <div className="text-slate-400 flex flex-col items-center gap-1 text-xs">
        <ImageIcon className="w-8 h-8" />
        <span>No Preview</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Multi-Modal Media Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, inspect, and download completed media outputs stored across MinIO buckets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </Button>
          <Link href="/upload">
            <Button size="sm" className="gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>Process New File</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        {[
          { label: "All Formats", value: "ALL" },
          { label: "Images", value: "IMAGE" },
          { label: "Documents", value: "DOCUMENT" },
          { label: "Tabular Datasets", value: "TABULAR" },
          { label: "Videos", value: "VIDEO" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              selectedTab === tab.value
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Media Assets */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <Skeleton className="h-44 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">No Processed Assets in this Category</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                Completed multi-modal transformations will appear here automatically with secure presigned download links.
              </p>
            </div>
            <Link href="/upload">
              <Button size="sm" className="gap-2">
                <UploadCloud className="w-4 h-4" />
                <span>Upload Media to Begin</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="overflow-hidden group hover:shadow-md transition-all">
              {/* Image Preview Box */}
              <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {renderCardThumbnail(job)}

                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="outline" className="text-[10px] bg-white/90 font-mono uppercase">
                    {job.media_type || "IMAGE"}
                  </Badge>
                  <Badge variant="status" status="COMPLETED" className="shadow-xs" />
                </div>
              </div>

              {/* Card Metadata */}
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4
                    className="font-semibold text-slate-900 text-sm truncate"
                    title={job.original_filename}
                  >
                    {job.original_filename}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                    <span>{formatDate(job.completed_at)}</span>
                    {job.duration_seconds !== null && (
                      <>
                        <span>•</span>
                        <span className="text-slate-700">{formatDuration(job.duration_seconds)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pipeline:</span>
                    <span className="font-mono text-slate-700 font-medium">
                      {job.media_type === "DOCUMENT" && "PyMuPDF Poster"}
                      {job.media_type === "TABULAR" && "Pandas Profiler"}
                      {job.media_type === "VIDEO" && "FFmpeg Poster"}
                      {(!job.media_type || job.media_type === "IMAGE") && "500x500 JPEG"}
                    </span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span className="text-slate-400">Output:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[140px]" title={job.output_key || ""}>
                      {job.output_key}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {(!job.media_type || job.media_type === "IMAGE") && job.original_url && job.download_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobForCompare(job)}
                      className="flex-1 text-xs gap-1.5 h-8"
                      title="Compare original vs processed thumbnail"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Compare</span>
                    </Button>
                  )}

                  {job.download_url && (
                    <a
                      href={job.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className={(!job.media_type || job.media_type === "IMAGE") && job.original_url ? "" : "flex-1"}
                    >
                      <Button
                        size="sm"
                        className="w-full text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </Button>
                    </a>
                  )}

                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800" title="View Job Details">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Modal for Images */}
      {selectedJobForCompare && (
        <ImageComparisonModal
          isOpen={!!selectedJobForCompare}
          onClose={() => setSelectedJobForCompare(null)}
          originalUrl={selectedJobForCompare.original_url}
          processedUrl={selectedJobForCompare.download_url}
          filename={selectedJobForCompare.original_filename}
        />
      )}
    </div>
  );
}
