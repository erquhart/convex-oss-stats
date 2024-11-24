import { components } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["erquhart", "get-convex", "tanstack"],
});

export const { sync, getGithubOwner } = ossStats.api();
