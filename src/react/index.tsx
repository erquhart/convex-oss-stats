import { useState } from "react";
import { useEffect } from "react";

const useFakeCounter = ({
  value,
  nextValue,
  startTime,
  endTime,
  intervalMs = 100,
}: {
  value?: number;
  nextValue?: number;
  startTime?: number;
  endTime?: number;
  intervalMs?: number;
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  useEffect(() => {
    if (
      typeof value !== "number" ||
      typeof nextValue !== "number" ||
      typeof startTime !== "number" ||
      typeof endTime !== "number"
    ) {
      return;
    }
    const interval = setInterval(() => {
      const diff = nextValue - value;
      const duration = endTime - startTime;
      const rate = diff / duration;
      setCurrentValue(Math.round(value + rate * (Date.now() - startTime)));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [value, nextValue, startTime, endTime, intervalMs]);
  return currentValue;
};

export const useNpmDownloadCounter = (
  npmPackageOrOrg: {
    downloadCount: number;
    dayOfWeekAverages: number[];
    updatedAt: number;
  } | null
) => {
  const { downloadCount, dayOfWeekAverages, updatedAt } = npmPackageOrOrg ?? {};
  const nextDayOfWeekAverage =
    dayOfWeekAverages?.[(new Date().getDay() + 8) % 7] ?? 0;
  return useFakeCounter({
    value: downloadCount,
    nextValue: (downloadCount ?? 0) + nextDayOfWeekAverage,
    startTime: updatedAt,
    endTime: (updatedAt ?? 0) + 1000 * 60 * 60 * 24,
  });
};
