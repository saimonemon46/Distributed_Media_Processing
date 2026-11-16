import * as React from "react";
import { cn, getStatusBadgeProps } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "status" | "outline" | "secondary";
  status?: string;
}

export function Badge({
  className,
  variant = "default",
  status,
  children,
  ...props
}: BadgeProps) {
  if (variant === "status" && status) {
    const { bg, dot, label } = getStatusBadgeProps(status);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
          bg,
          className
        )}
        {...props}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
        {children || label}
      </span>
    );
  }

  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent";
  const variants = {
    default: "bg-indigo-50 text-indigo-700 border-indigo-200",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    outline: "border-slate-300 text-slate-700 bg-white",
    status: "",
  };

  return (
    <span
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
