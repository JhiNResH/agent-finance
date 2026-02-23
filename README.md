# 🏦 Agent Finance - Data Query Service

> **Prototype** | DeFi data queries in plain English, powered by The Graph + Claude AI

Query Aave V3 and Uniswap V3 data across multiple chains using natural language. Built as an AI-agent-friendly service with ACP (Agent Communication Protocol) compatibility.

---

## ✨ Features

- **Natural Language Queries** — Ask "Aave TVL on Base" and get structured JSON
- **Multi-Chain** — Base, Arbitrum, Optimism
- **Live On-Chain Data** — Via The Graph decentralized subgraphs
- **Claude AI** — NL → GraphQL intent translation with rule-based fallback
- **ACP Compatible** — Machine-readable service descriptor for agent discovery
- **Rate Limiting** — Built-in per-IP rate limiting
- **TypeScript Monorepo** — Clean, typed, extensible codebase

## 📊 Supported Protocols

| Protocol | Chains | Data Available |
|----------|--------|---------------|
| **Aave V3** | Base, Arbitrum, Optimism | TVL, Supply APY, Borrow APY, Utilization |
| **Uniswap V3** | Base, Arbitrum | TVL, Top Pools, Volume, Fees |

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 8

### Setup

```bash
# Clone the repo
git clone https://github.com/JhiNResH/agent-finance.git
cd agent-finance

# Install dependencies
npm install

# Setup environment
cp packages/data-query/.env.example packages/data-query/.env
# Edit .env and add your ANTHROPIC_API_KEY

# Run in dev mode
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key for NL parsing |
| `GRAPH_API_KEY` | ⚠️ Optional | The Graph API key (higher rate limits) |
| `PORT` | No | Server port (default: 3000) |

---

## 📡 API Endpoints

### `GET /query?q=<natural language query>`

Query DeFi data using plain English.

```bash
# Aave TVL on Base
curl "http://localhost:3000/query?q=Aave+TVL+on+Base"

# Uniswap top pools on Arbitrum
curl "http://localhost:3000/query?q=Top+Uniswap+pools+on+Arbitrum"

# Lending rates
curl "http://localhost:3000/query?q=What+are+the+best+lending+rates+on+Aave?"

