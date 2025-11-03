import { components } from "./_generated/api";
import { OssStats } from "@erquhart/convex-oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["tanstack"],
  npmOrgs: ["tanstack"],
});

// Re-export functions for direct access from your convex instance
export const { sync, clearAndSync, getGithubOwner, getNpmOrg } = ossStats.api();
