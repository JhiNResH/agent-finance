/**
 * Morpho Blue Protocol Module
 *
 * Queries Morpho Blue's public GraphQL API for:
 * - TVL per market (Base, Ethereum mainnet)
 * - Lending/borrow rates per market
 * - Top vaults by TVL
 * - Market utilization
 *
 * API Endpoint: https://blue-api.morpho.org/graphql
 * No API key required.
 *
 * Falls back to demo data when DEMO_MODE=true is set.
 */

import type {
  Chain,
  MorphoMarket,
  MorphoMarketFormatted,
  MorphoMarketRates,
  MorphoTVL,
  MorphoTopVaults,
  MorphoVault,
  MorphoVaultFormatted,
} from "../types/index.js";

// ---- Constants -------------------------------------------

const MORPHO_API_URL = "https://blue-api.morpho.org/graphql";

const CHAIN_IDS: Partial<Record<Chain, number>> = {
  ethereum: 1,
  base: 8453,
};

export const MORPHO_SUPPORTED_CHAINS: Chain[] = ["base", "ethereum"];

// ---- GraphQL Queries -------------------------------------

const MORPHO_MARKETS_QUERY = /* GraphQL */ `
  query MorphoMarkets($chainIds: [Int!]!, $first: Int!) {
    markets(
      where: { chainId_in: $chainIds }
      orderBy: SupplyAssetsUsd
      orderDirection: Desc
      first: $first
    ) {
      items {
        id
        uniqueKey
        lltv
        loanAsset {
          address
          symbol
          name
          decimals
          priceUsd
        }
        collateralAsset {
          address
          symbol
          name
          decimals
          priceUsd
        }
        state {
          supplyAssets
          supplyAssetsUsd
          borrowAssets
          borrowAssetsUsd
          liquidityAssetsUsd
          utilization
          supplyApy
          borrowApy
          netSupplyApy
          netBorrowApy
        }
      }
    }
  }
`;

const MORPHO_VAULTS_QUERY = /* GraphQL */ `
  query MorphoVaults($chainIds: [Int!]!, $first: Int!) {
    vaults(
      where: { chainId_in: $chainIds }
      orderBy: TotalAssetsUsd
      orderDirection: Desc
      first: $first
    ) {
      items {
        address
        name
        symbol
        creationTimestamp
        asset {
          address
          symbol
          name
          decimals
          priceUsd
        }
        state {
          totalAssets
          totalAssetsUsd
          apy
          netApy
        }
      }
    }
  }
`;

// ---- Demo Data -------------------------------------------

const DEMO_MARKETS: Record<string, MorphoMarketFormatted[]> = {
  base: [
    {
      id: "0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda",
      loanToken: "USDC",
      collateralToken: "WETH",
      lltv: 86.0,
      tvlUSD: 48_200_000,
      supplyAPY: 5.12,
      borrowAPY: 6.45,
      utilization: 78.3,
    },
    {
      id: "0x3b3769cfca57be2eaed03fcc3d3a424b89ceb78c17d86ec3e8f31d9c3e83fc9f",
      loanToken: "USDC",
      collateralToken: "cbBTC",
      lltv: 86.0,
      tvlUSD: 34_700_000,
      supplyAPY: 4.87,
      borrowAPY: 6.11,
      utilization: 74.6,
    },
    {
      id: "0x136f6278512b07ad72e1cc6bdc63e2b3dab64d75c19b9695826d3bb7c8e5bc8a",
      loanToken: "WETH",
      collateralToken: "wstETH",
      lltv: 94.5,
      tvlUSD: 28_900_000,
      supplyAPY: 2.34,
      borrowAPY: 3.18,
      utilization: 67.2,
    },
    {
      id: "0x9103c3b4e834476c9a62ea009ba2c884ee42e9b7ddf54e4d6a9f5e3bd0f5e05b",
      loanToken: "USDC",
      collateralToken: "wstETH",
      lltv: 86.0,
      tvlUSD: 21_400_000,
      supplyAPY: 4.63,
      borrowAPY: 5.89,
      utilization: 72.1,
    },
    {
      id: "0xa0534c78620867b7c8706e3b6df9e69a2bc67c783281b7a77e034ed75cee012a",
      loanToken: "USDC",
      collateralToken: "cbETH",
      lltv: 86.0,
      tvlUSD: 14_800_000,
      supplyAPY: 4.98,
      borrowAPY: 6.23,
      utilization: 75.8,
    },
  ],
  ethereum: [
    {
      id: "0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc",
      loanToken: "USDC",
      collateralToken: "wstETH",
      lltv: 86.0,
      tvlUSD: 284_500_000,
      supplyAPY: 6.21,
      borrowAPY: 7.84,
      utilization: 83.4,
    },
    {
      id: "0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41",
      loanToken: "USDT",
      collateralToken: "WBTC",
      lltv: 86.0,
      tvlUSD: 198_300_000,
      supplyAPY: 5.87,
      borrowAPY: 7.31,
      utilization: 79.6,
    },
    {
      id: "0xd0e50cdac92fe2172043f5e0c36532c6369d24947e40968f34a5e8819ca9ec5",
      loanToken: "DAI",
      collateralToken: "wstETH",
      lltv: 94.5,
      tvlUSD: 142_700_000,
      supplyAPY: 4.52,
      borrowAPY: 5.63,
      utilization: 69.3,
    },
    {
      id: "0x7dde86a1e94561d9690ec678db673c1a6396365f7d1d65e129c5fff0990ff758",
      loanToken: "USDC",
      collateralToken: "WBTC",
      lltv: 86.0,
      tvlUSD: 98_400_000,
      supplyAPY: 5.41,
      borrowAPY: 6.78,
      utilization: 76.2,
    },
    {
      id: "0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49",
      loanToken: "WETH",
      collateralToken: "wstETH",
      lltv: 94.5,
      tvlUSD: 74_600_000,
      supplyAPY: 1.98,
      borrowAPY: 2.74,
      utilization: 62.1,
    },
  ],
};

