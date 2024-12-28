import { action } from "./_generated/server";
import { v } from "convex/values";
import { Crons } from "@convex-dev/crons";
import { api, components } from "./_generated/api";
import { asyncMap } from "convex-helpers";
const crons = new Crons(components.crons);

export const sync = action({
  args: {
    githubAccessToken: v.string(),
    githubOwners: v.array(v.string()),
    npmOrgs: v.array(v.string()),
    minStars: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all([
      asyncMap(args.githubOwners, (owner) =>
        ctx.runAction(api.github.updateGithubOwnerStats, {
          owner,
          githubAccessToken: args.githubAccessToken,
        })
      ),
      asyncMap(args.npmOrgs, (org) =>
        ctx.runAction(api.npm.updateNpmOrgStats, {
          org,
        })
      ),
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
