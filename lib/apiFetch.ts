"use client";

import { useLoadingStore } from "@/app/stores/useLoadingStore";

export async function apifetch<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const { start, stop } = useLoadingStore.getState();

  start();

  try {
    const res = await fetch(input, {
      credentials: "include",
      ...init,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `API ${res.status}: ${errorText || res.statusText}`
      );
    }

    return (await res.json()) as T;
  } finally {
    stop();
  }
}
