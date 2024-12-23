import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  githubOwners: defineTable({
    name: v.string(),
    nameNormalized: v.string(),
    starCount: v.number(),
    contributorCount: v.number(),
    dependentCount: v.number(),
    dependentCountPrevious: v.optional(
      v.object({
        count: v.number(),
        updatedAt: v.number(),
      })
    ),
    dependentCountComparison: v.optional(
      v.object({
        count: v.number(),
        updatedAt: v.number(),
      })
    ),
    updatedAt: v.number(),
  }).index("name", ["nameNormalized"]),
  githubRepos: defineTable({
    owner: v.string(),
    ownerNormalized: v.string(),
    name: v.string(),
    nameNormalized: v.string(),
    starCount: v.number(),
    contributorCount: v.number(),
    dependentCount: v.number(),
    dependentCountComparison: v.optional(
      v.object({
        count: v.number(),
        updatedAt: v.number(),
      })
    ),
    dependentCountPrevious: v.optional(
      v.object({
        count: v.number(),
        updatedAt: v.number(),
      })
    ),
    updatedAt: v.number(),
  }).index("owner_name", ["ownerNormalized", "nameNormalized"]),
  npmOrgs: defineTable({
    name: v.string(),
    downloadCount: v.number(),
    dayOfWeekAverages: v.array(v.number()),
    updatedAt: v.number(),
  }).index("name", ["name"]),
  npmPackages: defineTable({
    name: v.string(),
    downloadCount: v.number(),
    dayOfWeekAverages: v.array(v.number()),
    updatedAt: v.number(),
  }).index("name", ["name"]),
});
