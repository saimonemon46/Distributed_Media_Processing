"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu,
  Layers,
  Server,
  Database,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Workflow,
  Radio,
  FileCode2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkersPage() {
  const {
    data: stats,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["workersMonitoringStats"],
    queryFn: () => apiClient.getStats(),
    refetchInterval: 3000, // Real-time 3s refresh
  });

  const isBrokerConnected = stats?.queue?.broker_connected ?? false;
  const isDbConnected = stats?.database?.status === "connected";
  const isStorageConnected = stats?.storage?.status === "connected";
  const consumers = stats?.queue?.consumer_count ?? 0;
  const queueDepth = stats?.queue?.depth ?? 0;
  const queueName = stats?.queue?.name ?? "media_processing_jobs";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Distributed Infrastructure & Worker Nodes
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>Live Telemetry</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status of AMQP message brokers, active worker listeners, and storage buckets.
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
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* KPI Monitoring Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Worker Consumers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Active Workers
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{consumers}</span>
                <span className="text-xs text-slate-500 font-medium">listeners</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              AMQP channel subscriptions (<code className="font-mono text-slate-700">basic_consume</code>)
            </p>
          </CardContent>
        </Card>

        {/* RabbitMQ Queue Depth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Queue Backlog
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Workflow className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{queueDepth}</span>
                <span className="text-xs text-slate-500 font-medium">messages</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Pending tasks awaiting idle worker</p>
          </CardContent>
        </Card>

        {/* In-Flight Processing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              In-Flight Jobs
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {stats?.database?.processing_jobs ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Pillow thumbnail computation active</p>
          </CardContent>
        </Card>

        {/* Completed Cumulative */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-slate-500 tracking-wider">
              Total Processed
            </CardTitle>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {stats?.database?.completed_jobs ?? 0}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Successfully stored in MinIO bucket</p>
          </CardContent>
        </Card>
      </div>

      {/* Component Health & Distributed Subsystem Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RabbitMQ Message Broker */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Workflow className="w-4 h-4 text-amber-600" />
                <span>RabbitMQ Broker</span>
              </div>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  isBrokerConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {isBrokerConnected ? "Online" : "Unreachable"}
              </span>
            </div>
            <CardDescription>AMQP 0-9-1 Queue Manager</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Queue Name:</span>
              <span className="font-mono text-slate-800">{queueName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Durability:</span>
              <span className="font-mono text-slate-800">durable=True</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Fair Dispatch QoS:</span>
              <span className="font-mono text-slate-800">prefetch_count=1</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">AMQP Heartbeat:</span>
              <span className="font-mono text-slate-800">600 seconds</span>
            </div>
          </CardContent>
        </Card>

        {/* PostgreSQL Database */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>PostgreSQL DB</span>
              </div>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  isDbConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {isDbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <CardDescription>Relational Metadata Store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Table:</span>
              <span className="font-mono text-slate-800">jobs (UUID PK)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Records:</span>
              <span className="font-mono text-slate-800">{stats?.database?.total_jobs ?? 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Completed Records:</span>
              <span className="font-mono text-emerald-600 font-semibold">{stats?.database?.completed_jobs ?? 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Failed Records:</span>
              <span className="font-mono text-rose-600 font-semibold">{stats?.database?.failed_jobs ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* MinIO / S3 Object Storage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>MinIO S3 Datastore</span>
              </div>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  isStorageConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {isStorageConnected ? "Accessible" : "Check Config"}
              </span>
            </div>
            <CardDescription>S3-Compatible Object Store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Target Bucket:</span>
              <span className="font-mono text-slate-800">{stats?.storage?.bucket ?? "media-bucket"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Raw Key Prefix:</span>
              <span className="font-mono text-slate-800">uploads/{"{id}"}/</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Result Key Prefix:</span>
              <span className="font-mono text-slate-800">processed/{"{id}"}.jpg</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Presigning Protocol:</span>
              <span className="font-mono text-slate-800">AWS Signature V4</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engineering Design Deep Dive Card */}
      <Card>
        <CardHeader>
          <CardTitle>Distributed Architecture Guarantees</CardTitle>
          <CardDescription>
            Key mechanisms ensuring scalability, fault tolerance, and message reliability
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Fair Dispatch (prefetch_count=1)</span>
            </h4>
            <p>
              RabbitMQ basic_qos ensures workers are not overloaded with batch deliveries. Each worker instance handles exactly one media asset at a time, preventing uneven CPU starvation across nodes.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Explicit Acknowledgement (basic_ack)</span>
            </h4>
            <p>
              Workers acknowledge tasks only after output storage is committed or error handling is finalized. If a worker container crashes during processing, RabbitMQ re-queues the message automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
