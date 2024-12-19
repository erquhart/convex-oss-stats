import { httpRouter } from "convex/server";
import { ossStats } from "./example";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Register routes
// Publishes /events/github endpoint for live star count updates via webhook
ossStats.registerRoutes(http);

// If you want to manually sync stars via a webhook.
http.route({
  path: "/syncStars",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("x-api-key") !== process.env.API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }
    await ossStats.sync(ctx);
    const data = {
      npm: await ossStats.getAllNpmOrgs(ctx),
      github: await ossStats.getAllGithubOwners(ctx),
    };
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
});

export default http;
