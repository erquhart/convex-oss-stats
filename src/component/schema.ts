import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  githubOwners: defineTable({
    name: v.string(),
    nameNormalized: v.string(),
    starCount: v.number(),
    contributorCount: v.number(),
    dependentCount: v.number(),
    updatedAt: v.number(),

    // deprecated
    dependentCountPrevious: v.optional(v.any()),
  }).index("name", ["nameNormalized"]),
  githubRepos: defineTable({
    owner: v.string(),
    ownerNormalized: v.string(),
    name: v.string(),
    nameNormalized: v.string(),
    starCount: v.number(),
    contributorCount: v.number(),
    dependentCount: v.number(),
    updatedAt: v.number(),

    // deprecated
    dependentCountPrevious: v.optional(v.any()),
  })
    .index("owner", ["ownerNormalized"])
    .index("owner_name", ["ownerNormalized", "nameNormalized"]),
  npmOrgs: defineTable({
    name: v.string(),
    downloadCount: v.number(),
    downloadCountUpdatedAt: v.optional(v.number()),
    dayOfWeekAverages: v.array(v.number()),
    updatedAt: v.number(),
  }).index("name", ["name"]),
  npmPackages: defineTable({
    org: v.optional(v.string()),
    name: v.string(),
    downloadCount: v.number(),
    downloadCountUpdatedAt: v.optional(v.number()),
    dayOfWeekAverages: v.array(v.number()),
    updatedAt: v.number(),
  })
    .index("org", ["org"])
    .index("name", ["name"]),
});
