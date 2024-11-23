import { internalMutation, query, mutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";
const ossStats = new OssStats(components.ossStats);

export const { sync } = ossStats.api();
