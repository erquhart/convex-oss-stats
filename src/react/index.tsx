import { useCallback, useState, useEffect } from "react";

const useFakeCounter = ({
  value,
  nextValue,
  rangeStart,
  rangeEnd,
  intervalMs = 1000,
}: {
  value?: number;
  nextValue?: number;
  rangeStart?: number;
  rangeEnd?: number;
  intervalMs?: number;
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const updateCurrentValue = useCallback(() => {
    if (
      typeof value !== "number" ||
      typeof nextValue !== "number" ||
      typeof rangeStart !== "number" ||
      typeof rangeEnd !== "number"
    ) {
      setCurrentValue(value);
      return;
    }
    const diff = nextValue - value;
    const duration = rangeEnd - rangeStart;
    const rate = diff / duration;
    setCurrentValue(Math.round(value + rate * (Date.now() - rangeStart)));
  }, [value, nextValue, rangeStart, rangeEnd]);

  // Avoid initial delay
  useEffect(() => {
    if (isInitialized) {
      return;
    }
    if (typeof value === "number" && typeof currentValue !== "number") {
      setCurrentValue(value);
      return;
    }
    if (typeof value === "number" && typeof nextValue === "number") {
      setCurrentValue(nextValue);
      setIsInitialized(true);
    }
  }, [isInitialized, value, nextValue, currentValue]);

  useEffect(() => {
    const interval = setInterval(updateCurrentValue, intervalMs);
    return () => {
      clearInterval(interval);
    };
  }, [updateCurrentValue, intervalMs]);
  return currentValue;
};

export const useNpmDownloadCounter = (
  npmPackageOrOrg?: {
    downloadCount: number;
    dayOfWeekAverages: number[];
    downloadCountUpdatedAt: number;
  } | null
) => {
  const { downloadCount, dayOfWeekAverages, downloadCountUpdatedAt } =
    npmPackageOrOrg ?? {};
  const nextDayOfWeekAverage =
    dayOfWeekAverages?.[(new Date().getDay() + 8) % 7] ?? 0;
  return useFakeCounter({
    value: downloadCount,
    nextValue: (downloadCount ?? 0) + Math.round(nextDayOfWeekAverage * 0.8),
    rangeStart: downloadCountUpdatedAt,
    rangeEnd: (downloadCountUpdatedAt ?? 0) + 1000 * 60 * 60 * 24,
  });
};
