import { components } from "./_generated/api";
import { OssStats } from "@erquhart/convex-oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["tanstack"],
  npmOrgs: ["tanstack", "tannerlinsley"],
  githubRepos: ["convex-helpers"],
  npmPackages: ["convex-helpers"],
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
