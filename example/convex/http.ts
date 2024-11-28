import { httpRouter } from "convex/server";
import { ossStats } from "./example";

const http = httpRouter();

// Register routes
// Publishes /events/github endpoint for live star count updates via webhook
ossStats.registerRoutes(http);

export default http;
