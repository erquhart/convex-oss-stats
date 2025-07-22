import { components } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["tanstack"],
  npmOrgs: ["tanstack"],
  githubRepos: ["get-convex/convex-helpers"],
  npmPackages: ["@convex-dev/convex-helpers"],
});

// Re-export functions for direct access from your convex instance
export const {
  sync,
  clearAndSync,
  getGithubOwner,
  getNpmOrg,
  getGithubRepo,
  getNpmPackage,
} = ossStats.api();
