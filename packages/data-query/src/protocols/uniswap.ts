/**
 * Uniswap V3 Protocol Module
 *
 * Queries Uniswap V3 subgraphs for:
 * - Total Value Locked (TVL) by chain
 * - Top liquidity pools
 * - Pool volume & fees
 *
 * Falls back to demo data when GRAPH_API_KEY is not set.
 * Set DEMO_MODE=true to always use demo data.
 */

import { isDemoMode, querySubgraph } from "../graph/client.js";
import type {
  Chain,
  UniswapPool,
  UniswapPoolFormatted,
  UniswapTVL,
} from "../types/index.js";

// ---- GraphQL Queries --------------------------------------

const UNISWAP_POOLS_QUERY = /* GraphQL */ `
  query UniswapPools($first: Int!, $orderBy: String!, $orderDirection: String!) {
    pools(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      token0 { symbol name decimals }
      token1 { symbol name decimals }
      feeTier
      liquidity
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      token0Price
      token1Price
    }
  }
`;

const UNISWAP_FACTORY_QUERY = /* GraphQL */ `
  query UniswapFactory {
    factories(first: 1) {
      id
      poolCount
      txCount
      totalValueLockedUSD
      totalVolumeUSD
    }
  }
`;

// ---- Demo Data -------------------------------------------

type ChainDemoData = Record<string, UniswapPoolFormatted[]>;

const DEMO_POOLS: ChainDemoData = {
  base: [
    {
      pair: "USDC/WETH",
      feeTier: 5,
      tvlUSD: 48_200_000,
      volume24hUSD: 32_500_000,
      fees24hUSD: 16_250,
      txCount: 18432,
      price: "1 USDC = 0.000282 WETH",
    },
    {
      pair: "WETH/cbBTC",
      feeTier: 30,
      tvlUSD: 29_800_000,
      volume24hUSD: 8_900_000,
      fees24hUSD: 26_700,
      txCount: 4821,
      price: "1 WETH = 0.027143 cbBTC",
    },
    {
      pair: "USDC/USDbC",
      feeTier: 1,
      tvlUSD: 18_700_000,
      volume24hUSD: 45_200_000,
      fees24hUSD: 4_520,
      txCount: 29847,
      price: "1 USDC = 0.999972 USDbC",
    },
    {
      pair: "WETH/DAI",
      feeTier: 30,
      tvlUSD: 11_400_000,
      volume24hUSD: 5_200_000,
      fees24hUSD: 15_600,
      txCount: 3214,
      price: "1 WETH = 2847.32 DAI",
    },
    {
      pair: "USDC/CBETH",
      feeTier: 5,
      tvlUSD: 8_900_000,
      volume24hUSD: 3_400_000,
      fees24hUSD: 1_700,
      txCount: 1987,
      price: "1 USDC = 0.000323 CBETH",
    },
    {
      pair: "WETH/wstETH",
      feeTier: 1,
      tvlUSD: 6_200_000,
      volume24hUSD: 2_100_000,
      fees24hUSD: 210,
      txCount: 892,
      price: "1 WETH = 0.941782 wstETH",
    },
  ],
  arbitrum: [
    {
      pair: "USDC/WETH",
      feeTier: 5,
      tvlUSD: 127_400_000,
      volume24hUSD: 89_700_000,
      fees24hUSD: 44_850,
      txCount: 52847,
      price: "1 USDC = 0.000282 WETH",
    },
    {
      pair: "WBTC/WETH",
      feeTier: 30,
      tvlUSD: 68_900_000,
      volume24hUSD: 28_300_000,
      fees24hUSD: 84_900,
      txCount: 12483,
      price: "1 WBTC = 35.248 WETH",
    },
    {
      pair: "USDT/USDC",
      feeTier: 1,
      tvlUSD: 52_300_000,
      volume24hUSD: 98_400_000,
      fees24hUSD: 9_840,
      txCount: 71293,
      price: "1 USDT = 1.000018 USDC",
    },
    {
      pair: "ARB/WETH",
      feeTier: 30,
      tvlUSD: 38_700_000,
      volume24hUSD: 22_100_000,
      fees24hUSD: 66_300,
      txCount: 24187,
      price: "1 ARB = 0.000312 WETH",
    },
    {
      pair: "WETH/DAI",
      feeTier: 30,
      tvlUSD: 24_100_000,
      volume24hUSD: 12_800_000,
      fees24hUSD: 38_400,
      txCount: 8934,
      price: "1 WETH = 2849.17 DAI",
    },
    {
      pair: "WBTC/USDC",
      feeTier: 30,
      tvlUSD: 19_800_000,
      volume24hUSD: 15_400_000,
      fees24hUSD: 46_200,
      txCount: 6821,
      price: "1 WBTC = 98245.30 USDC",
    },
  ],
};

const DEMO_TVL: Record<string, number> = {
  base: 183_500_000,
  arbitrum: 524_800_000,
};

