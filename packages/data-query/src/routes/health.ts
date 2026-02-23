/**
 * GET /health - Service health check endpoint
 */

import { Hono } from "hono";
import { querySubgraph } from "../graph/client.js";

const healthRouter = new Hono();

interface SubgraphHealth {
  protocol: string;
  chain: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  error?: string;
}

async function checkSubgraphHealth(
  protocol: "aave-v3" | "uniswap-v3",
  chain: "base" | "arbitrum" | "optimism"
): Promise<SubgraphHealth> {
  const start = Date.now();

  try {
    // Simple meta query to check connectivity
    const metaQuery = /* GraphQL */ `
      query HealthCheck {
        _meta {
          block { number }
          deployment
          hasIndexingErrors
        }
      }
    `;

    const data = await querySubgraph<{
      _meta: { block: { number: number }; hasIndexingErrors: boolean };
    }>(protocol, chain, metaQuery);

    const latencyMs = Date.now() - start;
    const hasErrors = data._meta?.hasIndexingErrors ?? false;

    return {
      protocol,
      chain,
      status: hasErrors ? "degraded" : "healthy",
      latencyMs,
    };
  } catch (error: unknown) {
    return {
      protocol,
      chain,
      status: "down",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

healthRouter.get("/", async (c) => {
  const detailed = c.req.query("detailed") === "true";

  const baseHealth = {
    service: "agent-finance/data-query",
    version: "0.1.0",
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
  };

  if (!detailed) {
    return c.json(baseHealth);
  }

  // Check all subgraph connections
  const checks = await Promise.allSettled([
    checkSubgraphHealth("aave-v3", "base"),
    checkSubgraphHealth("aave-v3", "arbitrum"),
    checkSubgraphHealth("aave-v3", "optimism"),
    checkSubgraphHealth("uniswap-v3", "base"),
    checkSubgraphHealth("uniswap-v3", "arbitrum"),
  ]);

  const subgraphStatuses = checks.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { protocol: "unknown", chain: "unknown", status: "down" as const, error: "Check failed" }
  );

  const allHealthy = subgraphStatuses.every((s) => s.status === "healthy");
  const anyDown = subgraphStatuses.some((s) => s.status === "down");
  const overallStatus = allHealthy ? "healthy" : anyDown ? "degraded" : "degraded";

  return c.json({
    ...baseHealth,
    status: overallStatus,
    subgraphs: subgraphStatuses,
    claudeApiConfigured: !!process.env.ANTHROPIC_API_KEY,
    graphApiKeyConfigured: !!process.env.GRAPH_API_KEY,
  });
});

export { healthRouter };
