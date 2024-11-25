import { v } from "convex/values";
import * as cheerio from "cheerio";
import { chunk } from "remeda";
import { internalAction } from "./_generated/server";

export const getNpmOrgPackages = internalAction({
  args: { orgName: v.string() },
  handler: async (_ctx, args) => {
    const html = await fetch("https://example.com").then((res) => res.text());
    const $ = cheerio.load(html);
    console.log($.html());
    /*
    const npm = new NpmApi();
    let nextUrlSuffix = "";
    const packages = [];
    do {
      const response = await fetch(
        `https://www.npmjs.com/org/${args.orgName}${nextUrlSuffix}`,
        {
          headers: {
            "cache-control": "no-cache",
            "x-spiferack": "1",
          },
        }
      );
      const json: {
        packages: {
          objects: { name: string }[];
          urls: { next: string };
        };
      } = await response.json();
      nextUrlSuffix = json.packages.urls.next;
      packages.push(...json.packages.objects.map((pkg) => pkg.name));
    } while (nextUrlSuffix);
    const packagesWithDownloadCount = await Promise.all(
      chunk(packages, 5).map(async (pkgChunk) => {
        return Promise.all(
          pkgChunk.map(async (pkg) => {
            const downloadCount = await npm.repo(pkg).total();
            return { name: pkg, downloadCount };
          })
        );
      })
    );
    return { name: args.orgName, packages: packagesWithDownloadCount };
    */
  },
});
