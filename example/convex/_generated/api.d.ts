/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as example from "../example.js";
import type * as http from "../http.js";

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
  crons: typeof crons;
  example: typeof example;
  http: typeof http;
}>;
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
  ossStats: {
    lib: {
      getGithubOwners: FunctionReference<
        "query",
        "internal",
        { owners: Array<string> },
        Array<null | {
          contributorCount: number;
          dependentCount: number;
          dependentCountComparison?: { count: number; updatedAt: number };
          dependentCountPrevious?: { count: number; updatedAt: number };
          name: string;
          nameNormalized: string;
          starCount: number;
          updatedAt: number;
        }>
      >;
      getNpmOrgs: FunctionReference<
        "query",
        "internal",
        { names: Array<string> },
        Array<null | {
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          name: string;
          updatedAt: number;
        }>
      >;
      sync: FunctionReference<
        "action",
        "internal",
        {
          githubAccessToken: string;
          githubOwners: Array<string>;
          minStars: number;
          npmOrgs: Array<string>;
        },
        null
      >;
      updateGithubOwner: FunctionReference<
        "mutation",
        "internal",
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
        "internal",
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
        "internal",
        {
          repos: Array<{
            contributorCount: number;
            dependentCount: number;
            dependentCountPrevious?: { count: number; updatedAt: number };
            name: string;
            owner: string;
            starCount: number;
          }>;
        },
        any
      >;
      updateNpmOrg: FunctionReference<
        "mutation",
        "internal",
        {
          dayOfWeekAverages: Array<number>;
          downloadCount: number;
          name: string;
        },
        any
      >;
      updateNpmPackages: FunctionReference<
        "mutation",
        "internal",
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
};
