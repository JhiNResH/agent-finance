// ============================================================
// Types for Agent Finance Data Query Service
// ============================================================

export type Chain = "base" | "arbitrum" | "optimism" | "ethereum";
export type Protocol = "aave-v3" | "uniswap-v3";

// ---- Subgraph Endpoints -----------------------------------

export interface SubgraphEndpoint {
  protocol: Protocol;
  chain: Chain;
  url: string;
  description: string;
}

// ---- Aave V3 Types ----------------------------------------

export interface AaveReserve {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  totalLiquidity: string;
  totalLiquidityUSD: string;
  totalCurrentVariableDebt: string;
  totalCurrentVariableDebtUSD: string;
  liquidityRate: string; // supply APY (ray format)
  variableBorrowRate: string; // borrow APY (ray format)
  utilizationRate: string;
  price: {
    priceInEth: string;
  };
}

export interface AaveTVL {
  protocol: "aave-v3";
  chain: Chain;
  totalTVLUSD: number;
  reserveCount: number;
  topReserves: AaveReserveFormatted[];
  timestamp: number;
}

export interface AaveReserveFormatted {
  symbol: string;
  name: string;
  tvlUSD: number;
  supplyAPY: number; // percentage
  borrowAPY: number; // percentage
  utilizationRate: number; // percentage
}

export interface AaveLendingRates {
  protocol: "aave-v3";
  chain: Chain;
  rates: AaveReserveFormatted[];
  timestamp: number;
}

// ---- Uniswap V3 Types -------------------------------------

export interface UniswapPool {
  id: string;
  token0: { symbol: string; name: string; decimals: string };
  token1: { symbol: string; name: string; decimals: string };
  feeTier: string;
  liquidity: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  feesUSD: string;
  txCount: string;
  token0Price: string;
  token1Price: string;
}

export interface UniswapTVL {
  protocol: "uniswap-v3";
  chain: Chain;
  totalTVLUSD: number;
  poolCount: number;
  topPools: UniswapPoolFormatted[];
  timestamp: number;
}

export interface UniswapPoolFormatted {
  pair: string;
  feeTier: number; // bps
  tvlUSD: number;
  volume24hUSD: number;
  fees24hUSD: number;
  txCount: number;
  price: string;
}

// ---- Query Response Types ---------------------------------

export interface QueryResult<T = unknown> {
  success: boolean;
  query: string;
  protocol?: Protocol;
  chain?: Chain;
  data?: T;
  error?: string;
  executionTimeMs: number;
  timestamp: number;
}

export interface ProtocolInfo {
  id: Protocol;
  name: string;
  description: string;
  chains: Chain[];
  capabilities: string[];
  subgraphUrls: Record<Chain, string | undefined>;
}

// ---- NLQ Types --------------------------------------------

export interface NLQParsed {
  protocol: Protocol | null;
  chain: Chain | null;
  action: "tvl" | "rates" | "pools" | "volume" | "unknown";
  token?: string;
  limit?: number;
  rawIntent: string;
}

// ---- ACP Types --------------------------------------------

export interface ACPCapability {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  pricing?: {
    model: "free" | "per_call" | "subscription";
    priceUSD?: number;
  };
}

export interface ACPServiceDescriptor {
  name: string;
  version: string;
  description: string;
  category: string;
  chains: Chain[];
  protocols: string[];
  capabilities: ACPCapability[];
  endpoints: {
    query: string;
    protocols: string;
    health: string;
    descriptor: string;
  };
  metadata: {
    author: string;
    repository: string;
    license: string;
    createdAt: string;
  };
}
