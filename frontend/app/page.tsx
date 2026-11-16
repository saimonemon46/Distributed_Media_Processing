"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  Zap,
  Server,
  Database,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  Cpu,
  Workflow,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">MediaFlow</span>
              <span className="block text-[9px] uppercase font-semibold text-indigo-600 tracking-wider">
                Distributed Media Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#architecture" className="hover:text-slate-900 transition-colors">
              Architecture
            </Link>
            <Link href="#features" className="hover:text-slate-900 transition-colors">
              Capabilities
            </Link>
            <Link href="/api-docs" className="hover:text-slate-900 transition-colors">
              API Docs
            </Link>
            <a
              href="https://github.com/saimonemon46/Distributed_Media_Processing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-900 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" className="gap-2 shadow-xs">
                <span>Enter Live Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Production-Ready Distributed Computing Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Decoupled, High-Throughput <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900">
            Media Processing SaaS
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Ingest media files with sub-50ms API response times. Asynchronously offload heavy Pillow transformations to a distributed pool of RabbitMQ background workers with zero ingress thread blocking.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/upload">
            <Button size="lg" className="h-12 px-6 gap-2 text-base shadow-sm">
              <Zap className="w-4 h-4" />
              <span>Process Media Now</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="h-12 px-6 gap-2 text-base">
              <span>Explore Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Live Architecture Graphic Preview */}
        <div className="mt-16 max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-left p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-slate-500 ml-2">system-pipeline.drawio</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Verified Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-2">
                <Server className="w-4 h-4" />
                <span>1. FastAPI Ingress</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Accepts multipart file uploads, records PENDING record in PostgreSQL, and enqueues task in RabbitMQ under 50ms.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-2">
                <Workflow className="w-4 h-4" />
                <span>2. RabbitMQ Broker</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Persistent AMQP queues deliver fair-dispatch jobs (<code className="text-slate-800 font-mono text-[11px]">prefetch_count=1</code>) to idle workers.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-2">
                <Cpu className="w-4 h-4" />
                <span>3. Distributed Worker</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fetches raw bytes from MinIO, executes Pillow aspect-ratio thumbnail transformations, and marks COMPLETED in Postgres.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>4. S3 Object Storage</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dual-endpoint S3 architecture generates temporary presigned download URLs for safe client access without leaking credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for Production Resilience
          </h2>
          <p className="text-slate-600 mt-2 max-w-xl mx-auto text-sm sm:text-base">
            Every layer addresses real-world enterprise requirements from message durability to atomic database status transitions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Non-Blocking Ingress</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Returns HTTP 202 Accepted instantly. No client HTTP connection is ever held open while CPU-bound image manipulation is in progress.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Stateless Storage & S3 Presigning</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Worker containers store zero state on local disk. Raw and transformed media streams directly through MinIO with time-bound signed URLs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Workflow className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Reliable Worker Acknowledgement</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explicit AMQP basic_ack ensures tasks survive container restarts and poison payloads are cleanly captured into Postgres error logs.
            </p>
          </div>
        </div>
      </section>

      {/* Recruiter CTA Banner */}
      <section className="bg-indigo-600 text-white py-14 px-6 mt-auto">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to test real media processing?
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base max-w-xl mx-auto">
            Upload any image, monitor the asynchronous lifecycle, view real worker queue metrics, and download the resulting asset.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/upload">
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-md">
                Launch Live Demo
              </Button>
            </Link>
            <Link href="/api-docs">
              <Button variant="outline" size="lg" className="border-indigo-300 text-white hover:bg-indigo-700 font-medium">
                View API Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-700">MediaFlow</span>
            <span>— Distributed Media Processing SaaS</span>
          </div>
          <div>
            Built with Next.js, FastAPI, PostgreSQL, RabbitMQ, and MinIO.
          </div>
        </div>
      </footer>
    </div>
  );
}
