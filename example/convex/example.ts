import { internalMutation, query, mutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["erquhart", "get-convex", "tanstack"],
});

export const { sync, getGithubOwnerStars } = ossStats.api();
