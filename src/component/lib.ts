import { v } from "convex/values";
import { Octokit } from "octokit";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";

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
          q.eq("owner", repo.owner).eq("name", repo.name)
        )
        .unique();
      if (existing?.stars === repo.stars) {
        continue;
      }
      if (existing) {
        await ctx.db.patch(existing._id, { stars: repo.stars });
        return;
      }
      await ctx.db.insert("githubRepos", { ...repo, updatedAt: Date.now() });
    }
  },
});

export const initGithubOwners = mutation({
  args: {
    githubOwners: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    for (const owner of args.githubOwners) {
      const existing = await ctx.db
        .query("githubOwners")
        .withIndex("name", (q) => q.eq("name", owner))
        .unique();
      if (existing) {
        continue;
      }
      await ctx.db.insert("githubOwners", {
        name: owner,
        stars: 0,
        updatedAt: Date.now(),
      });
    }
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
      .withIndex("name", (q) => q.eq("name", args.owner))
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
      stars: args.stars,
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
    await ctx.runMutation(api.lib.initGithubOwners, {
      githubOwners: args.githubOwners,
    });
    for (const owner of args.githubOwners) {
      const user = await octokit.rest.users.getByUsername({ username: owner });
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
        await ctx.runMutation(api.lib.updateGithubOwner, {
          owner,
          stars: totalStars,
        });
      }
    }
  },
});
