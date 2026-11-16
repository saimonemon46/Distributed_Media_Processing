"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  UploadCloud,
  ListOrdered,
  Image as ImageIcon,
  Cpu,
  BarChart3,
  FileCode2,
  Settings,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload Media", href: "/upload", icon: UploadCloud },
  { label: "Processing Jobs", href: "/jobs", icon: ListOrdered },
  { label: "Media Library", href: "/media-library", icon: ImageIcon },
  { label: "Workers & Queue", href: "/workers", icon: Cpu },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "API Reference", href: "/api-docs", icon: FileCode2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const { data: healthData, isError, isLoading } = useQuery({
    queryKey: ["healthCheck"],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 10000,
  });

  const isHealthy = !isError && (healthData?.status === "Healthy" || healthData?.status === "ok");

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">MediaFlow</span>
            <span className="block text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">
              Distributed Engine
            </span>
          </div>
        </Link>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
          v1.0
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Platform
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Backend Infrastructure Connection Status */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">FastAPI Engine</span>
            {isLoading ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Connecting...
              </span>
            ) : isHealthy ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Disconnected
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>Broker: RabbitMQ</span>
            <span>S3: MinIO</span>
          </div>

          <a
            href="https://github.com/saimonemon46/Distributed_Media_Processing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-[11px] text-indigo-600 hover:text-indigo-800 font-medium pt-1 border-t border-slate-100"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );
}
