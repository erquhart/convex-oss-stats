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
  public personalAccessToken: string;
  public githubWebhookSecret: string;
  public githubOwners: string[];
  constructor(
    public component: UseApi<typeof api>,
    public options?: {
      personalAccessToken?: string;
      githubWebhookSecret?: string;
      githubOwners?: string[];
    }
  ) {
    this.personalAccessToken =
      options?.personalAccessToken ?? process.env.GITHUB_ACCESS_TOKEN!;
    this.githubWebhookSecret =
      options?.githubWebhookSecret ?? process.env.GITHUB_WEBHOOK_SECRET!;
    this.githubOwners = options?.githubOwners ?? [];
    if (!this.personalAccessToken) {
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
      handler: httpActionGeneric(async (_ctx, request) => {
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
        await _ctx.runMutation(this.component.lib.updateGithubRepoStars, {
          owner: owner.login,
          name,
          stars,
        });
        return new Response(null, { status: 200 });
      }),
    });
  }

  async sync(ctx: RunActionCtx) {
    return await ctx.runAction(this.component.lib.sync, {
      personalAccessToken: this.personalAccessToken,
      githubOwners: this.githubOwners,
    });
  }

  async getGithubOwnerStars(ctx: RunQueryCtx, owner: string) {
    return await ctx.runQuery(this.component.lib.getGithubOwnerStars, {
      owner,
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
      getGithubOwnerStars: queryGeneric({
        args: {
          owner: v.string(),
        },
        handler: async (ctx, args) => {
          return await this.getGithubOwnerStars(ctx, args.owner);
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
