import { components } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["get-convex"],
  npmOrgs: ["convex-dev"],
});

// Re-export functions for direct access from your convex instance
export const { sync, getGithubOwner, getNpmOrg } = ossStats.api();
