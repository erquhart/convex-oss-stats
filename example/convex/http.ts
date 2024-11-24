import { httpRouter } from "convex/server";
import { ossStats } from "./example";

const http = httpRouter();

ossStats.registerRoutes(http);

export default http;
