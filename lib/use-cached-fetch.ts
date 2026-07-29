import { useEffect, useState, useRef } from 'react';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 60 seconds cache

/**
 * Custom hook for cached API fetching
 * Reduces redundant API calls within the cache duration
 */
export function useCachedFetch<T>(
  url: string,
  options?: {
    skipCache?: boolean;
    cacheDuration?: number;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Check cache first
        const cached = cache.get(url);
        const now = Date.now();
        const cacheDuration = options?.cacheDuration ?? CACHE_DURATION;

        if (!options?.skipCache && cached && now - cached.timestamp < cacheDuration) {
          if (isMountedRef.current) {
            setData(cached.data);
            setIsLoading(false);
          }
          return;
        }

        // Fetch from API
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        // Store in cache
        cache.set(url, { data: result, timestamp: now });

        if (isMountedRef.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [url, options?.skipCache, options?.cacheDuration]);

  return { data, error, isLoading };
}

/**
 * Clear cache for a specific URL or all cache
 */
export function clearCache(url?: string) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}