# Uniswap volume
curl "http://localhost:3000/query?q=Uniswap+volume+on+Base"
```

**Response:**
```json
{
  "success": true,
  "query": "Aave TVL on Base",
  "protocol": "aave-v3",
  "chain": "base",
  "data": {
    "protocol": "aave-v3",
    "chain": "base",
    "totalTVLUSD": 142500000,
    "reserveCount": 8,
    "topReserves": [
      {
        "symbol": "USDC",
        "name": "USD Coin",
        "tvlUSD": 45000000,
        "supplyAPY": 4.23,
        "borrowAPY": 6.11,
        "utilizationRate": 75.4
      }
    ],
    "timestamp": 1740294487123
  },
  "executionTimeMs": 342,
  "timestamp": 1740294487123
}
```

---

### `GET /protocols`

List all supported protocols and their capabilities.

```bash
curl "http://localhost:3000/protocols"
```

---

### `GET /protocols/:id`

Get details for a specific protocol.

```bash
curl "http://localhost:3000/protocols/aave-v3"
curl "http://localhost:3000/protocols/uniswap-v3"
```

---

### `GET /health`

Basic health check.

```bash
curl "http://localhost:3000/health"
```

### `GET /health?detailed=true`

Detailed health including subgraph connectivity.

```bash
curl "http://localhost:3000/health?detailed=true"
```

**Response:**
```json
{
  "service": "agent-finance/data-query",
  "version": "0.1.0",
  "status": "healthy",
  "uptime": 142.5,
  "timestamp": "2026-02-22T22:00:00.000Z",
  "subgraphs": [
    { "protocol": "aave-v3", "chain": "base", "status": "healthy", "latencyMs": 234 },
    { "protocol": "uniswap-v3", "chain": "arbitrum", "status": "healthy", "latencyMs": 189 }
  ],
  "claudeApiConfigured": true,
  "graphApiKeyConfigured": false
}
```

---

### `GET /acp/service-descriptor`

ACP-compatible service descriptor for agent discovery.

```bash
curl "http://localhost:3000/acp/service-descriptor"
```

**Response:**
```json
{
  "name": "agent-finance/data-query",
  "version": "0.1.0",
  "description": "DeFi Data Query Service...",
  "category": "defi-data",
  "chains": ["base", "arbitrum", "optimism"],
  "protocols": ["aave-v3", "uniswap-v3"],
  "capabilities": [
    {
      "id": "natural-language-query",
      "name": "Natural Language Query",
      "description": "Execute DeFi data queries using natural language...",
      "inputSchema": { ... },
      "outputSchema": { ... },
      "pricing": { "model": "free" }
    }
  ],
  "endpoints": {
    "query": "GET /query?q={naturalLanguageQuery}",
    "protocols": "GET /protocols",
    "health": "GET /health",
    "descriptor": "GET /acp/service-descriptor"
  }
}
```

---

## 🏗️ Architecture

```
agent-finance/
├── package.json              # Root workspace
├── tsconfig.json             # Root TypeScript config
├── README.md
└── packages/
    └── data-query/           # Main service package
        ├── package.json
        ├── tsconfig.json
        ├── .env.example
        └── src/
            ├── index.ts              # Hono server entry point
            ├── types/
            │   └── index.ts          # All TypeScript types
            ├── graph/
            │   └── client.ts         # The Graph subgraph client
            ├── protocols/
            │   ├── aave.ts           # Aave V3 queries
            │   └── uniswap.ts        # Uniswap V3 queries
            ├── nlq/
            │   └── translator.ts     # NL → GraphQL via Claude
            ├── routes/
            │   ├── query.ts          # GET /query
            │   ├── protocols.ts      # GET /protocols
            │   ├── health.ts         # GET /health
            │   └── acp.ts            # GET /acp/service-descriptor
            └── middleware/
                └── rateLimit.ts      # Rate limiting
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Language | TypeScript 5 |
| HTTP Framework | Hono 4 |
| GraphQL Client | graphql-request |
| AI (NLQ) | Anthropic Claude (claude-haiku-4-5) |
| Data Source | The Graph (decentralized subgraphs) |

---

## 🧠 How NLQ Works

1. **Rule-based parsing** (fast, free) — regex-based intent detection
2. **Claude fallback** (for ambiguous queries) — structured JSON extraction
3. **Query dispatch** — route to Aave or Uniswap handler
4. **Live data fetch** — query The Graph subgraph
5. **Response formatting** — clean, structured JSON

```
"Aave TVL on Base"
    ↓
[Rule parser: protocol=aave-v3, chain=base, action=tvl]
    ↓
getAaveTVL("base")
    ↓
GraphQL → The Graph → Aave V3 Base subgraph
    ↓
{ totalTVLUSD: 142500000, topReserves: [...] }
```

---

## 🔗 Data Sources (The Graph Subgraphs)

| Protocol | Chain | Subgraph |
|----------|-------|---------|
| Aave V3 | Base | `aave-v3-base` |
| Aave V3 | Arbitrum | `aave-v3-arbitrum` |
| Aave V3 | Optimism | `aave-v3-optimism` |
| Uniswap V3 | Base | `uniswap-v3-base` |
| Uniswap V3 | Arbitrum | `uniswap-v3-arbitrum` |

> **Note:** Public endpoints have rate limits. For production, get a free API key at [thegraph.com](https://thegraph.com/studio/apikeys/).

---

## 🛣️ Roadmap

- [ ] Add Ethereum mainnet support
- [ ] Add Compound V3 protocol
- [ ] Historical TVL time series
- [ ] WebSocket streaming for live updates
- [ ] Token-specific filtering (e.g., "USDC rates on Aave")
- [ ] Arbitrage opportunity detection
- [ ] Persistent caching (Redis)

---

## 📄 License

MIT — Built by Jensen Huang Agent for JhiNResH

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. PR with clear description

Data quality issues with subgraphs? Open an issue with the chain + protocol + error.
