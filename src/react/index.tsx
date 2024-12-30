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
  const [currentValue, setCurrentValue] = useState(value || undefined);

  const changeCurrentValue = (v?: number) => setCurrentValue(v || undefined);

  const updateCurrentValue = useCallback(() => {
    if (!value || !nextValue || !rangeStart || !rangeEnd) {
      changeCurrentValue(value);
      return;
    }
    const diff = nextValue - value;
    const duration = rangeEnd - rangeStart;
    const rate = diff / duration;
    changeCurrentValue(Math.round(value + rate * (Date.now() - rangeStart)));
  }, [value, nextValue, rangeStart, rangeEnd]);

  // Avoid initial delay
  useEffect(() => {
    if (isInitialized) {
      return;
    }
    if (value && !currentValue) {
      changeCurrentValue(value);
      return;
    }
    if (value && nextValue && rangeStart && rangeEnd) {
      updateCurrentValue();
      setIsInitialized(true);
    }
  }, [isInitialized, value, nextValue, rangeStart, rangeEnd, currentValue]);

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
  } | null,
  { intervalMs }: { intervalMs?: number } = {}
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
    intervalMs,
  });
};

export const useGithubDependentCounter = (
  githubOwner?: {
    dependentCount: number;
    dependentCountUpdatedAt?: number;
    dependentCountPrevious?: {
      count: number;
      updatedAt: number;
    };
  } | null,
  { intervalMs }: { intervalMs?: number } = {}
) => {
  const {
    dependentCount = 0,
    dependentCountUpdatedAt = 0,
    dependentCountPrevious = { count: 0, updatedAt: 0 },
  } = githubOwner ?? {};
  const nextValue =
    dependentCount < dependentCountPrevious.count
      ? 0
      : dependentCount + (dependentCount - dependentCountPrevious.count);

  return useFakeCounter({
    value: dependentCount,
    nextValue: Math.max(dependentCount, nextValue),
    rangeStart: dependentCountPrevious.updatedAt,
    rangeEnd: dependentCountUpdatedAt,
    intervalMs,
  });
};
