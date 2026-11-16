"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  UploadCloud,
  FileText,
  Activity,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

export default function AnalyticsPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["analyticsStats"],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 5000,
  });

  const {
    data: jobsData,
    isLoading: jobsLoading,
  } = useQuery({
    queryKey: ["analyticsJobs"],
    queryFn: () => apiClient.listJobs({ limit: 50 }),
    refetchInterval: 5000,
  });

  const total = stats?.database?.total_jobs ?? 0;
  const completed = stats?.database?.completed_jobs ?? 0;
  const failed = stats?.database?.failed_jobs ?? 0;
  const processing = stats?.database?.processing_jobs ?? 0;
  const pending = stats?.database?.pending_jobs ?? 0;

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;

  // Real duration data points from jobs
  const completedJobs =
    jobsData?.items.filter((j) => j.status === "COMPLETED" && j.duration_seconds !== null) || [];

  const avgDuration =
    completedJobs.length > 0
      ? completedJobs.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) /
        completedJobs.length
      : null;

  // Duration timeline (ordered oldest to newest)
  const durationTrends = [...completedJobs]
    .reverse()
    .slice(-15)
    .map((j, idx) => ({
      index: `#${idx + 1}`,
      filename: j.original_filename,
      duration: j.duration_seconds || 0,
    }));

  const pieData = [
    { name: "Successful", value: completed, color: "#16A34A" },
    { name: "Failed", value: failed, color: "#DC2626" },
    { name: "In Flight", value: processing + pending, color: "#3B82F6" },
  ].filter((d) => d.value > 0);

  const barData = [
    { stage: "Completed", count: completed, fill: "#16A34A" },
    { stage: "In Progress", count: processing, fill: "#3B82F6" },
    { stage: "Queued", count: pending, fill: "#94A3B8" },
    { stage: "Failed", count: failed, fill: "#DC2626" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pipeline Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Execution metrics, throughput reliability, and latency telemetry computed from live PostgreSQL records.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Success Rate
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">{successRate}%</div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">{completed} of {total} total tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Failure Rate
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-rose-600">{failureRate}%</div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">{failed} failed tasks logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Average Processing Duration
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
            <p className="text-[11px] text-slate-500 mt-1">From started_at to completed_at</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Pipeline State
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-indigo-600">
                {stats?.queue?.broker_connected ? "Operational" : "Degraded"}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">RabbitMQ AMQP Broker Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Duration Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Processing Duration Telemetry (Recent Completed Jobs)</CardTitle>
            <CardDescription>
              Time taken by Pillow workers to resize and store each media asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : durationTrends.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>No duration metrics available yet</span>
                <Link href="/upload" className="text-indigo-600 font-medium mt-1">
                  Upload an image to generate telemetry →
                </Link>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={durationTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="index" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      unit="s"
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [
                        `${typeof val === "number" ? val.toFixed(2) : val}s`,
                        "Duration",
                      ]}
                      labelFormatter={(label, items) => {
                        const item = items[0]?.payload;
                        return item ? `${item.index}: ${item.filename}` : label;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#4F46E5" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volume by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Task Volume by Lifecycle Stage</CardTitle>
            <CardDescription>Current distribution of jobs across all states</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="stage" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reliability Ratio Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Outcome Reliability</CardTitle>
            <CardDescription>Ratio of completed vs failed transformations</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : total === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                No job outcomes to display yet.
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-xs mt-1">
                  <span className="text-emerald-700 font-medium">Completed: {completed}</span>
                  <span className="text-rose-700 font-medium">Failed: {failed}</span>
                  <span className="text-blue-700 font-medium">In Queue: {processing + pending}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
