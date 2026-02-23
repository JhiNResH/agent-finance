/**
 * GET /query - Natural language DeFi data query endpoint
 */

import { Hono } from "hono";
import { processNaturalLanguageQuery } from "../nlq/translator.js";

const queryRouter = new Hono();

queryRouter.get("/", async (c) => {
  const q = c.req.query("q");

  if (!q || q.trim().length === 0) {
    return c.json(
      {
        success: false,
        error: "Missing required query parameter: ?q=<natural language query>",
        examples: [
          "/query?q=Aave TVL on Base",
          "/query?q=Uniswap top pools on Arbitrum",
          "/query?q=What are the best lending rates?",
          "/query?q=Uniswap volume on Base",
        ],
      },
      400
    );
  }

  const decodedQuery = decodeURIComponent(q.trim());

  try {
    const result = await processNaturalLanguageQuery(decodedQuery);

    const status = result.success ? 200 : 422;
    return c.json(result, status);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json(
      {
        success: false,
        query: decodedQuery,
        error: `Internal query error: ${msg}`,
        executionTimeMs: 0,
        timestamp: Date.now(),
      },
      500
    );
  }
});

export { queryRouter };
