/**
 * Agent Finance - Data Query Service
 *
 * DeFi data query service with natural language interface.
 * Queries The Graph subgraphs for Aave V3 and Uniswap V3 data.
 *
 * Endpoints:
 *   GET /query?q=<natural language query>
 *   GET /protocols
 *   GET /health
 *   GET /acp/service-descriptor
 */

import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { queryRouter } from "./routes/query.js";
import { protocolsRouter } from "./routes/protocols.js";
import { healthRouter } from "./routes/health.js";
import { acpRouter } from "./routes/acp.js";
import { rateLimit } from "./middleware/rateLimit.js";

// ---- App Setup -------------------------------------------

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", cors({ origin: "*" }));
app.use(
  "*",
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per IP
  })
);

// ---- Routes ----------------------------------------------

app.route("/query", queryRouter);
app.route("/protocols", protocolsRouter);
app.route("/health", healthRouter);
app.route("/acp", acpRouter);

// Root - API info
app.get("/", (c) => {
  return c.json({
    name: "agent-finance/data-query",
    version: "0.1.0",
    description: "DeFi Data Query Service with natural language interface",
    endpoints: {
      "GET /query?q=<query>": "Natural language DeFi query",
      "GET /protocols": "List supported protocols",
      "GET /protocols/:id": "Get protocol details",
      "GET /health": "Service health check",
      "GET /health?detailed=true": "Detailed health with subgraph status",
      "GET /acp/service-descriptor": "ACP service metadata",
    },
    examples: [
      "/query?q=Aave TVL on Base",
      "/query?q=Top Uniswap pools on Arbitrum",
      "/query?q=Aave lending rates on Optimism",
      "/query?q=What is the best yield on Aave?",
      "/query?q=Uniswap volume on Base",
    ],
    powered_by: ["The Graph", "Claude AI", "Hono", "TypeScript"],
    repository: "https://github.com/JhiNResH/agent-finance",
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: `Route not found: ${c.req.method} ${c.req.path}`,
      availableRoutes: ["/query", "/protocols", "/health", "/acp"],
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      success: false,
      error: "Internal server error",
      message: err.message,
    },
    500
  );
});

// ---- Start Server ----------------------------------------

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

serve(
  {
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  },
  (info) => {
    console.log(`\n🚀 Agent Finance Data Query Service`);
    console.log(`📡 Server running at http://${HOST}:${info.port}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   GET http://localhost:${info.port}/query?q=Aave+TVL+on+Base`);
    console.log(`   GET http://localhost:${info.port}/protocols`);
    console.log(`   GET http://localhost:${info.port}/health`);
    console.log(`   GET http://localhost:${info.port}/acp/service-descriptor`);
    console.log(`\n🔑 Config:`);
    console.log(
      `   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? "✅ set" : "❌ not set (NLQ will use rule-based fallback)"}`
    );
    console.log(
      `   GRAPH_API_KEY: ${process.env.GRAPH_API_KEY ? "✅ set" : "⚠️  not set (using public endpoints)"}`
    );
    console.log(`\n`);
  }
);

export { app };
