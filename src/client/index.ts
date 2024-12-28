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

  /**
   * Registers routes for the webhook to sync GitHub stars.
   * @param http - The http router exposed in convex/http.ts
   * @param options - For overriding the default `/events/github` path.
   */
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
          repository,
        }: {
          repository: {
            name: string;
            owner: { login: string };
            stargazers_count: number;
          };
        } = body;
        await ctx.runMutation(this.component.github.updateGithubRepoStars, {
          owner: repository.owner.login,
          name: repository.name,
          starCount: repository.stargazers_count,
        });
        return new Response(null, { status: 200 });
      }),
    });
  }

  async sync(ctx: RunActionCtx) {
    return ctx.runAction(this.component.lib.sync, {
      githubAccessToken: this.githubAccessToken,
      githubOwners: this.githubOwners,
      npmOrgs: this.npmOrgs,
      minStars: this.minStars,
    });
  }

  /**
   * Gets GitHub data for a given owner.
   * @param ctx - The ctx from your query or mutation.
   * @param owner - The owner to get data for.
   */
  async getGithubOwner(ctx: RunQueryCtx, owner: string) {
    return (
      await ctx.runQuery(this.component.github.getGithubOwners, {
        owners: [owner],
      })
    )[0];
  }

  /**
   * Gets GitHub data for the owners you've configured.
   * @param ctx - The ctx from your query or mutation.
   */
  async getAllGithubOwners(ctx: RunQueryCtx) {
    return (
      await ctx.runQuery(this.component.github.getGithubOwners, {
        owners: this.githubOwners,
      })
    ).flatMap((owner) => (owner ? [owner] : []));
  }

  /**
   * Gets the npm download count for a given org.
   * @param ctx - The ctx from your query or mutation.
   * @param name - The name of the org to get the download count for.
   */
  async getNpmOrg(ctx: RunQueryCtx, name: string) {
    return (
      await ctx.runQuery(this.component.npm.getNpmOrgs, {
        names: [name],
      })
    )[0];
  }

  /**
   * Gets the npm download count for the orgs you've configured.
   * @param ctx - The ctx from your query or mutation.
   */
  async getAllNpmOrgs(ctx: RunQueryCtx) {
    return (
      await ctx.runQuery(this.component.npm.getNpmOrgs, {
        names: this.npmOrgs,
      })
    ).flatMap((org) => (org ? [org] : []));
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
        handler: (ctx, _args) => {
          return this.sync(ctx);
        },
      }),
      getGithubOwner: queryGeneric({
        args: {
          owner: v.string(),
        },
        handler: (ctx, args) => {
          return this.getGithubOwner(ctx, args.owner);
        },
      }),
      getAllGithubOwners: queryGeneric({
        args: {},
        handler: (ctx) => {
          return this.getAllGithubOwners(ctx);
        },
      }),
      getNpmOrg: queryGeneric({
        args: {
          name: v.string(),
        },
        handler: (ctx, args) => {
          return this.getNpmOrg(ctx, args.name);
        },
      }),
      getAllNpmOrgs: queryGeneric({
        args: {},
        handler: (ctx) => {
          return this.getAllNpmOrgs(ctx);
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