const DEMO_VAULTS: Record<string, MorphoVaultFormatted[]> = {
  base: [
    {
      address: "0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61",
      name: "Gauntlet USDC Prime",
      symbol: "gtUSDCp",
      asset: "USDC",
      tvlUSD: 327_600_000,
      apy: 3.91,
      netApy: 3.91,
    },
    {
      address: "0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2",
      name: "Steakhouse Prime USDC",
      symbol: "steakUSDC",
      asset: "USDC",
      tvlUSD: 314_100_000,
      apy: 3.91,
      netApy: 3.91,
    },
    {
      address: "0x6b68A575E5A11E7e0C5e9D5dA5a2D81fFDE45bb3",
      name: "Gauntlet WETH Core",
      symbol: "gtWETH",
      asset: "WETH",
      tvlUSD: 94_300_000,
      apy: 2.47,
      netApy: 2.47,
    },
    {
      address: "0xA0D3d43a8d88B7d97D9C0A0E5Ab51Bf5E89C72a0",
      name: "Moonwell Flagship USDC",
      symbol: "mwUSDC",
      asset: "USDC",
      tvlUSD: 78_900_000,
      apy: 5.83,
      netApy: 5.83,
    },
    {
      address: "0x616fD3d682f90d3f4E9d2a0B9Bde09e0D5b1E534",
      name: "Moonwell Flagship WETH",
      symbol: "mwWETH",
      asset: "WETH",
      tvlUSD: 47_200_000,
      apy: 2.31,
      netApy: 2.31,
    },
  ],
  ethereum: [
    {
      address: "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB",
      name: "Steakhouse USDC",
      symbol: "steakUSDC",
      asset: "USDC",
      tvlUSD: 498_700_000,
      apy: 6.84,
      netApy: 6.84,
    },
    {
      address: "0x38989BBA00BDF8181F4082995b3DEae96163aC5D",
      name: "Gauntlet USDC Core",
      symbol: "gtUSDCcore",
      asset: "USDC",
      tvlUSD: 412_300_000,
      apy: 6.41,
      netApy: 6.41,
    },
    {
      address: "0x2C25f6C25770ffeF5b59d4A4c5E95A2cDB7EF83B",
      name: "Gauntlet DAI Core",
      symbol: "gtDAIcore",
      asset: "DAI",
      tvlUSD: 287_900_000,
      apy: 5.23,
      netApy: 5.23,
    },
    {
      address: "0x4881Ef0BF6d2365D3dd6499ccd7532bcdBCE0658",
      name: "Gauntlet WETH Core",
      symbol: "gtWETHcore",
      asset: "WETH",
      tvlUSD: 198_400_000,
      apy: 3.14,
      netApy: 3.14,
    },
    {
      address: "0xd63070114470f685b75B74D60EEc7c1113d33a3D",
      name: "Gauntlet USDT Core",
      symbol: "gtUSDTcore",
      asset: "USDT",
      tvlUSD: 164_700_000,
      apy: 6.57,
      netApy: 6.57,
    },
  ],
};

