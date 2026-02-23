/**
 * GET /acp/service-descriptor - ACP (Agent Communication Protocol) service metadata
 *
 * Returns a machine-readable descriptor that other agents can use to discover
 * and invoke this service's capabilities.
 */

import { Hono } from "hono";
import type { ACPServiceDescriptor } from "../types/index.js";

const acpRouter = new Hono();

const SERVICE_DESCRIPTOR: ACPServiceDescriptor = {
  name: "agent-finance/data-query",
  version: "0.1.0",
  description:
    "DeFi Data Query Service. Query TVL, lending rates, and pool data for Aave V3 and Uniswap V3 using natural language. Powered by The Graph subgraphs and Claude AI.",
  category: "defi-data",
  chains: ["base", "arbitrum", "optimism"],
  protocols: ["aave-v3", "uniswap-v3"],
  capabilities: [
    {
      id: "natural-language-query",
      name: "Natural Language Query",
      description:
        "Execute DeFi data queries using natural language. Supports Aave TVL, lending rates, Uniswap pools, and more.",
      inputSchema: {
        type: "object",
        required: ["q"],
        properties: {
          q: {
            type: "string",
            description: "Natural language query (e.g., 'Aave TVL on Base')",
            examples: [
              "Aave TVL on Base",
              "Top Uniswap pools on Arbitrum",
              "Aave lending rates on Optimism",
              "Uniswap volume on Base",
            ],
          },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          query: { type: "string" },
          protocol: { type: "string", enum: ["aave-v3", "uniswap-v3"] },
          chain: {
            type: "string",
            enum: ["base", "arbitrum", "optimism", "ethereum"],
          },
          data: { type: "object", description: "Protocol-specific data" },
          executionTimeMs: { type: "number" },
          timestamp: { type: "number" },
        },
      },
      pricing: {
        model: "free",
      },
    },
    {
      id: "aave-tvl",
      name: "Aave V3 TVL",
      description:
        "Get total value locked in Aave V3 for a specific chain or all chains.",
      inputSchema: {
        type: "object",
        properties: {
          chain: {
            type: "string",
            enum: ["base", "arbitrum", "optimism"],
            description: "Target chain (omit for all chains)",
          },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          protocol: { type: "string", const: "aave-v3" },
          chain: { type: "string" },
          totalTVLUSD: { type: "number" },
          reserveCount: { type: "number" },
          topReserves: { type: "array" },
          timestamp: { type: "number" },
        },
      },
      pricing: { model: "free" },
    },
    {
      id: "aave-lending-rates",
      name: "Aave V3 Lending Rates",
      description:
        "Get supply APY and borrow APY for all assets on Aave V3 for a given chain.",
      inputSchema: {
        type: "object",
        required: ["chain"],
        properties: {
          chain: {
            type: "string",
            enum: ["base", "arbitrum", "optimism"],
          },
          limit: {
            type: "number",
            default: 10,
            description: "Number of assets to return",
          },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          protocol: { type: "string", const: "aave-v3" },
          chain: { type: "string" },
          rates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                symbol: { type: "string" },
                supplyAPY: { type: "number", description: "Percentage" },
                borrowAPY: { type: "number", description: "Percentage" },
                tvlUSD: { type: "number" },
                utilizationRate: { type: "number" },
              },
            },
          },
        },
      },
      pricing: { model: "free" },
    },
    {
      id: "uniswap-tvl",
      name: "Uniswap V3 TVL",
      description:
        "Get total value locked in Uniswap V3 for a specific chain or all chains.",
      inputSchema: {
        type: "object",
        properties: {
          chain: {
            type: "string",
            enum: ["base", "arbitrum"],
            description: "Target chain (omit for all chains)",
          },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          protocol: { type: "string", const: "uniswap-v3" },
          chain: { type: "string" },
          totalTVLUSD: { type: "number" },
          poolCount: { type: "number" },
          topPools: { type: "array" },
          timestamp: { type: "number" },
        },
      },
      pricing: { model: "free" },
    },
    {
      id: "uniswap-pools",
      name: "Uniswap V3 Top Pools",
      description:
        "Get top liquidity pools on Uniswap V3 ordered by TVL, volume, or fees.",
      inputSchema: {
        type: "object",
        required: ["chain"],
        properties: {
          chain: {
            type: "string",
            enum: ["base", "arbitrum"],
          },
          limit: { type: "number", default: 10 },
          orderBy: {
            type: "string",
            enum: ["tvl", "volume", "fees"],
            default: "tvl",
          },
        },
      },
      outputSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pair: { type: "string" },
            feeTier: { type: "number" },
            tvlUSD: { type: "number" },
            volume24hUSD: { type: "number" },
            fees24hUSD: { type: "number" },
            txCount: { type: "number" },
            price: { type: "string" },
          },
        },
      },
      pricing: { model: "free" },
    },
  ],
  endpoints: {
    query: "GET /query?q={naturalLanguageQuery}",
    protocols: "GET /protocols",
    health: "GET /health",
    descriptor: "GET /acp/service-descriptor",
  },
  metadata: {
    author: "JhiNResH / Jensen Huang Agent",
    repository: "https://github.com/JhiNResH/agent-finance",
    license: "MIT",
    createdAt: "2026-02-22",
  },
};

acpRouter.get("/service-descriptor", (c) => {
  return c.json(SERVICE_DESCRIPTOR);
});

// Also expose at /acp for discoverability
acpRouter.get("/", (c) => {
  return c.json({
    service: "ACP Endpoint",
    endpoints: [
      {
        path: "/acp/service-descriptor",
        description: "Full ACP service descriptor with capabilities",
      },
    ],
  });
});

export { acpRouter };
