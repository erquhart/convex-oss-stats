import "./App.css";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  useNpmDownloadCounter,
  useGithubDependentCounter,
} from "@convex-dev/oss-stats/react";

function App() {
  const githubOwner =
    useQuery(api.example.getGithubOwner, {
      owner: "get-convex",
    }) ?? null;
  const npmOwner =
    useQuery(api.example.getNpmOrg, {
      name: "convex-dev",
    }) ?? null;

  // Source data for these two values are not possible to get live, so we use
  // previous values to count up based on averages.
  const liveNpmDownloadCount = useNpmDownloadCounter(npmOwner);
  const liveGithubDependentCount = useGithubDependentCounter(githubOwner);

  return (
    <>
      <h1>Convex OssStats Component Example</h1>

      <div className="card">
        <div>
          <p>Github Owner: {githubOwner?.name}</p>
          <p>Github Dependent Count: {liveGithubDependentCount}</p>
          <p>Github Stars: {githubOwner?.starCount}</p>
          <p>NPM Owner: {npmOwner?.name}</p>
          <p>NPM Download Count: {liveNpmDownloadCount}</p>
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