// ---- GraphQL Fetcher -------------------------------------

async function morphoQuery<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(MORPHO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Morpho API HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors && json.errors.length > 0) {
    throw new Error(`Morpho API GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  if (!json.data) {
    throw new Error("Morpho API returned no data");
  }

  return json.data;
}

// ---- Formatters ------------------------------------------

function formatMarket(market: MorphoMarket): MorphoMarketFormatted {
  const lltv = parseFloat(market.lltv) / 1e18 * 100;
  const tvlUSD = market.state.supplyAssetsUsd ?? 0;
  // APY values from the API are in decimal form (e.g. 0.05 = 5%)
  const supplyAPY = (market.state.supplyApy ?? 0) * 100;
  const borrowAPY = (market.state.borrowApy ?? 0) * 100;
  const utilization = (market.state.utilization ?? 0) * 100;

  return {
    id: market.uniqueKey,
    loanToken: market.loanAsset.symbol,
    collateralToken: market.collateralAsset?.symbol ?? "None",
    lltv: parseFloat(lltv.toFixed(2)),
    tvlUSD: parseFloat((tvlUSD).toFixed(2)),
    supplyAPY: parseFloat(supplyAPY.toFixed(4)),
    borrowAPY: parseFloat(borrowAPY.toFixed(4)),
    utilization: parseFloat(utilization.toFixed(2)),
  };
}

function formatVault(vault: MorphoVault): MorphoVaultFormatted {
  return {
    address: vault.address,
    name: vault.name,
    symbol: vault.symbol,
    asset: vault.asset.symbol,
    tvlUSD: parseFloat((vault.state.totalAssetsUsd ?? 0).toFixed(2)),
    apy: parseFloat(((vault.state.apy ?? 0) * 100).toFixed(4)),
    netApy: parseFloat(((vault.state.netApy ?? 0) * 100).toFixed(4)),
  };
}

// ---- Helpers ---------------------------------------------

function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

function getChainId(chain: Chain): number {
  const id = CHAIN_IDS[chain];
  if (id === undefined) {
    throw new Error(
      `Morpho Blue not supported on ${chain}. Supported: ${MORPHO_SUPPORTED_CHAINS.join(", ")}`
    );
  }
  return id;
}

// ---- Public API ------------------------------------------

/**
 * Fetch TVL data for Morpho Blue markets on a specific chain.
 */
export async function getMorphoTVL(chain: Chain, limit = 20): Promise<MorphoTVL> {
  if (!MORPHO_SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Morpho Blue not supported on ${chain}. Supported: ${MORPHO_SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemoMode()) {
    const markets = DEMO_MARKETS[chain] ?? [];
    const totalTVLUSD = markets.reduce((sum, m) => sum + m.tvlUSD, 0);
    return {
      protocol: "morpho-blue",
      chain,
      totalTVLUSD,
      marketCount: markets.length,
      topMarkets: markets.slice(0, limit),
      timestamp: Date.now(),
      // @ts-expect-error extra transparency field
      _demo: true,
      _demoNote: "Demo data. Set DEMO_MODE=false for live Morpho API data.",
    };
  }

  const chainId = getChainId(chain);

  try {
    const data = await morphoQuery<{
      markets: { items: MorphoMarket[] };
    }>(MORPHO_MARKETS_QUERY, { chainIds: [chainId], first: Math.min(limit, 50) });

    const markets = (data.markets?.items ?? []).map(formatMarket);
    const totalTVLUSD = markets.reduce((sum, m) => sum + m.tvlUSD, 0);

    return {
      protocol: "morpho-blue",
      chain,
      totalTVLUSD,
      marketCount: markets.length,
      topMarkets: markets,
      timestamp: Date.now(),
    };
  } catch (error) {
    // Fallback to demo on API failure
    console.error(`Morpho API failed, using demo data: ${error}`);
    const markets = DEMO_MARKETS[chain] ?? [];
    const totalTVLUSD = markets.reduce((sum, m) => sum + m.tvlUSD, 0);
    return {
      protocol: "morpho-blue",
      chain,
      totalTVLUSD,
      marketCount: markets.length,
      topMarkets: markets.slice(0, limit),
      timestamp: Date.now(),
      // @ts-expect-error extra transparency field
      _demo: true,
      _demoNote: "Morpho API unavailable, using cached demo data.",
    };
  }
}

/**
 * Fetch TVL data for Morpho Blue across all supported chains.
 */
export async function getMorphoTVLAllChains(): Promise<MorphoTVL[]> {
  const results = await Promise.allSettled(
    MORPHO_SUPPORTED_CHAINS.map((chain) => getMorphoTVL(chain))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MorphoTVL> => r.status === "fulfilled")
    .map((r) => r.value);
}

/**
 * Fetch lending/borrow rates for Morpho Blue markets on a specific chain.
 * Sorted by supplyAPY descending by default.
 */
export async function getMorphoMarketRates(
  chain: Chain,
  limit = 10,
  sortBy: "supplyAPY" | "borrowAPY" | "tvl" = "supplyAPY"
): Promise<MorphoMarketRates> {
  if (!MORPHO_SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Morpho Blue not supported on ${chain}. Supported: ${MORPHO_SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemoMode()) {
    const markets = [...(DEMO_MARKETS[chain] ?? [])].sort((a, b) => {
      if (sortBy === "borrowAPY") return b.borrowAPY - a.borrowAPY;
      if (sortBy === "tvl") return b.tvlUSD - a.tvlUSD;
      return b.supplyAPY - a.supplyAPY;
    });
    return {
      protocol: "morpho-blue",
      chain,
      markets: markets.slice(0, limit),
      timestamp: Date.now(),
      // @ts-expect-error extra transparency field
      _demo: true,
    };
  }

  const chainId = getChainId(chain);

  try {
    const data = await morphoQuery<{
      markets: { items: MorphoMarket[] };
    }>(MORPHO_MARKETS_QUERY, { chainIds: [chainId], first: 50 });

    const markets = (data.markets?.items ?? [])
      .map(formatMarket)
      .sort((a, b) => {
        if (sortBy === "borrowAPY") return b.borrowAPY - a.borrowAPY;
        if (sortBy === "tvl") return b.tvlUSD - a.tvlUSD;
        return b.supplyAPY - a.supplyAPY;
      })
      .slice(0, limit);

    return {
      protocol: "morpho-blue",
      chain,
      markets,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Morpho API failed, using demo data: ${error}`);
    const markets = [...(DEMO_MARKETS[chain] ?? [])]
      .sort((a, b) => b.supplyAPY - a.supplyAPY)
      .slice(0, limit);
    return {
      protocol: "morpho-blue",
      chain,
      markets,
      timestamp: Date.now(),
      // @ts-expect-error extra transparency field
      _demo: true,
    };
  }
}

