# Convex OSS Stats Component

[![npm version](https://badge.fury.io/js/@convex-dev%2Foss-stats.svg)](https://badge.fury.io/js/@convex-dev%2Foss-stats)

<!-- START: Include on https://convex.dev/components -->

Keep GitHub and npm data for your open source projects synced to your Convex database.

```ts
// convex/stats.ts
import { components } from "./_generated/api";
import { OssStats } from "@convex-dev/oss-stats";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["get-convex"],
  npmOrgs: ["convex-dev"],
});

export const { sync, getGithubOwner, getNpmOrg } = ossStats.api();
```

```tsx
// src/OssStats.tsx
import { useQuery } from "convex/react";
import { useNpmDownloadCounter } from "@convex-dev/oss-stats/react";
import { api } from "../convex/_generated/api";

const OssStats = () => {
  const githubOwner = useQuery(api.stats.getGithubOwner, {
    owner: "get-convex",
  });
  const npmOrg = useQuery(api.stats.getNpmOrg, {
    org: "convex-dev",
  });

  // Use this hook to get a forecasted download count for an npm package or org
  const liveNpmDownloadCount = useNpmDownloadCounter(npmOrg);

  return (
    <>
      {/* If webhook is registered, this will update in realtime 🔥 */}
      <div>{githubOwner.starCount}</div>
      <div>{liveNpmDownloadCount.count}</div>
    </>
  );
};
```

## Prerequisites

### Convex App

You'll need a Convex App to use the component. Follow any of the
[Convex quickstarts](https://docs.convex.dev/home) to set one up.

### GitHub Account (if syncing GitHub data)

From your GitHub account, get the following credentials:

- **Access Token**
  - Go to account settings and generate a new access token with read access to
    public repositories.
- **Webhook Secret**: do this for each org or repo.
  - Note: this is optional. Without it, you won't get live star counts.
    See how to [manually sync data below](#manually-syncing-data).
  - Go to the settings for the org/repo and create a new webhook.
  - Get the HTTP Actions URL for your **Production** Convex deployment settings:
    https://dashboard.convex.dev/deployment/settings > HTTP Actions URL
  - Payload URL: `<http-actions-url>/events/github`
  - Content type: `application/json`
  - Generate a secret to share between your Convex deployment and GitHub
  - Which events? > Select individual > Stars only

### Note on npm data

npm data accessed by this component is public and doesn't require any credentials.

## Installation

Install the component package:

```ts
npm install @convex-dev/oss-stats
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import ossStats from "@convex-dev/oss-stats/convex.config";

const app = defineApp();
app.use(ossStats);

export default app;
```

Set your API credentials:

```sh
npx convex env set GITHUB_ACCESS_TOKEN=xxxxx
npx convex env set GITHUB_WEBHOOK_SECRET=xxxxx
```

If you haven't been running `npx convex dev` yet, you'll need to start it now.
It will generate code for the component in your `convex/_generated/api` folder,
and will deploy changes automatically as you change files in `convex/`.

Instantiate an OssStats Component client in a file in your app's `convex/` folder:

```ts
// convex/example.ts
import { OssStats } from "@convex-dev/oss-stats";
import { components } from "./_generated/api";

export const ossStats = new OssStats(components.ossStats, {
  githubOwners: ["get-convex"],
  npmOrgs: ["convex-dev"],
});

// Re-export functions for direct access from your convex instance
export const { sync, getGithubOwner, getNpmOrg } = ossStats.api();
```

Register GitHub webhook handlers by creating an `http.ts` file in your `convex/` folder and use the client you've exported above:

```ts
// http.ts
import { ossStats } from "./example";
import { httpRouter } from "convex/server";

const http = httpRouter();

ossStats.registerRoutes(http);
export default http;
```

## Querying data from the frontend

Use the `useQuery` hook to get data from the component. Here's an example of how to get data for a GitHub owner (org or user) and an npm package or org:

```ts
// src/OssStats.tsx
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

const OssStats = () => {
  const githubOwner = useQuery(api.stats.getGithubOwner, {
    owner: 'get-convex',
  })
  const npmOrg = useQuery(api.stats.getNpmOrg, {
    org: 'convex-dev',
  })

  return (
    <>
      {/* If webhook is registered, this will update in realtime 🔥 */}
      <div>{githubOwner.starCount}</div>
      <div>{npmOrg.downloadCount}</div>
    </>
  )
}
```

### Available queries

#### `stats.getGithubOwner`

```ts
const { starCount, dependentCount, dayOfWeekAverages, updatedAt } = useQuery(
  api.stats.getGithubOwner,
  { owner: "get-convex" }
);
```

#### `stats.getNpmOrg`

```ts
const { downloadCount, dayOfWeekAverages, updatedAt } = useQuery(
  api.stats.getNpmOrg,
  { org: "convex-dev" }
);
```

### React hooks

#### `useNpmDownloadCounter`

Provides a forecasted download count for an npm package or org that updates on
an interval.

Args:
- `npmOrg`: npmOrg object returned from the `getNpmOrg` query
- `options`: optional options object
  - `intervalMs`: override the calculated interval

Returns:
- `count`: regularly updated download count
- `intervalMs`: the interval at which the count is updated (useful for
  configuring client animations, such as a NumberFlow component)

```ts
import { useNpmDownloadCounter } from "@convex-dev/oss-stats/react";
import NumberFlow from '@number-flow/react'

const npmOrg = useQuery(api.stats.getNpmOrg, { org: "convex-dev" });

const { count, intervalMs } = useNpmDownloadCounter(npmOrg)

return (
  <NumberFlow
    transformTiming={{
      duration: intervalMs,
      easing: 'linear',
    }}
    value={count}
    trend={1}
    continuous
    willChange
  />
)
```

## Querying data from the backend

You can also query data from the backend using the `ossStats` object.
Note: the data will only be available for the owners and npm orgs you configured
and have synced.

```ts
// Within a Convex query, mutation, or action:
// All of the owners you configured when initializing the OssStats object
const githubOwners = await ossStats.getAllGithubOwners(ctx);
// A single owner
const githubOwner = await ossStats.getGithubOwner(ctx, "get-convex");
// All of the npm orgs you configured when initializing the OssStats object
const npmOrgs = await ossStats.getAllNpmOrgs(ctx);
// A single npm org
const npmOrg = await ossStats.getNpmOrg(ctx, "convex-dev");
```

## Options and configuration

### Manually syncing data

If you don't want to use the webhook, you can use a cron job to sync data:

```ts
// In convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

export const syncStars = internalAction(async (ctx) => {
  await ossStats.sync(ctx);
});

const crons = cronJobs();

crons.interval("syncStars", { minutes: 15 }, internal.stats.syncStars);

export default crons;
```

You could alternatively call this from the CLI or dashboard:

```sh
npx convex run crons:syncStars
```

Or call it via an http endpoint:

```ts
// In convex/http.ts
import { httpAction } from "./_generated/server";
//...
http.route({
  path: "/syncStars",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (request.headers.get("x-api-key") !== process.env.API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }
    await ossStats.sync(ctx);
    return new Response("ok", { status: 200 });
  }),
});
```

`API_KEY` can be set in the dashboard or via `npx convex env set API_KEY=...`

### Override the default `/events/github` path

```ts
ossStats.registerRoutes(http, {
  path: "/my/github/webhook",
});
```

<!-- END: Include on https://convex.dev/components -->
