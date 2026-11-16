import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDate,
  formatDuration,
  getStatusBadgeProps,
} from "@/lib/utils";

describe("Utility Functions", () => {
  describe("formatBytes", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(undefined)).toBe("0 Bytes");
    });

    it("formats KB, MB, and GB accurately", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024 * 3.5)).toBe("3.5 MB");
      expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2 GB");
    });
  });

  describe("formatDuration", () => {
    it("returns dash for null or undefined durations", () => {
      expect(formatDuration(null)).toBe("—");
      expect(formatDuration(undefined)).toBe("—");
    });

    it("formats sub-second durations in milliseconds", () => {
      expect(formatDuration(0.45)).toBe("450ms");
      expect(formatDuration(0.05)).toBe("50ms");
    });

    it("formats multi-second durations with two decimals", () => {
      expect(formatDuration(1.234)).toBe("1.23s");
      expect(formatDuration(12.5)).toBe("12.50s");
    });
  });

  describe("formatDate", () => {
    it("handles null and undefined dates gracefully", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
    });

    it("formats valid ISO timestamp strings", () => {
      const formatted = formatDate("2026-11-16T15:30:00Z");
      expect(formatted).toContain("Nov");
      expect(formatted).toContain("2026");
    });
  });

  describe("getStatusBadgeProps", () => {
    it("returns correct styling for COMPLETED", () => {
      const props = getStatusBadgeProps("COMPLETED");
      expect(props.label).toBe("Completed");
      expect(props.bg).toContain("emerald");
    });

    it("returns correct styling for PROCESSING", () => {
      const props = getStatusBadgeProps("PROCESSING");
      expect(props.label).toBe("Processing");
      expect(props.dot).toContain("animate-pulse");
    });

    it("returns correct styling for PENDING", () => {
      const props = getStatusBadgeProps("PENDING");
      expect(props.label).toBe("Pending");
      expect(props.bg).toContain("slate");
    });

    it("returns correct styling for FAILED", () => {
      const props = getStatusBadgeProps("FAILED");
      expect(props.label).toBe("Failed");
      expect(props.bg).toContain("rose");
    });
  });
});
