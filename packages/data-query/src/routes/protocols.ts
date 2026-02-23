/**
 * GET /protocols - List supported DeFi protocols and their capabilities
 */

import { Hono } from "hono";
import { getAllEndpoints } from "../graph/client.js";
import type { ProtocolInfo } from "../types/index.js";

const protocolsRouter = new Hono();

const PROTOCOLS: ProtocolInfo[] = [
  {
    id: "aave-v3",
    name: "Aave V3",
    description:
      "Decentralized lending protocol. Deposit assets to earn interest, borrow against collateral.",
    chains: ["base", "arbitrum", "optimism"],
    capabilities: [
      "Total Value Locked (TVL)",
      "Supply / borrow APY rates",
      "Reserve utilization",
      "Top reserves by liquidity",
    ],
    subgraphUrls: {
      base: "The Graph - Aave V3 Base",
      arbitrum: "The Graph - Aave V3 Arbitrum",
      optimism: "The Graph - Aave V3 Optimism",
      ethereum: undefined,
    },
  },
  {
    id: "uniswap-v3",
    name: "Uniswap V3",
    description:
      "Leading decentralized exchange (DEX) with concentrated liquidity AMM model.",
    chains: ["base", "arbitrum"],
    capabilities: [
      "Total Value Locked (TVL)",
      "Top pools by TVL / volume",
      "Pool fees and volume",
      "Token pair prices",
    ],
    subgraphUrls: {
      base: "The Graph - Uniswap V3 Base",
      arbitrum: "The Graph - Uniswap V3 Arbitrum",
      optimism: undefined,
      ethereum: undefined,
    },
  },
  {
    id: "morpho-blue",
    name: "Morpho Blue",
    description:
      "Permissionless isolated lending markets and curated vaults. Efficient collateralized borrowing with customizable risk parameters.",
    chains: ["base", "ethereum"],
    capabilities: [
      "Total Value Locked (TVL) per market",
      "Supply / borrow APY rates per market",
      "Market utilization",
      "Top vaults by TVL",
      "Curated vault yield (net APY)",
    ],
    subgraphUrls: {
      base: "Morpho Blue API - https://blue-api.morpho.org/graphql",
      ethereum: "Morpho Blue API - https://blue-api.morpho.org/graphql",
      arbitrum: undefined,
      optimism: undefined,
    },
  },
];

protocolsRouter.get("/", (c) => {
  const endpoints = getAllEndpoints();

  const summary = {
    count: PROTOCOLS.length,
    protocols: PROTOCOLS,
    subgraphEndpoints: endpoints.map((e) => ({
      protocol: e.protocol,
      chain: e.chain,
      description: e.description,
    })),
    queryExamples: [
      "GET /query?q=Aave TVL on Base",
      "GET /query?q=Uniswap top pools on Arbitrum",
      "GET /query?q=Aave lending rates on Optimism",
      "GET /query?q=What is the best yield on Aave?",
      "GET /query?q=Uniswap volume on Base",
      "GET /query?q=Morpho TVL on Base",
      "GET /query?q=Top Morpho vaults",
      "GET /query?q=Morpho lending rates on Ethereum",
      "GET /query?q=Best yield on Morpho",
    ],
  };

  return c.json(summary);
});

protocolsRouter.get("/:id", (c) => {
  const id = c.req.param("id");
  const protocol = PROTOCOLS.find((p) => p.id === id);

  if (!protocol) {
    return c.json(
      {
        error: `Protocol '${id}' not found`,
        available: PROTOCOLS.map((p) => p.id),
      },
      404
    );
  }

  return c.json(protocol);
});

export { protocolsRouter };
