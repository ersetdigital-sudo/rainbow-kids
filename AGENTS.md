<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Base44 sandbox notes

- **Run:** `docker compose -f docker-compose.base44.yml up -d --build`. One service (`web`), `node:22`, repo bind-mounted at `/app`, `npm ci` then `next dev` on `0.0.0.0:3000`. `node_modules` lives in the named volume `base44_node_modules`, so dependency changes need `docker compose -f docker-compose.base44.yml restart web` (it reinstalls) — do not delete volumes.
- **No backend, no database.** All data is client-side `localStorage` (`rk_data_v3`, see `src/lib/persist.ts`).
- **Default state is an empty workspace**, not demo data (`emptyDb()` in `src/lib/seed.ts`). `seed()` is demo data only and is loaded from Pengaturan Toko → "Muat data contoh"; "Kosongkan semua data" (same card, behind `ConfirmDialog`) wipes products, customers, transactions and users. The legacy key `rk_mock_v2` is removed on load so old demo snapshots never reappear.
- **No authentication.** Users are rows in the store; the first one created should be role Owner (the invite form offers Owner only while no Owner exists) and becomes the active-user marker (`db.user`). Real multi-device login would require a backend (Supabase), which is not wired yet.
- **Hydration vs localStorage:** SSR renders the seed, so the saved browser snapshot must not be used during hydration. `getSnapshot()` keeps returning the server snapshot until `activateBrowserSnapshot()` runs (a `setTimeout(0)` after mount in `StoreProvider`). Using `localStorage` earlier causes "Hydration failed" on the sidebar brand (`src/components/layout/Sidebar.tsx`).
- **No external credentials.** The only env var is optional `NEXT_PUBLIC_SITE_URL` (canonical URL / `sitemap.xml` / `robots.txt`); it falls back to `https://rainbowkids.id`.
- **Preview origin:** `next.config.ts` appends `3000-$BASE44_PUBLIC_HOST_SUFFIX` to `allowedDevOrigins` only when `BASE44_PREVIEW_MODE === "1"`, so the proxy origin can fetch dev assets/HMR. Unset/other values keep the original config.
- **Verify:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` returns 200, and the container logs show live Turbopack compilation (dev source, not a prebuilt bundle).
- **Lint:** `docker compose -f docker-compose.base44.yml exec -T web npm run lint`.
- **Stale CSS cache:** the repo ships a `.next` cache from import time. If rules from newer parts of `src/app/globals.css` silently never load (e.g. the bell panel `.act-*` opens unstyled and lands at the end of the document), it is not a code bug: stop `web`, `rm -rf .next`, then `up -d web` to force a clean Tailwind/Turbopack compile.
