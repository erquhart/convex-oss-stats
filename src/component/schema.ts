import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  githubOwners: defineTable({
    name: v.string(),
    nameNormalized: v.string(),
    stars: v.number(),
    contributorsCount: v.number(),
    updatedAt: v.number(),
  }).index("name", ["nameNormalized"]),
  githubRepos: defineTable({
    owner: v.string(),
    ownerNormalized: v.string(),
    name: v.string(),
    nameNormalized: v.string(),
    stars: v.number(),
    contributorsCount: v.number(),
    updatedAt: v.number(),
  }).index("owner_name", ["ownerNormalized", "nameNormalized"]),
});
