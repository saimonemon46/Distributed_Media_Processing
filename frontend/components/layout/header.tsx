"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UploadCloud, ChevronRight, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();

  // Create human-friendly breadcrumbs
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace("-", " ");
    return { href, label };
  });

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/dashboard" className="hover:text-slate-900 transition-colors">
          MediaFlow
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href={crumb.href}
              className={
                idx === breadcrumbs.length - 1
                  ? "text-slate-900 font-semibold"
                  : "hover:text-slate-900 transition-colors"
              }
            >
              {crumb.label}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Actions and Workspace Badge */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-medium">Live Recruiter Demo Workspace</span>
        </div>

        <Link href="/upload">
          <Button size="sm" className="gap-2">
            <UploadCloud className="w-4 h-4" />
            <span>Process New Media</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
