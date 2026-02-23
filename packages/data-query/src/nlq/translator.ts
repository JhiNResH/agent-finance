/**
 * Natural Language Query (NLQ) Translator
 *
 * Uses Claude API to parse natural language queries into structured intents,
 * then dispatches to the appropriate protocol handler.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Chain, NLQParsed, Protocol, QueryResult } from "../types/index.js";
import {
  getAaveLendingRates,
  getAaveTVL,
  getAaveTVLAllChains,
} from "../protocols/aave.js";
import {
  getUniswapTopPools,
  getUniswapTVL,
  getUniswapTVLAllChains,
} from "../protocols/uniswap.js";

// ---- Claude Client ----------------------------------------

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ---- System Prompt ----------------------------------------

const SYSTEM_PROMPT = `You are a DeFi data query parser. Parse natural language queries about DeFi protocols into structured JSON.

Supported protocols:
- aave-v3: Lending protocol. Chains: base, arbitrum, optimism
- uniswap-v3: DEX/AMM. Chains: base, arbitrum

Supported actions:
- tvl: Total Value Locked
- rates: Lending/supply/borrow rates
- pools: Top liquidity pools  
- volume: Trading volume
- unknown: Cannot determine

Chain aliases:
- "base", "base chain", "base network" → base
- "arbitrum", "arb", "arbitrum one" → arbitrum
- "optimism", "op", "optimism network" → optimism
- "ethereum", "eth", "mainnet" → ethereum

Protocol aliases:
- "aave", "aave v3", "aave3" → aave-v3
- "uniswap", "uni", "uniswap v3", "univ3" → uniswap-v3

Respond ONLY with valid JSON in this exact format:
{
  "protocol": "aave-v3" | "uniswap-v3" | null,
  "chain": "base" | "arbitrum" | "optimism" | "ethereum" | null,
  "action": "tvl" | "rates" | "pools" | "volume" | "unknown",
  "token": "USDC" | null,
  "limit": 10,
  "rawIntent": "brief description of what was asked"
}

Examples:
- "Aave TVL on Base" → {"protocol":"aave-v3","chain":"base","action":"tvl","token":null,"limit":10,"rawIntent":"Aave V3 TVL on Base chain"}
- "top uniswap pools on arbitrum" → {"protocol":"uniswap-v3","chain":"arbitrum","action":"pools","token":null,"limit":10,"rawIntent":"Top Uniswap V3 pools on Arbitrum"}
- "what are the best lending rates?" → {"protocol":"aave-v3","chain":null,"action":"rates","token":null,"limit":10,"rawIntent":"Best lending rates across all chains"}
- "uniswap volume" → {"protocol":"uniswap-v3","chain":null,"action":"volume","token":null,"limit":10,"rawIntent":"Uniswap V3 volume"}`;

// ---- NLQ Parser ------------------------------------------

/**
 * Use Claude to parse a natural language query into a structured intent.
 */
export async function parseNaturalLanguageQuery(
  query: string
): Promise<NLQParsed> {
  // Try rule-based parsing first (faster, cheaper)
  const ruleBased = parseWithRules(query);
  if (ruleBased.action !== "unknown" && ruleBased.protocol !== null) {
    return ruleBased;
  }

  // Fall back to Claude for ambiguous queries
  try {
    const client = getAnthropic();

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as NLQParsed;
    return {
      protocol: parsed.protocol ?? null,
      chain: parsed.chain ?? null,
      action: parsed.action ?? "unknown",
      token: parsed.token ?? undefined,
      limit: parsed.limit ?? 10,
      rawIntent: parsed.rawIntent ?? query,
    };
  } catch (error) {
    // If Claude fails, return the rule-based result
    console.error("Claude parsing failed, using rule-based:", error);
    return ruleBased;
  }
}

// ---- Rule-based Fallback ---------------------------------

