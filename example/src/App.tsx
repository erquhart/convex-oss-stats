import "./App.css";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  useGithubDependentCounter,
  useNpmDownloadCounter,
} from "../../src/react";

function App() {
  const githubOwner =
    useQuery(api.example.getGithubOwner, {
      owner: "tanstack",
    }) ?? null;
  const npmOwner =
    useQuery(api.example.getNpmOrg, {
      name: "tanstack",
    }) ?? null;
  const githubRepo =
    useQuery(api.example.getGithubRepo, {
      name: "get-convex/better-auth",
    }) ?? null;
  const npmPackage =
    useQuery(api.example.getNpmPackage, {
      name: "@convex-dev/better-auth",
    }) ?? null;

  // Source data for this value is not possible to get live, so we use
  // previous values to forecast based on averages.
  const liveNpmDownloadCount = useNpmDownloadCounter(npmOwner);
  const liveGithubDependentCount = useGithubDependentCounter(githubOwner);
  return (
    <>
      <h1>Convex OssStats Component Example</h1>

      <div className="card">
        <div>
          <p>Github Owner: {githubOwner?.name}</p>
          <p>Github Dependent Count: {liveGithubDependentCount.count}</p>
          <p>Github Stars: {githubOwner?.starCount}</p>
          <p>
            Github Repo: {githubRepo?.owner}/{githubRepo?.name}
          </p>
          <p>Github Repo Download Count: {githubRepo?.dependentCount}</p>
          <p>Github Repo Contributor Count: {githubRepo?.contributorCount}</p>
          <p>Github Repo Star Count: {githubRepo?.starCount}</p>

          <p>NPM Owner: {npmOwner?.name}</p>
          <p>NPM Download Count: {liveNpmDownloadCount.count}</p>
          <p>NPM Package: {npmPackage?.name}</p>
          <p>NPM Package Download Count: {npmPackage?.downloadCount}</p>
        </div>
        <p>
          See <code>example/convex/example.ts</code> for all the ways to use
          this component
        </p>
      </div>
    </>
  );
}

export default App;
