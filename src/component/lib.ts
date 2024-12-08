import { v } from "convex/values";
import { Octokit } from "octokit";
import * as cheerio from "cheerio";
import { Crons } from "@convex-dev/crons";
import { action, mutation, query } from "./_generated/server";
import { api, components } from "./_generated/api";
import { GenericActionCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import pLimit from "p-limit";
import { chunk } from "remeda";

const crons = new Crons(components.crons);
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
      const result = $(`* a[href*="${hrefSubstring}"] > span`)
        .filter((_, el) => {
          const title = $(el).attr("title");
          return !!parseNumber(title);
        })
        .attr("title");
      return result ? parseNumber(result) : undefined;
    };
    contributorCount = selectData("contributors");
    dependentCount = selectData("dependents");
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

const syncGithub = async (
  ctx: GenericActionCtx<DataModel>,
  githubAccessToken: string,
  githubOwners: string[],
  minStars: number
) => {
  const octokit = new Octokit({ auth: githubAccessToken });
  const ownerLimit = pLimit(5);
  await Promise.all(
    githubOwners.map((owner) =>
      ownerLimit(async () => {
        let user;
        try {
          user = await octokit.rest.users.getByUsername({
            username: owner,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          if (e.status === 404) {
            console.error(`github owner ${owner} not found`);
            return;
          }
          console.error(e);
          return;
        }
        await ctx.runMutation(api.lib.updateGithubOwner, {
          owner: user.data.login,
        });
        const isOrg = user.data.type === "Organization";
        const iterator = isOrg
          ? octokit.paginate.iterator(octokit.rest.repos.listForOrg, {
              org: owner,
              per_page: 100,
            })
          : octokit.paginate.iterator(octokit.rest.repos.listForUser, {
              username: owner,
              per_page: 100,
            });
        let ownerStars = 0;
        let ownerContributors = 0;
        let ownerDependentCount = 0;
        for await (const { data: repos } of iterator) {
          const reposWithContributors: {
            owner: {
              login: string;
            };
            name: string;
            stargazers_count: number;
            contributorsCount: number;
            dependentCount: number;
          }[] = [];
          const repoLimit = pLimit(4);
          await Promise.all(
            repos.map((repo) =>
              repoLimit(async () => {
                if ((repo.stargazers_count ?? 0) < minStars) {
                  return;
                }
                const pageData = await getGithubRepoPageData(owner, repo.name);
                reposWithContributors.push({
                  owner: repo.owner,
                  name: repo.name,
                  stargazers_count: repo.stargazers_count ?? 0,
                  contributorsCount: pageData.contributorCount,
                  dependentCount: pageData.dependentCount,
                });
                ownerStars += repo.stargazers_count ?? 0;
                ownerContributors += pageData.contributorCount;
                ownerDependentCount += pageData.dependentCount;
              })
            )
          );
          await ctx.runMutation(api.lib.updateGithubRepos, {
            repos: reposWithContributors.map((repo) => ({
              owner: repo.owner.login,
              name: repo.name,
              starCount: repo.stargazers_count ?? 0,
              contributorCount: repo.contributorsCount,
              dependentCount: repo.dependentCount,
            })),
          });
        }
        await ctx.runMutation(api.lib.updateGithubOwner, {
          owner: user.data.login,
          starCount: ownerStars,
          contributorCount: ownerContributors,
          dependentCount: ownerDependentCount,
        });
      })
    )
  );
};

const syncNpm = async (ctx: GenericActionCtx<DataModel>, npmOrgs: string[]) => {
  const orgLimit = pLimit(2);
  await Promise.all(
    npmOrgs.map((orgName) =>
      orgLimit(async () => {
        let nextUrlSuffix = "";
        const packages = [];
        do {
          const response = await fetch(
            `https://www.npmjs.com/org/${orgName}${nextUrlSuffix}`,
            {
              headers: {
                "cache-control": "no-cache",
                "x-spiferack": "1",
              },
            }
          );
          const json: {
            packages?: {
              objects: { name: string; created: { ts: number } }[];
              urls: { next: string };
            };
            message?: string;
          } = await response.json();
          if (!json.packages) {
            if (json.message === "NotFoundError: Scope not found") {
              console.error(`npm org ${orgName} not found`);
            } else {
              console.error("syncNpm", {
                json,
              });
            }
            continue;
          }
          nextUrlSuffix = json.packages.urls.next;
          packages.push(
            ...json.packages.objects.map((pkg) => ({
              name: pkg.name,
              created: pkg.created.ts,
            }))
          );
        } while (nextUrlSuffix);
        const currentDateIso = new Date().toISOString().substring(0, 10);
        const packageLimit = pLimit(20);
        const packagesWithDownloadCount = await Promise.all(
          packages.map((pkg) =>
            packageLimit(async () => {
              let nextDate = new Date(pkg.created);
              let totalDownloadCount = 0;
              let hasMore = true;
              while (hasMore) {
                const from = nextDate.toISOString().substring(0, 10);
                nextDate.setDate(nextDate.getDate() + 17 * 30);
                if (nextDate.toISOString().substring(0, 10) > currentDateIso) {
                  nextDate = new Date();
                }
                const to = nextDate.toISOString().substring(0, 10);
                const response = await fetch(
                  `https://api.npmjs.org/downloads/range/${from}:${to}/${pkg.name}`
                );
                const json: {
                  end: string;
                  downloads: { day: string; downloads: number }[];
                } = await response.json();
                const downloadCount = json.downloads.reduce(
                  (acc: number, cur: { downloads: number }) =>
                    acc + cur.downloads,
                  0
                );
                totalDownloadCount += downloadCount;
                nextDate.setDate(nextDate.getDate() + 1);
                hasMore = json.end < currentDateIso;
              }
              nextDate.setDate(nextDate.getDate() - 30);
              const from = nextDate.toISOString().substring(0, 10);
              nextDate.setDate(nextDate.getDate() + 30);
              const to = nextDate.toISOString().substring(0, 10);
              const lastPageResponse = await fetch(
                `https://api.npmjs.org/downloads/range/${from}:${to}/${pkg.name}`
              );
              const lastPageJson: {
                end: string;
                downloads: { day: string; downloads: number }[];
              } = await lastPageResponse.json();
              // Create array of week of day averages, 0 = Sunday
              console.log(lastPageJson);
              const dayOfWeekAverages = Array(7)
                .fill(0)
                .map((_, idx) => {
                  const total = lastPageJson.downloads
                    .filter((day) => new Date(day.day).getDay() === idx)
                    .reduce((acc, cur) => acc + cur.downloads, 0);
                  return Math.round(total / 4);
                });
              return {
                name: pkg.name,
                downloadCount: totalDownloadCount,
                dayOfWeekAverages,
              };
            })
          )
        );
        await Promise.all(
          chunk(packagesWithDownloadCount, 20).map(async (chunk) => {
            await ctx.runMutation(api.lib.updateNpmPackages, {
              packages: chunk,
            });
          })
        );
        const orgTotalDownloadCount = packagesWithDownloadCount.reduce(
          (acc: number, cur: { downloadCount: number }) =>
            acc + cur.downloadCount,
          0
        );
        const orgDayOfWeekAverages = packagesWithDownloadCount.reduce(
          (acc: number[], cur: { dayOfWeekAverages: number[] }) => {
            return acc.map((avg, idx) => avg + cur.dayOfWeekAverages[idx]);
          },
          Array(7).fill(0)
        );
        await ctx.runMutation(api.lib.updateNpmOrg, {
          name: orgName,
          downloadCount: orgTotalDownloadCount,
          dayOfWeekAverages: orgDayOfWeekAverages,
        });
      })
    )
  );
};

export const updateNpmOrg = mutation({
  args: {
    name: v.string(),
    downloadCount: v.number(),
    dayOfWeekAverages: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("npmOrgs")
      .withIndex("name", (q) => q.eq("name", args.name))
      .unique();
    if (!org) {
      await ctx.db.insert("npmOrgs", {
        name: args.name,
        downloadCount: args.downloadCount,
        dayOfWeekAverages: args.dayOfWeekAverages,
        updatedAt: Date.now(),
      });
      return;
    }
    if (org.downloadCount === args.downloadCount) {
      return;
    }
    await ctx.db.patch(org._id, {
      downloadCount: args.downloadCount,
      updatedAt: Date.now(),
    });
  },
});

export const updateNpmPackages = mutation({
  args: {
    packages: v.array(
      v.object({
        name: v.string(),
        downloadCount: v.number(),
        dayOfWeekAverages: v.array(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const pkg of args.packages) {
      const existingPkg = await ctx.db
        .query("npmPackages")
        .withIndex("name", (q) => q.eq("name", pkg.name))
        .unique();
      if (existingPkg?.downloadCount === pkg.downloadCount) {
        continue;
      }
      if (existingPkg) {
        await ctx.db.patch(existingPkg._id, {
          downloadCount: pkg.downloadCount,
          dayOfWeekAverages: pkg.dayOfWeekAverages,
          updatedAt: Date.now(),
        });
        return;
      }
      await ctx.db.insert("npmPackages", {
        ...pkg,
        updatedAt: Date.now(),
      });
    }
  },
});

const getDependentCountPrevious = (existingRepo: {
  dependentCountPrevious?: {
    count: number;
    updatedAt: number;
  };
  dependentCount: number;
}) => {
  const updatedAt = Date.now();
  const dependentCountPreviousDate =
    existingRepo.dependentCountPrevious?.updatedAt;
  return dependentCountPreviousDate &&
    updatedAt - dependentCountPreviousDate < 55 * 60 * 1000
    ? existingRepo.dependentCountPrevious
    : {
        count: existingRepo.dependentCount,
        updatedAt,
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
        dependentCountPrevious: v.optional(
          v.object({
            count: v.number(),
            updatedAt: v.number(),
          })
        ),
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
      if (existingRepo?.starCount === repo.starCount) {
        continue;
      }
      if (existingRepo) {
        await ctx.db.patch(existingRepo._id, {
          starCount: repo.starCount,
          contributorCount:
            repo.contributorCount || existingRepo.contributorCount,
          dependentCount: repo.dependentCount || existingRepo.dependentCount,
          dependentCountPrevious: getDependentCountPrevious(existingRepo),
          updatedAt: Date.now(),
        });
        return;
      }
      await ctx.db.insert("githubRepos", {
        ...repo,
        contributorCount: repo.contributorCount,
        dependentCount: repo.dependentCount,
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
    starCount: v.optional(v.number()),
    contributorCount: v.optional(v.number()),
    dependentCount: v.optional(v.number()),
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
        starCount: args.starCount ?? existingOwner.starCount,
        contributorCount:
          args.contributorCount || existingOwner.contributorCount,
        dependentCount: args.dependentCount || existingOwner.dependentCount,
        dependentCountPrevious: getDependentCountPrevious(existingOwner),
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.insert("githubOwners", {
      name: args.owner,
      nameNormalized: args.owner.toLowerCase(),
      starCount: args.starCount ?? 0,
      contributorCount: args.contributorCount ?? 0,
      dependentCount: args.dependentCount ?? 0,
      updatedAt: Date.now(),
    });
  },
});

/*
 * Handler for Github stars webhook
 */
export const updateGithubRepoStars = mutation({
  args: {
    githubAccessToken: v.string(),
    owner: v.string(),
    name: v.string(),
    starCount: v.optional(v.number()),
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
      // Get all data since this repo is new
      const pageData = await getGithubRepoPageData(args.owner, args.name);
      if (!pageData) {
        throw new Error(
          `failed to get page data for ${args.owner}/${args.name}`
        );
      }
      await ctx.db.insert("githubRepos", {
        owner: args.owner,
        ownerNormalized: args.owner.toLowerCase(),
        name: args.name,
        nameNormalized: args.name.toLowerCase(),
        starCount: args.starCount ?? 0,
        contributorCount: pageData.contributorCount,
        dependentCount: pageData.dependentCount,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(owner._id, {
        starCount: owner.starCount + (args.starCount ?? 0),
        contributorCount: owner.contributorCount + pageData.contributorCount,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.patch(repo._id, {
      starCount: args.starCount ?? repo.starCount,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(owner._id, {
      starCount: Math.max(
        0,
        owner.starCount - repo.starCount + (args.starCount ?? 0)
      ),
      updatedAt: Date.now(),
    });
  },
});

export const sync = action({
  args: {
    githubAccessToken: v.string(),
    githubOwners: v.array(v.string()),
    npmOrgs: v.array(v.string()),
    minStars: v.number(),
  },
  handler: async (ctx, args) => {
    await Promise.all([
      syncGithub(ctx, args.githubAccessToken, args.githubOwners, args.minStars),
      syncNpm(ctx, args.npmOrgs),
    ]);
    const cron = await crons.get(ctx, { name: "sync" });
    if (cron) {
      await crons.delete(ctx, { name: "sync" });
    }
    await crons.register(
      ctx,
      { kind: "interval", ms: 3600000 },
      api.lib.sync,
      {
        githubAccessToken: args.githubAccessToken,
        githubOwners: args.githubOwners,
        npmOrgs: args.npmOrgs,
        minStars: args.minStars,
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

export const getNpmOrg = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("npmOrgs")
      .withIndex("name", (q) => q.eq("name", args.name))
      .unique();
  },
});
