"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ListOrdered,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  AlertCircle,
  FileImage,
  FileText,
  Table as TableIcon,
  Video as VideoIcon,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDuration } from "@/lib/utils";

function renderMediaIcon(mediaType?: string) {
  switch (mediaType) {
    case "DOCUMENT":
      return <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    case "TABULAR":
      return <TableIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    case "VIDEO":
      return <VideoIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
    default:
      return <FileImage className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  }
}

function getOperationSummary(mediaType?: string) {
  switch (mediaType) {
    case "DOCUMENT":
      return "PyMuPDF Page 1 Poster";
    case "TABULAR":
      return "Pandas Schema Profile";
    case "VIDEO":
      return "FFmpeg Poster & Probe";
    default:
      return "Pillow 500x500 JPEG";
  }
}

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const timeout = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  };

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey: ["jobsList", page, statusFilter, mediaTypeFilter, debouncedSearch],
    queryFn: () =>
      apiClient.listJobs({
        limit: pageSize,
        offset: page * pageSize,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      }),
    refetchInterval: 3500, // Poll active jobs
  });

  const rawItems = data?.items ?? [];
  const items = mediaTypeFilter
    ? rawItems.filter((j) => (j.media_type || "IMAGE") === mediaTypeFilter)
    : rawItems;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Media Processing Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track multi-modal task execution across distributed workers, state transitions, and download outputs.
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
              <span>New Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { label: "All", value: "" },
                { label: "Pending", value: "PENDING" },
                { label: "Processing", value: "PROCESSING" },
                { label: "Completed", value: "COMPLETED" },
                { label: "Failed", value: "FAILED" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setStatusFilter(s.value);
                    setPage(0);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === s.value
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media Format Filter Buttons */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
            <span className="text-slate-500 font-medium mr-1">Format:</span>
            {[
              { label: "All Formats", value: "" },
              { label: "Images", value: "IMAGE" },
              { label: "Documents", value: "DOCUMENT" },
              { label: "Tabular", value: "TABULAR" },
              { label: "Video", value: "VIDEO" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setMediaTypeFilter(f.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  mediaTypeFilter === f.value
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-rose-600 text-sm space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold">Failed to fetch jobs from API</p>
              <p className="text-xs text-slate-500">
                {error instanceof Error ? error.message : "Ensure FastAPI server is running"}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <ListOrdered className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">No jobs found matching criteria</p>
              <p className="text-xs text-slate-400">
                Submit an image, document, dataset, or video upload to generate tasks in the pipeline.
              </p>
              <Link href="/upload">
                <Button size="sm" className="mt-2">
                  Upload Media
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-4">Original Filename</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Operation</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-900 font-medium">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="hover:text-indigo-600 underline decoration-slate-300 underline-offset-2"
                        >
                          {job.id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[220px] truncate">
                        <div className="flex items-center gap-1.5">
                          {renderMediaIcon(job.media_type)}
                          <span className="truncate">{job.original_filename}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase">
                          {job.media_type || "IMAGE"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="status" status={job.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {getOperationSummary(job.media_type)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {formatDuration(job.duration_seconds)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.download_url && (
                            <a
                              href={job.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              title="Download output artifact"
                            >
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-800">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          )}
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1">
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <span className="font-semibold text-slate-800">{page + 1}</span> of{" "}
                <span className="font-semibold text-slate-800">{totalPages}</span> ({total} total jobs)
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-7 px-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
