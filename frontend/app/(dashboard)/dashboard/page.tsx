"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ListOrdered,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  // Query 1: System and queue stats
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ["systemStats"],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 4000,
  });

  // Query 2: Recent jobs list
  const {
    data: jobsData,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ["recentJobs"],
    queryFn: () => apiClient.listJobs({ limit: 6, offset: 0 }),
    refetchInterval: 4000,
  });

  const totalJobs = stats?.database?.total_jobs ?? 0;
  const completedJobs = stats?.database?.completed_jobs ?? 0;
  const processingJobs = stats?.database?.processing_jobs ?? 0;
  const pendingJobs = stats?.database?.pending_jobs ?? 0;
  const failedJobs = stats?.database?.failed_jobs ?? 0;
  const queueDepth = stats?.queue?.depth ?? 0;
  const consumers = stats?.queue?.consumer_count ?? 0;

  // Compute average duration from jobs with recorded times
  const completedWithDurations =
    jobsData?.items.filter((j) => j.duration_seconds !== null) || [];
  const avgDuration =
    completedWithDurations.length > 0
      ? completedWithDurations.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) /
        completedWithDurations.length
      : null;

  // Chart data for status distribution
  const statusChartData = [
    { name: "Completed", value: completedJobs, color: "#16A34A" },
    { name: "Processing", value: processingJobs, color: "#3B82F6" },
    { name: "Pending", value: pendingJobs, color: "#94A3B8" },
    { name: "Failed", value: failedJobs, color: "#DC2626" },
  ].filter((d) => d.value > 0);

  const barChartData = [
    { name: "Completed", count: completedJobs, fill: "#16A34A" },
    { name: "Processing", count: processingJobs, fill: "#3B82F6" },
    { name: "Pending", count: pendingJobs, fill: "#94A3B8" },
    { name: "Failed", count: failedJobs, fill: "#DC2626" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status of distributed workers, RabbitMQ task queue, and media transformation pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats();
              refetchJobs();
            }}
            isLoading={statsFetching}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </Button>
          <Link href="/upload">
            <Button size="sm" className="gap-2 shadow-xs">
              <UploadCloud className="w-4 h-4" />
              <span>Submit Job</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Total Ingested
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ListOrdered className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">{totalJobs}</div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Lifecycle metadata in PostgreSQL</p>
          </CardContent>
        </Card>

        {/* Completed Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Completed Tasks
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">{completedJobs}</div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Processed & uploaded to MinIO</p>
          </CardContent>
        </Card>

        {/* Queue Depth & Workers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              RabbitMQ Queue
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{queueDepth}</span>
                <span className="text-xs text-slate-500 font-medium">pending</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              {consumers} active worker {consumers === 1 ? "consumer" : "consumers"} attached
            </p>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Avg Processing Time
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {avgDuration !== null ? formatDuration(avgDuration) : "—"}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Pillow thumbnail computation latency</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Job Distribution</CardTitle>
            <CardDescription>Breakdown by current lifecycle state</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : totalJobs === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>No jobs processed yet</span>
                <Link href="/upload" className="text-indigo-600 font-medium mt-1">
                  Upload an image to start →
                </Link>
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-xs mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Done ({completedJobs})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-600">Active ({processingJobs})</span>
                  </div>
                  {failedJobs > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-slate-600">Failed ({failedJobs})</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Counts Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Processing Workload Status</CardTitle>
            <CardDescription>Live counts across pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Processing Tasks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Processing Tasks</CardTitle>
            <CardDescription>Latest media transformations submitted to the queue</CardDescription>
          </div>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <span>View All Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !jobsData?.items || jobsData.items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm space-y-3">
              <p>No media processing jobs have been submitted yet.</p>
              <Link href="/upload">
                <Button size="sm" className="gap-2">
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Your First Image</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Job ID</th>
                    <th className="py-2.5 px-3">Original File</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobsData.items.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-800">
                        {job.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                        {job.original_filename}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="status" status={job.status} />
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {formatDuration(job.duration_seconds)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
