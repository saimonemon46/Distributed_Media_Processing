import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  apiClient,
  ApiError,
  getApiBaseUrl,
  setApiBaseUrl,
} from "@/lib/api-client";

describe("API Client & Error Handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Base URL Resolution", () => {
    it("returns default API base URL when no override is set in node", () => {
      const url = getApiBaseUrl();
      expect(url).toMatch(/^https?:\/\/|^\/api\/backend/);
    });

    it("allows custom base URL override via localStorage in browser", () => {
      const mockStorage: Record<string, string> = {};
      vi.stubGlobal("window", {});
      vi.stubGlobal("localStorage", {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
        },
      });

      setApiBaseUrl("http://localhost:8001/");
      expect(getApiBaseUrl()).toBe("http://localhost:8001");

      setApiBaseUrl("");
      expect(getApiBaseUrl()).toBe("/api/backend");

      vi.unstubAllGlobals();
    });
  });

  describe("API Calls", () => {
    it("handles successful health check response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: "Healthy" }),
        })
      );

      const res = await apiClient.getHealth();
      expect(res.status).toBe("Healthy");
      vi.unstubAllGlobals();
    });

    it("throws ApiError with server detail when request fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ detail: "Job with ID not found" }),
        })
      );

      await expect(apiClient.getJob("non-existent-id")).rejects.toThrow(
        "Job with ID not found"
      );
      vi.unstubAllGlobals();
    });

    it("correctly appends query parameters for listJobs", async () => {
      let requestedUrl = "";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          requestedUrl = url;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ total: 1, limit: 10, offset: 0, items: [] }),
          });
        })
      );

      await apiClient.listJobs({ limit: 10, offset: 20, status: "COMPLETED", search: "sample" });
      expect(requestedUrl).toContain("limit=10");
      expect(requestedUrl).toContain("offset=20");
      expect(requestedUrl).toContain("status=COMPLETED");
      expect(requestedUrl).toContain("search=sample");
      vi.unstubAllGlobals();
    });
  });
});
