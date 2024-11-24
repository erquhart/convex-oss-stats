import { ConvexError, v } from "convex/values";
import { Octokit } from "octokit";
import { Crons } from "@convex-dev/crons";
import { action, mutation, query } from "./_generated/server";
import { api, components } from "./_generated/api";

const crons = new Crons(components.crons);

export const updateGithubStars = mutation({
  args: {
    repos: v.array(
      v.object({
        owner: v.string(),
        name: v.string(),
        stars: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const repo of args.repos) {
      const existing = await ctx.db
        .query("githubRepos")
        .withIndex("owner_name", (q) =>
          q
            .eq("ownerNormalized", repo.owner.toLowerCase())
            .eq("nameNormalized", repo.name.toLowerCase())
        )
        .unique();
      if (existing?.stars === repo.stars) {
        continue;
      }
      if (existing) {
        await ctx.db.patch(existing._id, { stars: repo.stars });
        return;
      }
      await ctx.db.insert("githubRepos", {
        ...repo,
        ownerNormalized: repo.owner.toLowerCase(),
        nameNormalized: repo.name.toLowerCase(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const initGithubOwner = mutation({
  args: {
    owner: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("githubOwners")
      .withIndex("name", (q) =>
        q.eq("nameNormalized", args.owner.toLowerCase())
      )
      .unique();
    if (existing) {
      return;
    }
    await ctx.db.insert("githubOwners", {
      name: args.owner,
      nameNormalized: args.owner.toLowerCase(),
      stars: 0,
      updatedAt: Date.now(),
    });
  },
});

export const updateGithubOwner = mutation({
  args: {
    owner: v.string(),
    stars: v.number(),
  },
  handler: async (ctx, args) => {
    const existingOwner = await ctx.db
      .query("githubOwners")
      .withIndex("name", (q) =>
        q.eq("nameNormalized", args.owner.toLowerCase())
      )
      .unique();
    if (existingOwner) {
      await ctx.db.patch(existingOwner._id, {
        stars: args.stars,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.insert("githubOwners", {
      name: args.owner,
      nameNormalized: args.owner.toLowerCase(),
      stars: args.stars,
      updatedAt: Date.now(),
    });
  },
});

export const updateGithubRepoStars = mutation({
  args: {
    owner: v.string(),
    name: v.string(),
    stars: v.number(),
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("githubOwners")
      .withIndex("name", (q) =>
        q.eq("nameNormalized", args.owner.toLowerCase())
      )
      .unique();
    if (!owner) {
      throw new Error(`Owner ${args.owner} not found`);
    }
    const repo = await ctx.db
      .query("githubRepos")
      .withIndex("owner_name", (q) =>
        q
          .eq("ownerNormalized", args.owner.toLowerCase())
          .eq("nameNormalized", args.name.toLowerCase())
      )
      .unique();
    if (!repo) {
      await ctx.db.insert("githubRepos", {
        owner: args.owner,
        ownerNormalized: args.owner.toLowerCase(),
        name: args.name,
        nameNormalized: args.name.toLowerCase(),
        stars: args.stars,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(owner._id, {
        stars: owner.stars + args.stars,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.patch(repo._id, {
      stars: args.stars,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(owner._id, {
      stars: Math.max(0, owner.stars - repo.stars + args.stars),
      updatedAt: Date.now(),
    });
  },
});

export const sync = action({
  args: {
    personalAccessToken: v.string(),
    githubOwners: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const octokit = new Octokit({ auth: args.personalAccessToken });
    for (const owner of args.githubOwners) {
      const user = await octokit.rest.users.getByUsername({ username: owner });
      await ctx.runMutation(api.lib.initGithubOwner, {
        owner: user.data.login,
      });
      const isOrg = user.data.type === "Organization";
      const iterator = isOrg
        ? octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
            org: owner,
            per_page: 30,
          })
        : octokit.paginate.iterator(octokit.rest.repos.listForUser, {
            username: owner,
            per_page: 30,
          });
      let totalStars = 0;
      for await (const { data: repos } of iterator) {
        await ctx.runMutation(api.lib.updateGithubStars, {
          repos: repos.map((repo) => ({
            owner: repo.owner.login,
            name: repo.name,
            stars: repo.stargazers_count ?? 0,
          })),
        });
        totalStars += repos.reduce(
          (acc, repo) => acc + (repo.stargazers_count ?? 0),
          0
        );
      }
      await ctx.runMutation(api.lib.updateGithubOwner, {
        owner: user.data.login,
        stars: totalStars,
      });
    }
    const cron = await crons.get(ctx, { name: "sync" });
    if (cron) {
      await crons.delete(ctx, { name: "sync" });
    }
    await crons.register(
      ctx,
      { kind: "interval", ms: 3600000 },
      api.lib.sync,
      {
        personalAccessToken: args.personalAccessToken,
        githubOwners: args.githubOwners,
      },
      "sync"
    );
  },
});

export const getGithubOwnerStars = query({
  args: {
    owner: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("githubOwners")
      .withIndex("name", (q) =>
        q.eq("nameNormalized", args.owner.toLowerCase())
      )
      .unique();
    if (!owner) {
      throw new ConvexError(`Owner "${args.owner}" not found`);
    }
    return owner.stars;
  },
});
