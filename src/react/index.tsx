import { useState } from "react";

import { useEffect } from "react";

const useFakeCounter = ({
  value,
  nextValue,
  startTime,
  endTime,
}: {
  value?: number;
  nextValue?: number;
  startTime?: number;
  endTime?: number;
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
    }, 100);
    return () => clearInterval(interval);
  }, [value, nextValue, startTime, endTime]);
  return currentValue;
};

export const useNpmDownloadCounter = (
  npmPackageOrOrg: {
    downloadCount: number;
    dayOfWeekAverages: number[];
    updatedAt: number;
  } | null
) => {
  return useFakeCounter({
    value: npmPackageOrOrg?.downloadCount,
    nextValue:
      (npmPackageOrOrg?.downloadCount ?? 0) +
      (npmPackageOrOrg?.dayOfWeekAverages?.[0] ?? 0),
    startTime: npmPackageOrOrg?.updatedAt,
    endTime: (npmPackageOrOrg?.updatedAt ?? 0) + 1000 * 60 * 60 * 24,
  });
};
