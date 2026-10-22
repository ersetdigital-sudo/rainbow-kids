<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Base44 sandbox notes

- **Run:** `docker compose -f docker-compose.base44.yml up -d --build`. One service (`web`), `node:22`, repo bind-mounted at `/app`, `npm ci` then `next dev` on `0.0.0.0:3000`. `node_modules` lives in the named volume `base44_node_modules`, so dependency changes need `docker compose -f docker-compose.base44.yml restart web` (it reinstalls) — do not delete volumes.
- **No backend, no database.** All data is client-side `localStorage` (`rk_mock_v2`, see `src/lib/persist.ts`). Nothing to migrate or seed; "Reset demo" in the sidebar restores `src/lib/seed.ts`.
- **No external credentials.** The only env var is optional `NEXT_PUBLIC_SITE_URL` (canonical URL / `sitemap.xml` / `robots.txt`); it falls back to `https://rainbowkids.id`.
- **Preview origin:** `next.config.ts` appends `3000-$BASE44_PUBLIC_HOST_SUFFIX` to `allowedDevOrigins` only when `BASE44_PREVIEW_MODE === "1"`, so the proxy origin can fetch dev assets/HMR. Unset/other values keep the original config.
- **Verify:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` returns 200, and the container logs show live Turbopack compilation (dev source, not a prebuilt bundle).
- **Lint:** `docker compose -f docker-compose.base44.yml exec -T web npm run lint`.
