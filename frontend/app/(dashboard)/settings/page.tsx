"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  RotateCcw,
  Sparkles,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getApiBaseUrl, setApiBaseUrl, apiClient } from "@/lib/api-client";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
  }, []);

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestErrorMessage(null);
    setTestLatency(null);

    const start = performance.now();
    try {
      // Temporarily test current input
      const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/health`);
      const end = performance.now();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.status === "Healthy" || data.status === "ok") {
        setTestLatency(Math.round(end - start));
        setTestStatus("success");
      } else {
        throw new Error(`Unexpected health payload: ${JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      setTestStatus("error");
      setTestErrorMessage(err instanceof Error ? err.message : "Failed to connect to API server");
    }
  };

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    setApiBaseUrl("");
    setApiUrl("/api/backend");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Environment & System Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure API connection endpoints, test service latency, and inspect runtime preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Backend Connection Endpoint */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              <CardTitle>API Ingress Endpoint</CardTitle>
            </div>
            <CardDescription>
              Specify the target FastAPI URL. This allows dynamically switching between local Docker containers and external cloud deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Backend API Base URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={apiUrl}
                  onChange={(e) => {
                    setApiUrl(e.target.value);
                    setTestStatus("idle");
                  }}
                  placeholder="/api/backend"
                  className="font-mono text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  isLoading={testStatus === "testing"}
                  className="gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test Connection</span>
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Default: <code className="font-mono">/api/backend</code> (proxied via Next.js to FastAPI on port 8000), or your custom deployed URL.
              </p>
            </div>

            {/* Test Connection Results */}
            {testStatus === "success" && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Backend Connected Successfully</span>
                </div>
                {testLatency !== null && (
                  <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    Latency: {testLatency}ms
                  </span>
                )}
              </div>
            )}

            {testStatus === "error" && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Connection Failed</span>
                </div>
                <p className="text-[11px] text-rose-700">{testErrorMessage}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs text-slate-500">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </Button>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </span>
              )}
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Runtime Worker Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Runtime Engine Parameters</CardTitle>
            <CardDescription>Verified system properties for the processing pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">Aspect Ratio Strategy</p>
                <p className="text-[11px] text-slate-500">Preserves original dimensions while fitting within bounding box</p>
              </div>
              <Badge variant="secondary">Pillow Thumbnail Method</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">Target Resolution</p>
                <p className="text-[11px] text-slate-500">Maximum pixel width and height boundaries</p>
              </div>
              <span className="font-mono text-slate-800 font-semibold">500 × 500 px</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">S3 Presigned URL TTL</p>
                <p className="text-[11px] text-slate-500">Time-to-live for generated browser download links</p>
              </div>
              <span className="font-mono text-slate-800 font-semibold">3600 seconds (1 hour)</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-slate-800">Worker AMQP Prefetch</p>
                <p className="text-[11px] text-slate-500">Fair dispatch configuration to distribute loads across nodes</p>
              </div>
              <span className="font-mono text-slate-800 font-semibold">prefetch_count = 1</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