const DEMO_POOL_COUNT: Record<string, number> = {
  base: 2847,
  arbitrum: 8934,
};

// ---- Conversion Helpers -----------------------------------

function parseUSD(val: string | undefined | null): number {
  const n = parseFloat(val ?? "0");
  return isNaN(n) ? 0 : n;
}

function parseFeeTier(feeTier: string): number {
  return parseInt(feeTier, 10) / 100;
}

function formatPool(pool: UniswapPool): UniswapPoolFormatted {
  const pair = `${pool.token0.symbol}/${pool.token1.symbol}`;
  const tvlUSD = parseUSD(pool.totalValueLockedUSD);
  const volume24hUSD = parseUSD(pool.volumeUSD);
  const fees24hUSD = parseUSD(pool.feesUSD);
  const txCount = parseInt(pool.txCount ?? "0", 10);
  const price = `1 ${pool.token0.symbol} = ${parseFloat(pool.token0Price).toFixed(6)} ${pool.token1.symbol}`;

  return {
    pair,
    feeTier: parseFeeTier(pool.feeTier),
    tvlUSD,
    volume24hUSD,
    fees24hUSD,
    txCount,
    price,
  };
}

// ---- Public API ------------------------------------------

const SUPPORTED_CHAINS: Chain[] = ["base", "arbitrum"];

function isDemo(): boolean {
  return isDemoMode() || process.env.DEMO_MODE === "true";
}

/**
 * Fetch TVL data for Uniswap V3 on a specific chain.
 */
export async function getUniswapTVL(chain: Chain): Promise<UniswapTVL> {
  if (!SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Uniswap V3 not supported on ${chain}. Supported: ${SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemo()) {
    return {
      protocol: "uniswap-v3",
      chain,
      totalTVLUSD: DEMO_TVL[chain] ?? 0,
      poolCount: DEMO_POOL_COUNT[chain] ?? 0,
      topPools: (DEMO_POOLS[chain] ?? []).slice(0, 10),
      timestamp: Date.now(),
      // @ts-expect-error extra field for transparency
      _demo: true,
      _demoNote: "Demo data. Set GRAPH_API_KEY for live data.",
    };
  }

  const poolsData = await querySubgraph<{ pools: UniswapPool[] }>(
    "uniswap-v3",
    chain,
    UNISWAP_POOLS_QUERY,
    {
      first: 20,
      orderBy: "totalValueLockedUSD",
      orderDirection: "desc",
    }
  );

  const pools = poolsData.pools ?? [];

  let totalTVLUSD: number;
  let poolCount: number;

  try {
    const factoryData = await querySubgraph<{
      factories: Array<{
        totalValueLockedUSD: string;
        poolCount: string;
      }>;
    }>("uniswap-v3", chain, UNISWAP_FACTORY_QUERY, {});

    const factory = factoryData.factories?.[0];
    totalTVLUSD = parseUSD(factory?.totalValueLockedUSD);
    poolCount = parseInt(factory?.poolCount ?? "0", 10);
  } catch {
    totalTVLUSD = pools.reduce(
      (sum, p) => sum + parseUSD(p.totalValueLockedUSD),
      0
    );
    poolCount = pools.length;
  }

  const formatted = pools.map(formatPool);

  return {
    protocol: "uniswap-v3",
    chain,
    totalTVLUSD,
    poolCount,
    topPools: formatted.slice(0, 10),
    timestamp: Date.now(),
  };
}

/**
 * Fetch top pools for Uniswap V3 on a specific chain.
 */
export async function getUniswapTopPools(
  chain: Chain,
  limit = 10,
  orderBy: "tvl" | "volume" | "fees" = "tvl"
): Promise<UniswapPoolFormatted[]> {
  if (!SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Uniswap V3 not supported on ${chain}. Supported: ${SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemo()) {
    const pools = DEMO_POOLS[chain] ?? [];
    const sorted = [...pools].sort((a, b) => {
      if (orderBy === "volume") return b.volume24hUSD - a.volume24hUSD;
      if (orderBy === "fees") return b.fees24hUSD - a.fees24hUSD;
      return b.tvlUSD - a.tvlUSD;
    });
    return sorted.slice(0, limit);
  }

  const orderByField =
    orderBy === "tvl"
      ? "totalValueLockedUSD"
      : orderBy === "volume"
        ? "volumeUSD"
        : "feesUSD";

  const data = await querySubgraph<{ pools: UniswapPool[] }>(
    "uniswap-v3",
    chain,
    UNISWAP_POOLS_QUERY,
    {
      first: Math.min(limit, 50),
      orderBy: orderByField,
      orderDirection: "desc",
    }
  );

  return (data.pools ?? []).map(formatPool);
}

/**
 * Fetch Uniswap TVL across all supported chains.
 */
export async function getUniswapTVLAllChains(): Promise<UniswapTVL[]> {
  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map((chain) => getUniswapTVL(chain))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<UniswapTVL> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

export { SUPPORTED_CHAINS as UNISWAP_SUPPORTED_CHAINS };
