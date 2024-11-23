import {
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  internalActionGeneric,
} from "convex/server";
import { GenericId } from "convex/values";
import { api } from "../component/_generated/api";

export class OssStats {
  public personalAccessToken: string;
  constructor(
    public component: UseApi<typeof api>,
    public options?: { personalAccessToken?: string }
  ) {
    this.personalAccessToken =
      options?.personalAccessToken ?? process.env.GITHUB_ACCESS_TOKEN!;
    if (!this.personalAccessToken) {
      throw new Error("Personal access token is required");
    }
  }

  async sync(ctx: RunActionCtx) {
    return await ctx.runAction(this.component.lib.sync, {
      personalAccessToken: this.personalAccessToken,
      githubOwners: ["TanStack"],
    });
  }
  /**
   * For easy re-exporting.
   * Apps can do
   * ```ts
   * export const { add, count } = ossStats.api();
   * ```
   */
  api() {
    return {
      sync: internalActionGeneric({
        handler: async (ctx, _args) => {
          await this.sync(ctx);
        },
      }),
    };
  }
}

/* Type utils follow */

type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};

export type OpaqueIds<T> = T extends GenericId<infer _T> | string
  ? string
  : T extends (infer U)[]
    ? OpaqueIds<U>[]
    : T extends ArrayBuffer
      ? ArrayBuffer
      : T extends object
        ? { [K in keyof T]: OpaqueIds<T[K]> }
        : T;

export type UseApi<API> = Expand<{
  [mod in keyof API]: API[mod] extends FunctionReference<
    infer FType,
    "public",
    infer FArgs,
    infer FReturnType,
    infer FComponentPath
  >
    ? FunctionReference<
        FType,
        "internal",
        OpaqueIds<FArgs>,
        OpaqueIds<FReturnType>,
        FComponentPath
      >
    : UseApi<API[mod]>;
}>;
