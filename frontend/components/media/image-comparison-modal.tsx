"use client";

import React, { useState } from "react";
import { X, Download, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalUrl: string | null;
  processedUrl: string | null;
  filename: string;
}

export function ImageComparisonModal({
  isOpen,
  onClose,
  originalUrl,
  processedUrl,
  filename,
}: ImageComparisonModalProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleSliderMove = (clientX: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleSliderMove(e.clientX, rect);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleSliderMove(touch.clientX, rect);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              Interactive Asset Comparison
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-md">
              {filename}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {processedUrl && (
              <a href={processedUrl} target="_blank" rel="noopener noreferrer" download>
                <Button size="sm" className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Result</span>
                </Button>
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body: Interactive Slider */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          {originalUrl && processedUrl ? (
            <div className="w-full max-w-2xl space-y-4">
              <div
                className="relative h-96 w-full rounded-xl overflow-hidden select-none cursor-ew-resize bg-slate-900 border border-slate-200 shadow-inner"
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
              >
                {/* Background image: Original */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Foreground image: Processed (Clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={processedUrl}
                    alt="Processed"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>

                {/* Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-indigo-600 shadow-md flex items-center justify-center text-xs font-bold border border-slate-300">
                    ↔
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded backdrop-blur-xs">
                  Processed (500x500 JPEG)
                </div>
                <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded backdrop-blur-xs">
                  Original Asset
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Drag slider left/right to compare</span>
                <span className="font-mono">{Math.round(sliderPosition)}% split</span>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <p>Asset comparison requires both original and processed versions to be available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
