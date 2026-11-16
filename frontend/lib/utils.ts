import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number, decimals = 2): string {
  if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null) return "—";
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
}

export function getStatusBadgeProps(status: string) {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        label: "Completed",
      };
    case "PROCESSING":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500 animate-pulse",
        label: "Processing",
      };
    case "PENDING":
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
        label: "Pending",
      };
    case "FAILED":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
        label: "Failed",
      };
    default:
      return {
        bg: "bg-slate-100 text-slate-600 border-slate-200",
        dot: "bg-slate-400",
        label: status || "Unknown",
      };
  }
}
