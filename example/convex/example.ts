import { components } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["erquharterquhart", "get-convex", "tanstack"],
  npmOrgs: ["erquharterquhart", "get-convex", "tanstack"],
});

export const { sync, getGithubOwner, getNpmOrg } = ossStats.api();
