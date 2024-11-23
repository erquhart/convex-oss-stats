import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  githubOrgs: defineTable({
    name: v.string(),
    stars: v.number(),
    updatedAt: v.number(),
  }).index("name", ["name"]),
  githubRepos: defineTable({
    owner: v.string(),
    name: v.string(),
    stars: v.number(),
    updatedAt: v.number(),
  }).index("owner_name", ["owner", "name"]),
});
