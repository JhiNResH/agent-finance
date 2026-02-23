/**
 * Aave V3 Protocol Module
 *
 * Queries Aave V3 subgraphs for:
 * - Total Value Locked (TVL) by chain
 * - Lending/borrowing rates per asset
 * - Top reserves by liquidity
 *
 * Falls back to demo data when GRAPH_API_KEY is not set.
 * Set DEMO_MODE=true to always use demo data.
 */

import { isDemoMode, querySubgraph } from "../graph/client.js";
import type {
  AaveLendingRates,
  AaveReserve,
  AaveReserveFormatted,
  AaveTVL,
  Chain,
} from "../types/index.js";

// ---- GraphQL Queries --------------------------------------

const AAVE_RESERVES_QUERY = /* GraphQL */ `
  query AaveReserves($first: Int!, $orderBy: String!, $orderDirection: String!) {
    reserves(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { isActive: true }
    ) {
      id
      symbol
      name
      decimals
      totalLiquidity
      totalLiquidityUSD
      totalCurrentVariableDebt
      totalCurrentVariableDebtUSD
      liquidityRate
      variableBorrowRate
      utilizationRate
    }
  }
`;

// ---- Demo Data -------------------------------------------

type ChainDemoData = Record<string, AaveReserveFormatted[]>;

const DEMO_DATA: ChainDemoData = {
  base: [
    {
      symbol: "USDC",
      name: "USD Coin",
      tvlUSD: 82_500_000,
      supplyAPY: 4.85,
      borrowAPY: 6.23,
      utilizationRate: 78.4,
    },
    {
      symbol: "WETH",
      name: "Wrapped Ether",
      tvlUSD: 47_200_000,
      supplyAPY: 1.92,
      borrowAPY: 3.11,
      utilizationRate: 62.1,
    },
    {
      symbol: "cbBTC",
      name: "Coinbase Wrapped BTC",
      tvlUSD: 28_900_000,
      supplyAPY: 0.41,
      borrowAPY: 1.75,
      utilizationRate: 31.5,
    },
    {
      symbol: "USDbC",
      name: "USD Base Coin",
      tvlUSD: 12_300_000,
      supplyAPY: 3.94,
      borrowAPY: 5.47,
      utilizationRate: 71.2,
    },
    {
      symbol: "wstETH",
      name: "Wrapped liquid staked Ether 2.0",
      tvlUSD: 9_800_000,
      supplyAPY: 0.12,
      borrowAPY: 0.85,
      utilizationRate: 18.9,
    },
  ],
  arbitrum: [
    {
      symbol: "USDC",
      name: "USD Coin",
      tvlUSD: 195_000_000,
      supplyAPY: 5.12,
      borrowAPY: 6.78,
      utilizationRate: 81.3,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      tvlUSD: 98_400_000,
      supplyAPY: 4.77,
      borrowAPY: 6.25,
      utilizationRate: 76.8,
    },
    {
      symbol: "WETH",
      name: "Wrapped Ether",
      tvlUSD: 87_600_000,
      supplyAPY: 1.85,
      borrowAPY: 3.02,
      utilizationRate: 64.4,
    },
    {
      symbol: "WBTC",
      name: "Wrapped BTC",
      tvlUSD: 54_200_000,
      supplyAPY: 0.38,
      borrowAPY: 1.64,
      utilizationRate: 29.7,
    },
    {
      symbol: "ARB",
      name: "Arbitrum",
      tvlUSD: 18_700_000,
      supplyAPY: 0.09,
      borrowAPY: 2.31,
      utilizationRate: 12.3,
    },
    {
      symbol: "DAI",
      name: "Dai Stablecoin",
      tvlUSD: 15_300_000,
      supplyAPY: 4.21,
      borrowAPY: 5.89,
      utilizationRate: 69.5,
    },
  ],
  optimism: [
    {
      symbol: "USDC",
      name: "USD Coin",
      tvlUSD: 89_000_000,
      supplyAPY: 4.63,
      borrowAPY: 6.01,
      utilizationRate: 77.2,
    },
    {
      symbol: "WETH",
      name: "Wrapped Ether",
      tvlUSD: 52_800_000,
      supplyAPY: 1.74,
      borrowAPY: 2.89,
      utilizationRate: 61.7,
    },
    {
      symbol: "WBTC",
      name: "Wrapped BTC",
      tvlUSD: 24_600_000,
      supplyAPY: 0.29,
      borrowAPY: 1.52,
      utilizationRate: 26.4,
    },
    {
      symbol: "OP",
      name: "Optimism",
      tvlUSD: 11_200_000,
      supplyAPY: 0.07,
      borrowAPY: 1.98,
      utilizationRate: 9.8,
    },
    {
      symbol: "DAI",
      name: "Dai Stablecoin",
      tvlUSD: 8_900_000,
      supplyAPY: 3.87,
      borrowAPY: 5.42,
      utilizationRate: 65.3,
    },
  ],
};

