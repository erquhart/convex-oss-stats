import { v } from "convex/values";
import { Octokit } from "octokit";
import { Crons } from "@convex-dev/crons";
import { action, mutation, query } from "./_generated/server";
import { api, components } from "./_generated/api";

const crons = new Crons(components.crons);

const getGithubRepoContributorsCount = async (
  octokit: Octokit,
  owner: string,
  name: string
) => {
  const iterator = octokit.paginate.iterator(
    octokit.rest.repos.listContributors,
    {
      owner,
      repo: name,
      per_page: 30,
      anon: "1",
    }
  );
  let totalContributors = 0;
  for await (const { data: contributors } of iterator) {
    totalContributors += contributors.length;
  }
  return totalContributors;
};

export const updateGithubRepos = mutation({
  args: {
    repos: v.array(
      v.object({
        owner: v.string(),
        name: v.string(),
        stars: v.number(),
        contributorsCount: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const repo of args.repos) {
      const existingRepo = await ctx.db
        .query("githubRepos")
        .withIndex("owner_name", (q) =>
          q
            .eq("ownerNormalized", repo.owner.toLowerCase())
            .eq("nameNormalized", repo.name.toLowerCase())
        )
        .unique();
      if (existingRepo?.stars === repo.stars) {
        continue;
      }
      if (existingRepo) {
        await ctx.db.patch(existingRepo._id, {
          stars: repo.stars,
          contributorsCount: repo.contributorsCount,
          updatedAt: Date.now(),
        });
        return;
      }
      await ctx.db.insert("githubRepos", {
        ...repo,
        contributorsCount: repo.contributorsCount,
        ownerNormalized: repo.owner.toLowerCase(),
        nameNormalized: repo.name.toLowerCase(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateGithubOwner = mutation({
  args: {
    owner: v.string(),
    stars: v.optional(v.number()),
    contributorsCount: v.optional(v.number()),
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
        stars: args.stars ?? existingOwner.stars,
        contributorsCount:
          args.contributorsCount ?? existingOwner.contributorsCount,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.insert("githubOwners", {
      name: args.owner,
      nameNormalized: args.owner.toLowerCase(),
      stars: args.stars ?? 0,
      contributorsCount: args.contributorsCount ?? 0,
      updatedAt: Date.now(),
    });
  },
});

/*
 * Handler for Github stars webhook
 */
export const updateGithubRepoStars = mutation({
  args: {
    personalAccessToken: v.string(),
    owner: v.string(),
    name: v.string(),
    stars: v.optional(v.number()),
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
      const contributorsCount = await getGithubRepoContributorsCount(
        new Octokit({ auth: args.personalAccessToken }),
        args.owner,
        args.name
      );
      await ctx.db.insert("githubRepos", {
        owner: args.owner,
        ownerNormalized: args.owner.toLowerCase(),
        name: args.name,
        nameNormalized: args.name.toLowerCase(),
        stars: args.stars ?? 0,
        contributorsCount,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(owner._id, {
        stars: owner.stars + (args.stars ?? 0),
        contributorsCount: owner.contributorsCount + contributorsCount,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.patch(repo._id, {
      stars: args.stars ?? repo.stars,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(owner._id, {
      stars: Math.max(0, owner.stars - repo.stars + (args.stars ?? 0)),
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
      await ctx.runMutation(api.lib.updateGithubOwner, {
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
      let ownerStars = 0;
      let ownerContributors = 0;
      for await (const { data: repos } of iterator) {
        const reposWithContributors = [];
        for (const repo of repos) {
          const contributorsCount = await getGithubRepoContributorsCount(
            octokit,
            owner,
            repo.name
          );
          reposWithContributors.push({
            ...repo,
            contributorsCount,
          });
          ownerStars += repo.stargazers_count ?? 0;
          ownerContributors += contributorsCount;
        }
        await ctx.runMutation(api.lib.updateGithubRepos, {
          repos: reposWithContributors.map((repo) => ({
            owner: repo.owner.login,
            name: repo.name,
            stars: repo.stargazers_count ?? 0,
            contributorsCount: repo.contributorsCount,
          })),
        });
      }
      await ctx.runMutation(api.lib.updateGithubOwner, {
        owner: user.data.login,
        stars: ownerStars,
        contributorsCount: ownerContributors,
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

export const getGithubOwner = query({
  args: {
    owner: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("githubOwners")
      .withIndex("name", (q) =>
        q.eq("nameNormalized", args.owner.toLowerCase())
      )
      .unique();
  },
});
