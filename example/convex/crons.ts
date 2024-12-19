import { cronJobs } from "convex/server";
// import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { ossStats } from "./example";

const crons = cronJobs();

export const syncStars = internalAction(async (ctx) => {
  await ossStats.sync(ctx);
});

// Uncomment this to use the cron job
// crons.interval("syncStars", { minutes: 15 }, internal.crons.syncStars);

export default crons;
