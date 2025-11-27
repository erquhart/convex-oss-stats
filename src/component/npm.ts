import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { api } from "./_generated/api";
import schema from "./schema";
import { withoutSystemFields } from "./util";

export const getNpmOrgs = query({
  args: {
    names: v.array(v.string()),
  },
  returns: v.array(
    v.union(
      v.null(),
      v.object({
        ...schema.tables.npmOrgs.validator.fields,
        downloadCountUpdatedAt: v.number(),
      })
    )
  ),
  handler: async (ctx, args) => {
    return Promise.all(
      args.names.map(async (name) => {
        const org = await ctx.db
          .query("npmOrgs")
          .withIndex("name", (q) => q.eq("name", name))
          .unique();
        if (!org) {
          return null;
        }
        return {
          ...withoutSystemFields(org),
          downloadCountUpdatedAt:
            org.downloadCountUpdatedAt ?? Date.now() - 1000 * 60 * 60 * 24,
        };
      })
    );
  },
});

export const getNpmPackage = query({
  args: {
    name: v.string(),
  },
  returns: v.union(v.null(), schema.tables.npmPackages.validator),
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("npmPackages")
      .withIndex("name", (q) => q.eq("name", args.name))
      .unique();
    if (pkg) {
      return withoutSystemFields(pkg);
    }
    return null;
  },
});