/**
 * Fetch top Morpho Blue vaults by TVL on a specific chain.
 */
export async function getMorphoTopVaults(
  chain: Chain,
  limit = 10
): Promise<MorphoTopVaults> {
  if (!MORPHO_SUPPORTED_CHAINS.includes(chain)) {
    throw new Error(
      `Morpho Blue not supported on ${chain}. Supported: ${MORPHO_SUPPORTED_CHAINS.join(", ")}`
    );
  }

  if (isDemoMode()) {
    const vaults = (DEMO_VAULTS[chain] ?? []).slice(0, limit);
    return {
      protocol: "morpho-blue",
      chain,
      vaults,
      timestamp: Date.now(),
      // @ts-expect-error extra transparency field
      _demo: true,
    };
  }

  const chainId = getChainId(chain);

  try {
    const data = await morphoQuery<{
      vaults: { items: MorphoVault[] };
    }>(MORPHO_VAULTS_QUERY, { chainIds: [chainId], first: Math.min(limit, 50) });

    const vaults = (data.vaults?.items ?? []).map(formatVault);

    return {
      protocol: "morpho-blue",
      chain,
      vaults,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Morpho API failed, using demo data: ${error}`);
    const vaults = (DEMO_VAULTS[chain] ?? []).slice(0, limit);
    return {
      protocol: "morpho-blue",
      chain,
      vaults,
      timestamp: Date.now(),
      // @ts-expect-error extra transparency field
      _demo: true,
    };
  }
}

/**
 * Fetch top vaults across all supported chains.
 */
export async function getMorphoTopVaultsAllChains(): Promise<MorphoTopVaults[]> {
  const results = await Promise.allSettled(
    MORPHO_SUPPORTED_CHAINS.map((chain) => getMorphoTopVaults(chain))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MorphoTopVaults> => r.status === "fulfilled")
    .map((r) => r.value);
}
