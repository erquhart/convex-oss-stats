import {
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
  httpActionGeneric,
  HttpRouter,
  internalActionGeneric,
  queryGeneric,
} from "convex/server";
import { GenericId, v } from "convex/values";
import { api } from "../component/_generated/api";
import { Webhooks } from "@octokit/webhooks";

export class OssStats {
  public githubAccessToken: string;
  public githubWebhookSecret: string;
  public githubOwners: string[];
  public npmOrgs: string[];
  public minStars: number;
  constructor(
    public component: UseApi<typeof api>,
    public options?: {
      githubAccessToken?: string;
      githubWebhookSecret?: string;
      githubOwners?: string[];
      npmOrgs?: string[];
      minStars?: number;
    }
  ) {
    this.githubAccessToken =
      options?.githubAccessToken ?? process.env.GITHUB_ACCESS_TOKEN!;
    this.githubWebhookSecret =
      options?.githubWebhookSecret ?? process.env.GITHUB_WEBHOOK_SECRET!;
    this.githubOwners = options?.githubOwners ?? [];
    this.npmOrgs = options?.npmOrgs ?? [];
    this.minStars = options?.minStars ?? 1;
    if (!this.githubAccessToken) {
      throw new Error("GITHUB_ACCESS_TOKEN is required");
    }
  }

  registerRoutes(
    http: HttpRouter,
    {
      path = "/events/github",
    }: {
      path?: string;
    } = {}
  ) {
    http.route({
      path,
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const webhooks = new Webhooks({
          secret: this.githubWebhookSecret,
        });

        const signature = request.headers.get("x-hub-signature-256")!;
        const bodyString = await request.text();

        if (!(await webhooks.verify(bodyString, signature))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const body = JSON.parse(bodyString);
        const {
          repository: { name, owner, stargazers_count: stars },
        } = body;
        await ctx.runMutation(this.component.lib.updateGithubRepoStars, {
          owner: owner.login,
          name,
          starCount: stars,
          githubAccessToken: this.githubAccessToken,
        });
        return new Response(null, { status: 200 });
      }),
    });
  }

  async sync(ctx: RunActionCtx) {
    return await ctx.runAction(this.component.lib.sync, {
      githubAccessToken: this.githubAccessToken,
      githubOwners: this.githubOwners,
      npmOrgs: this.npmOrgs,
      minStars: this.minStars,
    });
  }

  async getGithubOwner(ctx: RunQueryCtx, owner: string) {
    return await ctx.runQuery(this.component.lib.getGithubOwner, {
      owner,
    });
  }

  async getNpmOrg(ctx: RunQueryCtx, name: string) {
    return await ctx.runQuery(this.component.lib.getNpmOrg, {
      name,
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
      getGithubOwner: queryGeneric({
        args: {
          owner: v.string(),
        },
        handler: async (ctx, args) => {
          return await this.getGithubOwner(ctx, args.owner);
        },
      }),
      getNpmOrg: queryGeneric({
        args: {
          name: v.string(),
        },
        handler: async (ctx, args) => {
          return await this.getNpmOrg(ctx, args.name);
        },
      }),
    };
  }
}

/* Type utils follow */

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

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
