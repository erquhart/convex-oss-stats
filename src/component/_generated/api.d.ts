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
    initGithubOwner: FunctionReference<
      "mutation",
      "public",
      { owner: string },
      any
    >;
    sync: FunctionReference<
      "action",
      "public",
      { githubOwners: Array<string>; personalAccessToken: string },
      any
    >;
    updateGithubOwner: FunctionReference<
      "mutation",
      "public",
      { owner: string; stars: number },
      any
    >;
    updateGithubStars: FunctionReference<
      "mutation",
      "public",
      { repos: Array<{ name: string; owner: string; stars: number }> },
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

export declare const components: {};
