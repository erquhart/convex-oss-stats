/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib from "../lib.js";

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
  lib: typeof lib;
}>;
export type Mounts = {
  lib: {
    getGithubOwner: FunctionReference<
      "query",
      "public",
      { owner: string },
      any
    >;
    getNpmOrg: FunctionReference<"query", "public", { name: string }, any>;
    sync: FunctionReference<
      "action",
      "public",
      {
        githubAccessToken: string;
        githubOwners: Array<string>;
        minStars: number;
        npmOrgs: Array<string>;
      },
      any
    >;
    updateGithubOwner: FunctionReference<
      "mutation",
      "public",
      {
        contributorCount?: number;
        dependentCount?: number;
        owner: string;
        starCount?: number;
      },
      any
    >;
    updateGithubRepoStars: FunctionReference<
      "mutation",
      "public",
      {
        githubAccessToken: string;
        name: string;
        owner: string;
        starCount?: number;
      },
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
    updateNpmOrg: FunctionReference<
      "mutation",
      "public",
      { dayOfWeekAverages: Array<number>; downloadCount: number; name: string },
      any
    >;
    updateNpmPackages: FunctionReference<
      "mutation",
      "public",
      {
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
