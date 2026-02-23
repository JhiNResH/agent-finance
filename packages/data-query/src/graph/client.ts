/**
 * The Graph Subgraph Client
 *
 * Manages connections to The Graph decentralized network subgraphs
 * for Aave V3 and Uniswap V3 across multiple chains.
 *
 * ⚠️  SUBGRAPH NOTES:
 * - The Graph hosted service (api.thegraph.com) shut down Oct 2024
 * - The Graph Studio (api.studio.thegraph.com) requires an API key
 * - For production: get a free API key at thegraph.com/studio/apikeys/
 * - For prototype/demo: uses DEMO_MODE (mock data) when no key is set
 *
 * Subgraph IDs (The Graph Decentralized Network):
 * - Aave V3 Base:      GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF
 * - Aave V3 Arbitrum:  DLuE98kEb5pQNXAcKFQGQgfSQ57Xdou4jnVbAEqMfy3B
 * - Aave V3 Optimism:  DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfQ
 * - Uniswap V3 Base:   43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG
 * - Uniswap V3 Arb:    FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM
 */

import { GraphQLClient } from "graphql-request";
import type { Chain, Protocol, SubgraphEndpoint } from "../types/index.js";

// ---- Configuration ----------------------------------------

const GRAPH_API_KEY = process.env.GRAPH_API_KEY ?? "";
const GATEWAY_BASE = "https://gateway.thegraph.com/api";

// Subgraph IDs on The Graph Decentralized Network
const SUBGRAPH_IDS: Record<string, string> = {
  "aave-v3:base": "GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF",
  "aave-v3:arbitrum": "DLuE98kEb5pQNXAcKFQGQgfSQ57Xdou4jnVbAEqMfy3B",
  "aave-v3:optimism": "DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfQ",
  "uniswap-v3:base": "43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG",
  "uniswap-v3:arbitrum": "FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM",
};

function buildSubgraphUrl(protocol: Protocol, chain: Chain): string {
  const key = `${protocol}:${chain}`;
  const subgraphId = SUBGRAPH_IDS[key];

  if (!subgraphId) {
    throw new Error(`No subgraph ID for ${protocol} on ${chain}`);
  }

  if (GRAPH_API_KEY) {
    return `${GATEWAY_BASE}/${GRAPH_API_KEY}/subgraphs/id/${subgraphId}`;
  }

  // Without API key: use The Graph's public gateway (rate-limited, may 401)
  // For the prototype, DEMO_MODE will be used instead
  return `${GATEWAY_BASE}/[YOUR-API-KEY]/subgraphs/id/${subgraphId}`;
}

// ---- Subgraph Endpoint Registry --------------------------

const SUBGRAPH_ENDPOINTS: SubgraphEndpoint[] = [
  {
    protocol: "aave-v3",
    chain: "base",
    url: buildSubgraphUrl("aave-v3", "base"),
    description: "Aave V3 on Base - TVL, lending rates, reserves",
  },
  {
    protocol: "aave-v3",
    chain: "arbitrum",
    url: buildSubgraphUrl("aave-v3", "arbitrum"),
    description: "Aave V3 on Arbitrum - TVL, lending rates, reserves",
  },
  {
    protocol: "aave-v3",
    chain: "optimism",
    url: buildSubgraphUrl("aave-v3", "optimism"),
    description: "Aave V3 on Optimism - TVL, lending rates, reserves",
  },
  {
    protocol: "uniswap-v3",
    chain: "base",
    url: buildSubgraphUrl("uniswap-v3", "base"),
    description: "Uniswap V3 on Base - pools, TVL, volume",
  },
  {
    protocol: "uniswap-v3",
    chain: "arbitrum",
    url: buildSubgraphUrl("uniswap-v3", "arbitrum"),
    description: "Uniswap V3 on Arbitrum - pools, TVL, volume",
  },
];

// ---- Client Cache -----------------------------------------

const clientCache = new Map<string, GraphQLClient>();

/**
 * Get or create a GraphQL client for the given protocol/chain pair.
 */
export function getSubgraphClient(
  protocol: Protocol,
  chain: Chain
): GraphQLClient {
  const key = `${protocol}:${chain}`;
  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  const endpoint = getEndpoint(protocol, chain);
  if (!endpoint) {
    throw new Error(`No subgraph endpoint found for ${protocol} on ${chain}`);
  }

  const client = new GraphQLClient(endpoint.url, {
    headers: {
      "Content-Type": "application/json",
    },
    fetch: globalThis.fetch,
  });

  clientCache.set(key, client);
  return client;
}

/**
 * Get the endpoint config for a protocol/chain pair.
 */
export function getEndpoint(
  protocol: Protocol,
  chain: Chain
): SubgraphEndpoint | undefined {
  return SUBGRAPH_ENDPOINTS.find(
    (e) => e.protocol === protocol && e.chain === chain
  );
}

/**
 * Get all supported endpoints.
 */
export function getAllEndpoints(): SubgraphEndpoint[] {
  return SUBGRAPH_ENDPOINTS;
}

/**
 * Check if we're in demo mode (no Graph API key).
 */
export function isDemoMode(): boolean {
  return !GRAPH_API_KEY;
}

/**
 * Execute a raw GraphQL query against a subgraph.
 * Throws if no GRAPH_API_KEY is set and DEMO_MODE is not forced off.
 */
export async function querySubgraph<T = unknown>(
  protocol: Protocol,
  chain: Chain,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!GRAPH_API_KEY) {
    throw new Error(
      `GRAPH_API_KEY is required to query live subgraph data. ` +
      `Get a free key at https://thegraph.com/studio/apikeys/ ` +
      `Set DEMO_MODE=true to use mock data instead.`
    );
  }

  const client = getSubgraphClient(protocol, chain);

  try {
    const result = await client.request<T>(query, variables ?? {});
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Subgraph query failed [${protocol}/${chain}]: ${msg}`);
  }
}
