# Polysniper

Live-trading Polymarket CLOB spread/latency arb bot with a Next.js control plane.

## Structure
- `apps/web`: Next.js + MUI control plane
- `apps/trader`: low-latency trader service
- `packages/core`: shared types and orderbook utilities

## Quickstart
1. Copy environment files and fill secrets:
   - `apps/web/.env.example` -> `apps/web/.env.local`
   - `apps/trader/.env.example` -> `apps/trader/.env`
2. Install dependencies (requires Node.js + npm):
   - `npm install`
3. Run:
   - `npm run dev:web`
   - `npm run dev:trader`

## Deployment
- Web: deploy `apps/web` on Vercel.
- Trader: deploy `apps/trader` via Docker on a VM or container service.

## Vercel env vars (web)
Add these in the Vercel project settings for `apps/web`:
- `NEXT_PUBLIC_API_BASE` (optional if using only Supabase)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Vercel env vars (trader)
If you deploy the trader on Vercel (or any other host), set **all** variables from `apps/trader/.env.example`:
- `CLOB_API_BASE`
- `CLOB_WS_URL`
- `GAMMA_API_BASE`
- `CLOB_API_KEY`
- `CLOB_API_SECRET`
- `CLOB_API_PASSPHRASE`
- `CLOB_AUTH_HEADERS`
- `CLOB_WS_SUBSCRIBE_PAYLOAD`
- `MARKET_IDS`
- `COMPLEMENT_PAIRS`
- `AUTO_DISCOVER_PAIRS`
- `CROSS_MARKET_ENABLED`
- `SPREAD_MIN_BPS`
- `MIN_EDGE_BPS`
- `ORDER_SIZE`
- `COOLDOWN_MS`
- `PAPER_TRADING`
- `ORDER_TIME_IN_FORCE`
- `FEE_BPS`
- `SLIPPAGE_BPS`
- `LATENCY_BPS`
- `STALE_BOOK_MS`
- `MAX_CONSECUTIVE_ERRORS`
- `ADAPTIVE_SPREAD`
- `ADAPTIVE_ALPHA`
- `ADAPTIVE_MULTIPLIER`
- `SHADOW_MODE`
- `AUTO_TUNER`
- `TUNER_WINDOW`
- `TUNER_STEP`
- `TUNER_MIN_MULTIPLIER`
- `TUNER_MAX_MULTIPLIER`
- `MAX_NOTIONAL_PER_MARKET`
- `MAX_TOTAL_EXPOSURE`
- `DAILY_LOSS_LIMIT`
- `MAX_ORDERS_PER_MIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## CLOB auth headers
The trader accepts either:
- `CLOB_AUTH_HEADERS` as a JSON string of exact headers to send to Polymarket, or
- `CLOB_API_KEY`, `CLOB_API_SECRET`, `CLOB_API_PASSPHRASE` if you already know the expected header names.

## Arbitrage discovery
The trader auto-discovers complement pairs and cross-market equivalence groups from Gamma by default.
You can still provide manual pairs if needed:
- `COMPLEMENT_PAIRS=tokenA:tokenB,tokenC:tokenD`
