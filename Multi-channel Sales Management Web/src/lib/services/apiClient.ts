const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000/api/v1";

export interface BackendHealth {
  status: string;
  database: string;
  postgres_version?: string;
  connected: boolean;
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(`http://localhost:8000/healthcheck`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      return { ...data, connected: true };
    }
  } catch (err) {
    // API server offline
  }
  return { status: "offline", database: "disconnected", connected: false };
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`[API Client] Failed to fetch ${endpoint}`, e);
  }
  return null;
}
