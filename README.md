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
      <div>{liveNpmDownloadCount}</div>
    </>
  );
};
```

## Prerequisites

### GitHub Account (if syncing GitHub data)

Create a GitHub account and get the following credentials:

- **Access Token**
  - Go to your GitHub account settings and generate a new access token - just
    needs read access to public repositories.
- **Webhook Secret**
  - Note: this is optional, you'll walk through these steps for every org or repo
    that you want to get live star counts for
  - Go to the settings for the org/repo and create a new webhook
  - Get the HTTP Actions URL from your production Convex deployment: https://dashboard.convex.dev > Production project deployment > Settings > URL & Deploy Key > HTTP Actions URL
  - Payload URL: `<http-actions-url>/events/github`
  - Content type: `application/json`
  - Generate a secret to share between your Convex deployment and GitHub
  - Which events? > Select individual > Stars only

### Note on npm data

npm data accessed by this component is public and doesn't require any credentials.

### Convex App

You'll need a Convex App to use the component. Follow any of the [Convex quickstarts](https://docs.convex.dev/home) to set one up.

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

// this call registers the routes necessary for the component
ossStats.registerRoutes(http, {
  // Optionally override the default path that GitHub events will be sent to
  // (default is /events/github)
  path: "/events/github",
});
export default http;
```

## Querying data

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

## Available queries

#### `stats.getGithubOwner`

```ts
const {
  starCount,
  dependentCount,
  dayOfWeekAverages,
  updatedAt,
} = useQuery(api.stats.getGithubOwner, {
  owner: 'get-convex',
})
```

#### `stats.getNpmOrg`

```ts
const {
  downloadCount,
  dayOfWeekAverages,
  updatedAt,
} = useQuery(api.stats.getNpmOrg, {
  org: 'convex-dev',
})
```

## React hooks

#### `useNpmDownloadCounter`

```ts
import { useNpmDownloadCounter } from "@convex-dev/oss-stats/react";

const npmOrg = useQuery(api.stats.getNpmOrg, {
  org: 'convex-dev',
})

// Hook returns a number that updates based on a forecast of the npm download count
const downloadCount = useNpmDownloadCounter(npmOrg)
```

<!-- END: Include on https://convex.dev/components -->
