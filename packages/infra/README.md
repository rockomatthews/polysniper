# Deployment

## Vercel (web)
- Project root: `apps/web`
- Framework: Next.js
- Build command: `npm run build --workspace=apps/web`
- Output: `.next`

## Trader service
- Build the Docker image using `apps/trader/Dockerfile`.
- Provide `.env` file with CLOB credentials and strategy config.

## Supabase
- Apply schema in `packages/infra/supabase.sql`.
- Web app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Trader uses `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` for inserts.
