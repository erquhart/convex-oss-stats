/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as github from "../github.js";
import type * as lib from "../lib.js";
import type * as npm from "../npm.js";
import type * as util from "../util.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  github: typeof github;
  lib: typeof lib;
  npm: typeof npm;
  util: typeof util;
}>;
export type Mounts = {
  github: {
    getGithubOwners: FunctionReference<
      "query",
      "public",
      { owners: Array<string> },
      Array<null | {
        contributorCount: number;
        dependentCount: number;
        dependentCountPrevious?: any;
        name: string;
        nameNormalized: string;
        starCount: number;
        updatedAt: number;
      }>
    >;
    updateGithubOwner: FunctionReference<
      "mutation",
      "public",
      { name: string },
      any
    >;
    updateGithubOwnerStats: FunctionReference<
      "action",
      "public",
      { githubAccessToken: string; owner: string; page?: number },
      any
    >;
    updateGithubRepoStars: FunctionReference<
      "mutation",
      "public",
      { name: string; owner: string; starCount: number },
      any
    >;
    updateGithubRepos: FunctionReference<
      "mutation",
      "public",
      {
        repos: Array<{
          contributorCount: number;
          dependentCount: number;
          name: string;
          owner: string;
          starCount: number;
        }>;
      },
      any
    >;
  };
  lib: {
    sync: FunctionReference<
      "action",
      "public",
      {
        githubAccessToken: string;
        githubOwners: Array<string>;
        minStars: number;
        npmOrgs: Array<string>;
      },
      null
    >;
  };
  npm: {
    getNpmOrgs: FunctionReference<
      "query",
      "public",
      { names: Array<string> },
      Array<null | {
        dayOfWeekAverages: Array<number>;
        downloadCount: number;
        downloadCountUpdatedAt: number;
        name: string;
        updatedAt: number;
      }>
    >;
    updateNpmOrg: FunctionReference<
      "mutation",
      "public",
      { name: string },
      any
    >;
    updateNpmOrgStats: FunctionReference<
      "action",
      "public",
      { org: string; page?: number },
      any
    >;
    updateNpmPackagesForOrg: FunctionReference<
      "mutation",
      "public",
      {
        org: string;
        packages: Array<{
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          name: string;
        }>;
      },
      any
    >;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  crons: {
    public: {
      del: FunctionReference<
        "mutation",
        "internal",
        { identifier: { id: string } | { name: string } },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { identifier: { id: string } | { name: string } },
        {
          args: Record<string, any>;
          functionHandle: string;
          id: string;
          name?: string;
          schedule:
            | { kind: "interval"; ms: number }
            | { cronspec: string; kind: "cron" };
        } | null
      >;
      list: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          args: Record<string, any>;
          functionHandle: string;
          id: string;
          name?: string;
          schedule:
            | { kind: "interval"; ms: number }
            | { cronspec: string; kind: "cron" };
        }>
      >;
      register: FunctionReference<
        "mutation",
        "internal",
        {
          args: Record<string, any>;
          functionHandle: string;
          name?: string;
          schedule:
            | { kind: "interval"; ms: number }
            | { cronspec: string; kind: "cron" };
        },
        string
      >;
    };
  };
};
