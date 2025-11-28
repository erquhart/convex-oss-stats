import { useCallback, useState, useEffect } from "react";

const INTERVAL_MS_MIN = 100;
const INTERVAL_MS_MAX = 1000;
const MAX_CHANGE_PER_SECOND = 15;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const useFakeCounter = ({
  value,
  nextValue,
  rangeStart,
  rangeEnd,
  intervalMs: intervalMsOpt,
}: {
  value?: number;
  nextValue?: number;
  rangeStart?: number;
  rangeEnd?: number;
  intervalMs?: number;
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || undefined);
  const [intervalMs, setIntervalMs] = useState(
    intervalMsOpt || INTERVAL_MS_MAX,
  );
  const changeCurrentValue = (v?: number) => setCurrentValue(v || undefined);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const updateCurrentValue = useCallback(() => {
    if (!value || !nextValue || !rangeStart || !rangeEnd) {
      changeCurrentValue(value);
      return;
    }
    const diff = nextValue - value;
    const duration = rangeEnd - rangeStart;
    const rate = diff / duration;
    const currentValue = Math.round(value + rate * (Date.now() - rangeStart));
    changeCurrentValue(currentValue);

    // NumberFlow continuous updates work best at lower intervals, so we
    // optimize for this if no explicit interval is provided.
    if (!intervalMsOpt) {
      const changePerSecond =
        value +
        Math.round(rate * (Date.now() - rangeStart + 1000) - currentValue);
      const nextIntervalMs = clamp(
        Math.round(1000 / (changePerSecond / MAX_CHANGE_PER_SECOND)),
        INTERVAL_MS_MIN,
        INTERVAL_MS_MAX,
      );
      setIntervalMs((state) => {
        const diff = Math.abs(state - nextIntervalMs);
        return diff < 50 ? state : nextIntervalMs;
      });
    }
  }, [value, nextValue, rangeStart, rangeEnd]);

  // Avoid initial delay
  useEffect(() => {
    if (isInitialized) {
      return;
    }
    if (value && !currentValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  return { count: currentValue, intervalMs };
};

export const useNpmDownloadCounter = (
  npmPackageOrOrg?: {
    downloadCount: number;
    dayOfWeekAverages: number[];
    downloadCountUpdatedAt: number;
  } | null,
  { intervalMs }: { intervalMs?: number } = {},
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
  { intervalMs }: { intervalMs?: number } = {},
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
