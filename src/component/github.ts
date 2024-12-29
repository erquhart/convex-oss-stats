import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import * as cheerio from "cheerio";
import { asyncMap } from "convex-helpers";
import pLimit from "p-limit";
import { api } from "./_generated/api";
import schema from "./schema";
import { nullOrWithoutSystemFields } from "./util";

export const getGithubOwners = query({
  args: {
    owners: v.array(v.string()),
  },
  returns: v.array(v.union(v.null(), schema.tables.githubOwners.validator)),
  handler: async (ctx, args) => {
    return Promise.all(
      args.owners.map((owner) =>
        ctx.db
          .query("githubOwners")
          .withIndex("name", (q) => q.eq("nameNormalized", owner.toLowerCase()))
          .unique()
          .then(nullOrWithoutSystemFields)
      )
    );
  },
});

/*
 * Handler for Github stars webhook
 */
export const updateGithubRepoStars = mutation({
  args: {
    owner: v.string(),
    name: v.string(),
    starCount: v.number(),
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("githubOwners")
      .withIndex("name", (q) => q.eq("nameNormalized", args.owner))
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
      throw new Error(`Repo ${args.owner}/${args.name} not found`);
    }
    await ctx.db.patch(repo._id, {
      starCount: args.starCount,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(owner._id, {
      starCount: Math.max(0, owner.starCount - repo.starCount + args.starCount),
      updatedAt: Date.now(),
    });
  },
});

const repoPageRetries = 3;

const getGithubRepoPageData = async (owner: string, name: string) => {
  // Some data, especially dependent count, randomly fails to load in the UI
  let retries = repoPageRetries;
  let contributorCount: number | undefined;
  let dependentCount: number | undefined;
  while (retries > 0) {
    const html = await fetch(`https://github.com/${owner}/${name}`).then(
      (res) => res.text()
    );
    const $ = cheerio.load(html);
    const parseNumber = (str = "") => Number(str.replace(/,/g, ""));
    const selectData = (hrefSubstring: string) => {
      const result = $(`a[href$="${hrefSubstring}"] > span.Counter`)
        .filter((_, el) => {
          const title = $(el).attr("title");
          return !!parseNumber(title);
        })
        .attr("title");
      return result ? parseNumber(result) : undefined;
    };
    contributorCount = selectData("graphs/contributors");
    dependentCount = selectData("network/dependents");
    if (contributorCount === undefined || dependentCount === undefined) {
      retries--;
      continue;
    }
    break;
  }
  return {
    contributorCount: contributorCount ?? 0,
    dependentCount: dependentCount ?? 0,
  };
};

export const updateGithubRepos = mutation({
  args: {
    repos: v.array(
      v.object({
        owner: v.string(),
        name: v.string(),
        starCount: v.number(),
        contributorCount: v.number(),
        dependentCount: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await asyncMap(args.repos, async (repo) => {
      const existingRepo = await ctx.db
        .query("githubRepos")
        .withIndex("owner_name", (q) =>
          q
            .eq("ownerNormalized", repo.owner.toLowerCase())
            .eq("nameNormalized", repo.name.toLowerCase())
        )
        .unique();
      if (
        existingRepo?.starCount === repo.starCount &&
        existingRepo?.contributorCount === repo.contributorCount &&
        existingRepo?.dependentCount === repo.dependentCount
      ) {
        return;
      }
      if (existingRepo) {
        await ctx.db.patch(existingRepo._id, {
          starCount: repo.starCount || existingRepo.starCount,
          contributorCount:
            repo.contributorCount || existingRepo.contributorCount,
          dependentCount: repo.dependentCount || existingRepo.dependentCount,
          dependentCountUpdatedAt: repo.dependentCount
            ? Date.now()
            : existingRepo.dependentCountUpdatedAt,
          dependentCountPrevious:
            existingRepo.dependentCount === repo.dependentCount ||
            !repo.dependentCount
              ? existingRepo.dependentCountPrevious
              : {
                  count: existingRepo.dependentCount,
                  updatedAt: Date.now(),
                },
          updatedAt: Date.now(),
        });
        return;
      }
      await ctx.db.insert("githubRepos", {
        ...repo,
        nameNormalized: repo.name.toLowerCase(),
        ownerNormalized: repo.owner.toLowerCase(),
        dependentCountUpdatedAt: repo.dependentCount ? Date.now() : undefined,
        updatedAt: Date.now(),
      });
    });
  },
});

export const updateGithubOwner = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const ownerId =
      (
        await ctx.db
          .query("githubOwners")
          .withIndex("name", (q) =>
            q.eq("nameNormalized", args.name.toLowerCase())
          )
          .unique()
      )?._id ??
      (await ctx.db.insert("githubOwners", {
        name: args.name,
        nameNormalized: args.name.toLowerCase(),
        starCount: 0,
        contributorCount: 0,
        dependentCount: 0,
        updatedAt: Date.now(),
      }));
    const existingOwner = await ctx.db.get(ownerId);
    if (!existingOwner) {
      // This should never happen
      throw new Error(`Owner ${args.name} not found`);
    }

    const repos = await ctx.db
      .query("githubRepos")
      .withIndex("owner", (q) =>
        q.eq("ownerNormalized", args.name.toLowerCase())
      )
      .collect();

    const {
      starCount,
      contributorCount,
      dependentCount: updatedDependentCount,
    } = repos.reduce(
      (acc, repo) => ({
        starCount: acc.starCount + repo.starCount,
        contributorCount: acc.contributorCount + repo.contributorCount,
        dependentCount: acc.dependentCount + repo.dependentCount,
      }),
      { starCount: 0, contributorCount: 0, dependentCount: 0 }
    );

    const shouldUpdateDependentCount =
      !existingOwner.dependentCountPrevious ||
      Date.now() - existingOwner.dependentCountPrevious.updatedAt >=
        1000 * 60 * 60 * 24;

    const dependentCountPrevious = shouldUpdateDependentCount
      ? {
          // ensure against zero previous count to avoid exaggerated
          // difference in expected change over 24h
          count: existingOwner.dependentCount || updatedDependentCount,
          updatedAt: Date.now(),
        }
      : existingOwner?.dependentCountPrevious;

    await ctx.db.patch(ownerId, {
      starCount,
      contributorCount,
      dependentCountPrevious,
      dependentCount: shouldUpdateDependentCount
        ? updatedDependentCount
        : existingOwner.dependentCount,
      dependentCountUpdatedAt: shouldUpdateDependentCount
        ? Date.now()
        : existingOwner.dependentCountUpdatedAt,
      updatedAt: Date.now(),
    });
  },
});

export const updateGithubOwnerStats = action({
  args: {
    owner: v.string(),
    page: v.optional(v.number()),
    githubAccessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const response = await fetch(
      `https://api.github.com/users/${args.owner}/repos?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${args.githubAccessToken}`,
        },
      }
    );
    const repos: { name: string; stargazers_count: number }[] =
      await response.json();

    if (repos.length === 0) {
      await ctx.runMutation(api.github.updateGithubOwner, {
        name: args.owner,
      });
      return;
    }

    const repoLimit = pLimit(10);
    const reposWithPageData = await asyncMap(repos, async (repo) => {
      return repoLimit(async () => {
        const pageData = await getGithubRepoPageData(args.owner, repo.name);
        return {
          owner: args.owner,
          name: repo.name,
          starCount: repo.stargazers_count ?? 0,
          contributorCount: pageData.contributorCount,
          dependentCount: pageData.dependentCount,
        };
      });
    });

    await ctx.runMutation(api.github.updateGithubRepos, {
      repos: reposWithPageData,
    });

    await ctx.scheduler.runAfter(0, api.github.updateGithubOwnerStats, {
      ...args,
      page: page + 1,
    });
  },
});