export const getNpmPackages = query({
  args: {
    names: v.array(v.string()),
  },
  returns: v.object({
    downloadCount: v.number(),
    dayOfWeekAverages: v.array(v.number()),
    downloadCountUpdatedAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const packages = await Promise.all(
      args.names.map(async (name) => {
        const pkg = await ctx.db
          .query("npmPackages")
          .withIndex("name", (q) => q.eq("name", name))
          .unique();
        if (pkg) {
          return withoutSystemFields(pkg);
        }
        return null;
      })
    );
    return packages.reduce(
      (acc, pkg) => {
        if (!pkg) {
          return acc;
        }
        return {
          downloadCount: acc.downloadCount + pkg.downloadCount,
          dayOfWeekAverages: acc.dayOfWeekAverages.map(
            (avg, idx) => avg + pkg.dayOfWeekAverages[idx]
          ),
          downloadCountUpdatedAt: Math.max(
            acc.downloadCountUpdatedAt ?? 0,
            pkg.downloadCountUpdatedAt ?? 0
          ),
          updatedAt: Math.max(acc.updatedAt ?? 0, pkg.updatedAt ?? 0),
        };
      },
      {
        downloadCount: 0,
        dayOfWeekAverages: Array(7).fill(0),
        downloadCountUpdatedAt: 0,
        updatedAt: 0,
      }
    );
  },
});

export const updateNpmPackagesForOrg = mutation({
  args: {
    org: v.string(),
    packages: v.array(
      v.object({
        name: v.string(),
        downloadCount: v.number(),
        dayOfWeekAverages: v.array(v.number()),
        isNotFound: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await asyncMap(args.packages, async (pkg) => {
      const existingPackage = await ctx.db
        .query("npmPackages")
        .withIndex("name", (q) => q.eq("name", pkg.name))
        .unique();
      if (existingPackage?.downloadCount === pkg.downloadCount) {
        return;
      }
      if (existingPackage && pkg.isNotFound) {
        await ctx.db.delete(existingPackage._id);
        return;
      }
      if (pkg.isNotFound) {
        return;
      }
      if (existingPackage) {
        await ctx.db.patch(existingPackage._id, {
          downloadCount: pkg.downloadCount || existingPackage.downloadCount,
          downloadCountUpdatedAt: Date.now(),
          dayOfWeekAverages:
            pkg.dayOfWeekAverages || existingPackage.dayOfWeekAverages,
          updatedAt: Date.now(),
        });
        return;
      }
      await ctx.db.insert("npmPackages", {
        ...pkg,
        org: args.org,
        downloadCountUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  },
});

export const updateNpmPackage = mutation({
  args: {
    name: v.string(),
    downloadCount: v.number(),
    dayOfWeekAverages: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const existingPackage = await ctx.db
      .query("npmPackages")
      .withIndex("name", (q) => q.eq("name", args.name))
      .unique();
    if (existingPackage?.downloadCount === args.downloadCount) {
      return;
    }
    if (existingPackage) {
      await ctx.db.patch(existingPackage._id, {
        downloadCount: args.downloadCount || existingPackage.downloadCount,
        downloadCountUpdatedAt: Date.now(),
        dayOfWeekAverages:
          args.dayOfWeekAverages || existingPackage.dayOfWeekAverages,
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.insert("npmPackages", {
      name: args.name,
      downloadCount: args.downloadCount,
      dayOfWeekAverages: args.dayOfWeekAverages,
      downloadCountUpdatedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

const fetchNpmPackageListForOrg = async (org: string, page: number) => {
  const response = await fetch(
    `https://www.npmjs.com/org/${org}?page=${page}`,
    {
      headers: {
        "cache-control": "no-cache",
        "x-spiferack": "1",
      },
    }
  );
  const data: {
    scope: { type: "org" | "user" };
    packages?: {
      objects: { name: string; created: { ts: number } }[];
      urls: { next: string };
    };
    message?: string;
  } = await response.json();
  if (!data.packages && data.message === "NotFoundError: Scope not found") {
    throw new Error(`npm org ${org} not found`);
  }
  if (data.scope.type === "user") {
    throw new Error(
      `${org} is a user, not an org - only npm orgs are supported`
    );
  }
  if (!data.packages) {
    throw new Error(`no packages for ${org}, page ${page}`);
  }
  return {
    packages: data.packages.objects.map((pkg) => ({
      name: pkg.name,
      created: pkg.created.ts,
    })),
    hasMore: !!data.packages.urls.next,
  };
};

const fetchNpmPackageInfo = async (name: string) => {
  const response = await fetch(`https://registry.npmjs.com/${name}`);
  const data:
    | {
        time: { created: string };
      }
    | { error: string } = await response.json();
  if ("error" in data && data.error === "Not found") {
    throw new Error(`package ${name} not found`);
  }
  if ("error" in data) {
    throw new Error(data.error);
  }
  return {
    created: data.time.created,
  };
};

const fetchNpmPackageDownloadCount = async (name: string, created: number) => {
  const currentDateIso = new Date().toISOString().substring(0, 10);
  let nextDate = new Date(created);
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
      `https://api.npmjs.org/downloads/range/${from}:${to}/${name}`
    );
    const pageData: {
      end: string;
      downloads: { day: string; downloads: number }[];
      error?: string;
    } = await response.json();
    if (pageData.error === `package ${name} not found`) {
      return;
    }
    const downloadCount = pageData.downloads.reduce(
      (acc: number, cur: { downloads: number }) => acc + cur.downloads,
      0
    );
    totalDownloadCount += downloadCount;
    nextDate.setDate(nextDate.getDate() + 1);
    hasMore = pageData.end < currentDateIso;
  }
  nextDate.setDate(nextDate.getDate() - 30);
  const from = nextDate.toISOString().substring(0, 10);
  nextDate.setDate(nextDate.getDate() + 30);
  const to = nextDate.toISOString().substring(0, 10);
  const lastPageResponse = await fetch(
    `https://api.npmjs.org/downloads/range/${from}:${to}/${name}`
  );
  const lastPageData: {
    end: string;
    downloads: { day: string; downloads: number }[];
  } = await lastPageResponse.json();
  // Create array of week of day averages, 0 = Sunday
  const dayOfWeekAverages = Array(7)
    .fill(0)
    .map((_, idx) => {
      const total = lastPageData.downloads
        .filter((day) => new Date(day.day).getDay() === idx)
        .slice(0, 4)
        .reduce((acc, cur) => acc + cur.downloads, 0);
      return Math.round(total / 4);
    });
  return {
    totalDownloadCount,
    dayOfWeekAverages,
  };
};

export const updateNpmOrg = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existingOrg = await ctx.db
      .query("npmOrgs")
      .withIndex("name", (q) => q.eq("name", args.name))
      .unique();
    const newOrgId =
      existingOrg?._id ??
      (await ctx.db.insert("npmOrgs", {
        name: args.name,
        downloadCount: 0,
        downloadCountUpdatedAt: Date.now(),
        dayOfWeekAverages: [],
        updatedAt: Date.now(),
      }));
    const org = existingOrg || (await ctx.db.get(newOrgId));
    if (!org) {
      throw new Error(`npm org ${args.name} not found`);
    }
    const packages = await ctx.db
      .query("npmPackages")
      .withIndex("org", (q) => q.eq("org", args.name))
      .collect();
    const downloadCount = packages.reduce(
      (acc, pkg) => acc + pkg.downloadCount,
      0
    );
    if (!downloadCount || downloadCount === org.downloadCount) {
      return;
    }
    await ctx.db.patch(org._id, {
      downloadCount,
      downloadCountUpdatedAt: Date.now(),
      dayOfWeekAverages: packages.reduce(
        (acc, pkg) => acc.map((val, idx) => val + pkg.dayOfWeekAverages[idx]),
        Array(7).fill(0)
      ),
      updatedAt: Date.now(),
    });
  },
});

export const updateNpmOrgStats = action({
  args: {
    org: v.string(),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 0;
    const { packages, hasMore } = await fetchNpmPackageListForOrg(
      args.org,
      page
    );
    const packagesWithDownloadCount = await asyncMap(packages, async (pkg) => {
      const result = await fetchNpmPackageDownloadCount(pkg.name, pkg.created);
      if (!result) {
        return {
          name: pkg.name,
          downloadCount: 0,
          dayOfWeekAverages: [],
          isNotFound: true,
        };
      }
      return {
        name: pkg.name,
        downloadCount: result.totalDownloadCount,
        dayOfWeekAverages: result.dayOfWeekAverages,
      };
    });

    await ctx.runMutation(api.npm.updateNpmPackagesForOrg, {
      org: args.org,
      packages: packagesWithDownloadCount,
    });

    if (hasMore) {
      await ctx.scheduler.runAfter(0, api.npm.updateNpmOrgStats, {
        org: args.org,
        page: page + 1,
      });
      return;
    }

    await ctx.runMutation(api.npm.updateNpmOrg, {
      name: args.org,
    });
  },
});

export const updateNpmPackageStats = action({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const info = await fetchNpmPackageInfo(args.name);
    const result = await fetchNpmPackageDownloadCount(
      args.name,
      new Date(info.created).getTime()
    );
    if (!result) {
      return;
    }
    await ctx.runMutation(api.npm.updateNpmPackage, {
      name: args.name,
      downloadCount: result.totalDownloadCount,
      dayOfWeekAverages: result.dayOfWeekAverages,
    });
  },
});