// ---- Conversion Helpers -----------------------------------

const RAY = BigInt("1000000000000000000000000000"); // 1e27

function rayToAPY(ray: string): number {
  try {
    const rateBN = BigInt(ray);
    const ratePerYear = Number(rateBN) / Number(RAY);
    return parseFloat((ratePerYear * 100).toFixed(4));
  } catch {
    return 0;
  }
}

function parseUSD(val: string | undefined | null): number {
  const n = parseFloat(val ?? "0");
  return isNaN(n) ? 0 : n;
}

function formatReserve(r: AaveReserve): AaveReserveFormatted {
  const tvlUSD = parseUSD(r.totalLiquidityUSD);
  const supplyAPY = rayToAPY(r.liquidityRate);
  const borrowAPY = rayToAPY(r.variableBorrowRate);
  const utilizationRate = parseFloat(r.utilizationRate ?? "0") * 100;

  return {
    symbol: r.symbol,
    name: r.name,
    tvlUSD,
    supplyAPY,
    borrowAPY,
    utilizationRate: parseFloat(utilizationRate.toFixed(2)),
  };
}

// ---- Demo Mode -------------------------------------------

function getDemoTVL(chain: Chain): AaveTVL {
  const reserves = DEMO_DATA[chain] ?? [];
  const totalTVLUSD = reserves.reduce((sum, r) => sum + r.tvlUSD, 0);

  return {
    protocol: "aave-v3",
    chain,
    totalTVLUSD,
    reserveCount: reserves.length,
    topReserves: reserves,
    timestamp: Date.now(),
    // @ts-expect-error extra field for transparency
    _demo: true,
    _demoNote: "Demo data. Set GRAPH_API_KEY for live data.",
  };
}

function getDemoRates(chain: Chain, limit: number): AaveLendingRates {
  const reserves = (DEMO_DATA[chain] ?? [])
    .sort((a, b) => b.supplyAPY - a.supplyAPY)
    .slice(0, limit);

  return {
    protocol: "aave-v3",
    chain,
    rates: reserves,
    timestamp: Date.now(),
    // @ts-expect-error extra field for transparency
    _demo: true,
    _demoNote: "Demo data. Set GRAPH_API_KEY for live data.",
  };
}

// ---- Public API ------------------------------------------

const SUPPORTED_CHAINS: Chain[] = ["base", "arbitrum", "optimism"];

function isDemo(): boolean {
  return isDemoMode() || process.env.DEMO_MODE === "true";
}

/**
 * Fetch TVL data for Aave V3 on a specific chain.
 */
export async function getAaveTVL(chain: Chain): Promise<AaveTVL> {
  if (!SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Aave V3 not supported on ${chain}. Supported: ${SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemo()) {
    return getDemoTVL(chain);
  }

  const data = await querySubgraph<{ reserves: AaveReserve[] }>(
    "aave-v3",
    chain,
    AAVE_RESERVES_QUERY,
    { first: 20, orderBy: "totalLiquidityUSD", orderDirection: "desc" }
  );

  const reserves = data.reserves ?? [];
  const formatted = reserves.map(formatReserve);
  const totalTVLUSD = formatted.reduce((sum, r) => sum + r.tvlUSD, 0);

  return {
    protocol: "aave-v3",
    chain,
    totalTVLUSD,
    reserveCount: reserves.length,
    topReserves: formatted.slice(0, 10),
    timestamp: Date.now(),
  };
}

/**
 * Fetch lending rates for Aave V3 on a specific chain.
 */
export async function getAaveLendingRates(
  chain: Chain,
  limit = 10
): Promise<AaveLendingRates> {
  if (!SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Aave V3 not supported on ${chain}. Supported: ${SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemo()) {
    return getDemoRates(chain, limit);
  }

  const data = await querySubgraph<{ reserves: AaveReserve[] }>(
    "aave-v3",
    chain,
    AAVE_RESERVES_QUERY,
    {
      first: limit,
      orderBy: "liquidityRate",
      orderDirection: "desc",
    }
  );

  const reserves = data.reserves ?? [];
  const formatted = reserves
    .map(formatReserve)
    .sort((a, b) => b.supplyAPY - a.supplyAPY);

  return {
    protocol: "aave-v3",
    chain,
    rates: formatted,
    timestamp: Date.now(),
  };
}

/**
 * Fetch Aave TVL across all supported chains.
 */
export async function getAaveTVLAllChains(): Promise<AaveTVL[]> {
  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map((chain) => getAaveTVL(chain))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<AaveTVL> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

export { SUPPORTED_CHAINS as AAVE_SUPPORTED_CHAINS };