function parseWithRules(query: string): NLQParsed {
  const q = query.toLowerCase().trim();

  // Detect protocol
  let protocol: Protocol | null = null;
  if (/aave/.test(q)) protocol = "aave-v3";
  else if (/uniswap|uni\b/.test(q)) protocol = "uniswap-v3";

  // Detect chain
  let chain: Chain | null = null;
  if (/\bbase\b/.test(q)) chain = "base";
  else if (/arbitrum|arb\b/.test(q)) chain = "arbitrum";
  else if (/optimism|\bop\b/.test(q)) chain = "optimism";
  else if (/ethereum|mainnet|\beth\b/.test(q)) chain = "ethereum";

  // Detect action
  let action: NLQParsed["action"] = "unknown";
  if (/tvl|total value locked|locked/.test(q)) action = "tvl";
  else if (/rate|apy|apr|yield|interest|lending|borrow|supply/.test(q))
    action = "rates";
  else if (/pool|pair|liquidity/.test(q)) action = "pools";
  else if (/volume|vol\b/.test(q)) action = "volume";
  else if (protocol === "aave-v3" && !action) action = "tvl"; // default for aave

  // Detect token
  const tokenMatch = q.match(
    /\b(usdc|usdt|dai|eth|weth|btc|wbtc|matic|arb|op|link|aave)\b/
  );
  const token = tokenMatch ? tokenMatch[1].toUpperCase() : undefined;

  // Detect limit
  const limitMatch = q.match(/top\s+(\d+)/);
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : 10;

  return {
    protocol,
    chain,
    action,
    token,
    limit,
    rawIntent: query,
  };
}

// ---- Query Dispatcher ------------------------------------

/**
 * Execute a parsed NLQ and return structured data.
 */
export async function executeQuery(
  parsed: NLQParsed
): Promise<QueryResult<unknown>> {
  const start = Date.now();

  try {
    let data: unknown;

    const { protocol, chain, action } = parsed;

    // ---- Aave V3 -----------------------------------------
    if (protocol === "aave-v3") {
      if (action === "tvl") {
        if (chain && chain !== "ethereum") {
          data = await getAaveTVL(chain);
        } else {
          data = await getAaveTVLAllChains();
        }
      } else if (action === "rates") {
        if (chain && chain !== "ethereum") {
          data = await getAaveLendingRates(chain, parsed.limit ?? 10);
        } else {
          // Get rates from all chains
          const allChains = await Promise.allSettled([
            getAaveLendingRates("base", parsed.limit ?? 10),
            getAaveLendingRates("arbitrum", parsed.limit ?? 10),
            getAaveLendingRates("optimism", parsed.limit ?? 10),
          ]);
          data = allChains
            .filter((r) => r.status === "fulfilled")
            .map((r) => (r as PromiseFulfilledResult<unknown>).value);
        }
      } else {
        // Default fallback for aave
        data = chain && chain !== "ethereum"
          ? await getAaveTVL(chain)
          : await getAaveTVLAllChains();
      }
    }

    // ---- Uniswap V3 --------------------------------------
    else if (protocol === "uniswap-v3") {
      if (action === "tvl") {
        if (chain && (chain === "base" || chain === "arbitrum")) {
          data = await getUniswapTVL(chain);
        } else {
          data = await getUniswapTVLAllChains();
        }
      } else if (action === "pools" || action === "volume") {
        const orderBy = action === "volume" ? "volume" : "tvl";
        if (chain && (chain === "base" || chain === "arbitrum")) {
          data = await getUniswapTopPools(chain, parsed.limit ?? 10, orderBy);
        } else {
          // Default to base
          const [base, arb] = await Promise.allSettled([
            getUniswapTopPools("base", parsed.limit ?? 10, orderBy),
            getUniswapTopPools("arbitrum", parsed.limit ?? 10, orderBy),
          ]);
          data = {
            base: base.status === "fulfilled" ? base.value : null,
            arbitrum: arb.status === "fulfilled" ? arb.value : null,
          };
        }
      } else {
        // Default fallback for uniswap
        data = chain && (chain === "base" || chain === "arbitrum")
          ? await getUniswapTVL(chain)
          : await getUniswapTVLAllChains();
      }
    }

    // ---- Unknown Protocol --------------------------------
    else {
      return {
        success: false,
        query: parsed.rawIntent,
        error:
          "Could not determine protocol. Try specifying 'Aave' or 'Uniswap' in your query.",
        executionTimeMs: Date.now() - start,
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      query: parsed.rawIntent,
      protocol: protocol ?? undefined,
      chain: chain ?? undefined,
      data,
      executionTimeMs: Date.now() - start,
      timestamp: Date.now(),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      query: parsed.rawIntent,
      protocol: parsed.protocol ?? undefined,
      chain: parsed.chain ?? undefined,
      error: msg,
      executionTimeMs: Date.now() - start,
      timestamp: Date.now(),
    };
  }
}

/**
 * Full pipeline: NL query → parse → execute → result.
 */
export async function processNaturalLanguageQuery(
  query: string
): Promise<QueryResult<unknown>> {
  const parsed = await parseNaturalLanguageQuery(query);
  return executeQuery(parsed);
}
