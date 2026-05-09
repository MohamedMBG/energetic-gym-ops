import { useEffect, useState } from "react";

/**
 * Runs the loader on the client only (after hydration).
 * Returns the loader value, or the fallback during SSR / first paint.
 */
export function useClientData<T>(loader: () => T, fallback: T, deps: unknown[] = []): [T, () => void] {
  const [data, setData] = useState<T>(fallback);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(loader());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return [data, () => setTick((t) => t + 1)];
}
