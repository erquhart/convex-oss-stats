import { useCallback, useState } from "react";
import { useEffect } from "react";

const useFakeCounter = ({
  value,
  nextValue,
  startTime,
  endTime,
  intervalMs = 1000,
}: {
  value?: number;
  nextValue?: number;
  startTime?: number;
  endTime?: number;
  intervalMs?: number;
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  console.log("useFakeCounter", {
    value,
    nextValue,
    startTime,
    endTime,
    currentValue,
  });

  const updateCurrentValue = useCallback(() => {
    if (
      typeof value !== "number" ||
      typeof nextValue !== "number" ||
      typeof startTime !== "number" ||
      typeof endTime !== "number"
    ) {
      setCurrentValue(value);
      return;
    }
    const diff = nextValue - value;
    const duration = endTime - startTime;
    const rate = diff / duration;
    setCurrentValue(Math.round(value + rate * (Date.now() - startTime)));
  }, [value, nextValue, startTime, endTime]);

  useEffect(() => {
    // avoid initial delay
    updateCurrentValue();
  }, []);

  useEffect(() => {
    const interval = setInterval(updateCurrentValue, intervalMs);
    return () => {
      clearInterval(interval);
    };
  }, [updateCurrentValue, intervalMs]);
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

export const useGithubDependentCounter = (
  githubRepoOrOwner: {
    dependentCount: number;
    dependentCountPrevious?: {
      count: number;
      updatedAt: number;
    };
    updatedAt: number;
  } | null
) => {
  const { dependentCount, dependentCountPrevious, updatedAt } =
    githubRepoOrOwner ?? {};
  return useFakeCounter({
    value: dependentCount,
    nextValue:
      dependentCount &&
      dependentCountPrevious?.count &&
      dependentCountPrevious.count < dependentCount
        ? Math.round(
            (dependentCount + dependentCount - dependentCountPrevious.count) *
              0.8
          )
        : undefined,
    startTime: updatedAt,
    endTime:
      updatedAt && dependentCountPrevious?.updatedAt
        ? updatedAt + updatedAt - dependentCountPrevious.updatedAt
        : undefined,
  });
};
