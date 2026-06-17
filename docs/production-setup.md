# Production Setup — Getting Murdo Live

Step-by-step to take Backstage from "code complete" to "Murdo logs in and uses it for real."
Engineering is done; everything below is ops/config. Work top to bottom.

---

## 0. Prerequisites
- A Vercel project linked to this repo (auto-deploys on push to `main`).
- A production NeonDB database (separate from dev).
- A Resend account.
- Decision made on the **domain question** (see §6).

---

## 1. Environment variables (set in Vercel → Project → Settings → Environment Variables)

| Var | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | NeonDB connection (pooled) | Production DB, **not** the dev one. |
| `SESSION_SECRET` | iron-session cookie encryption | ≥32 chars, random. Generate a fresh one for prod. |
| `MAGIC_LINK_SECRET` | Signs magic-link JWTs | ≥32 chars, random. Fresh for prod. |
| `RESEND_API_KEY` | Resend API auth | From the Resend dashboard. |
| `FROM_EMAIL` | Sender for all outbound mail | **`murdo@bar-excellence.co.uk`** — the `bar-excellence.co.uk` domain must be Resend-verified (§3). |
| `NEXT_PUBLIC_APP_URL` | Base URL for magic links + email image `src` | **`https://backstage.bar-excellence.app`** — see §2. |
| `ENABLE_TEST_AUTH` | Test sign-in backdoor | **Do not set in prod.** Also hard-disabled when `VERCEL_ENV=production`. |
| `UPLOADTHING_TOKEN` | UploadThing — cocktail reference image uploads in the recipe editor | From the UploadThing dashboard. |

> Generate secrets: `openssl rand -base64 48`

### ⚠️ Single highest-risk item — `NEXT_PUBLIC_APP_URL` (§2)
In `.env.local` it is `http://localhost:3000`. If that value reaches production, **every magic link points at localhost and nobody can log in.** It must be the real production URL.

---

## 2. `NEXT_PUBLIC_APP_URL`
Set it to `https://backstage.bar-excellence.app` (the hosting subdomain — see §6).
If unset, the app falls back to request headers (`src/lib/base-url.ts`), which Vercel proxies correctly — but setting it explicitly is safer and is required for the cocktail reference images to resolve in brief emails.

---

## 3. Resend domain verification
1. In Resend, add and verify **`bar-excellence.co.uk`** (DKIM + SPF DNS records).
2. `FROM_EMAIL` is `murdo@bar-excellence.co.uk`, which lives on that verified domain.
3. **Until the domain is verified, no magic-link or brief emails send at all** — so this gates login.

---

## 4. Database: migrate, then seed
```bash
# Point at the PRODUCTION database for both commands.
npx drizzle-kit push                 # applies the 7 migrations in drizzle/
npm run seed:prod                    # production bootstrap (see §5)
```
> `seed:prod` reads `.env.local` by default. To target the prod DB, temporarily set `DATABASE_URL`
> (and `FROM_EMAIL`) to the production values in `.env.local`, or run:
> `SEED_MODE=prod DATABASE_URL='<prod-url>' FROM_EMAIL='<from>' tsx src/db/seed.ts`

---

## 5. `seed:prod` — what the clean production seed does
The `SEED_MODE=prod` path in `src/db/seed.ts` is **additive and handoff-safe**:
- ✅ Seeds the **3 real users** (Murdo / owner, Rob / super_admin, Rory / partner).
- ✅ Seeds the default LC recipient (`Rory · LC`), `from_email`, the **6 real cocktail recipes**, standard notes, and equipment templates.
- ❌ Does **not** seed the `Rob (Partner test)` fixture user.
- ❌ Does **not** seed the two fictional fixture events (Hexaware / Pinsent Masons).
- ❌ **Skips the destructive cleanup** — so it will not wipe data. Run it **once against an empty, freshly-migrated DB**; re-running on a populated DB will error on duplicate inserts (by design — fail loud rather than wipe).

(`npm run seed` — without `:prod` — is the dev seed: full cleanup + test user + fixture events.)

---

## 6. Domains (DECIDED)
Two different domains are in play — they are intentionally not the same:

| Purpose | Value |
|---|---|
| App / hosting subdomain | **`backstage.bar-excellence.app`** → `NEXT_PUBLIC_APP_URL=https://backstage.bar-excellence.app`. The alert deep-link in `src/actions/alerts.ts` already uses this. |
| Outbound sender (`FROM_EMAIL`) | **`murdo@bar-excellence.co.uk`** — so the **`bar-excellence.co.uk` domain** must be Resend-verified (§3), not `.app`. |
| Murdo's login mailbox | `murdo@bar-excellence.co.uk` (allow-list, seed, alert recipient). |

So: verify `bar-excellence.co.uk` in Resend (for sending), attach `backstage.bar-excellence.app` as the Vercel custom domain (for hosting), and set `NEXT_PUBLIC_APP_URL` to the `.app` host.

---

## 7. Confirm before handoff
- [ ] `murdo@bar-excellence.co.uk` is a real, monitored mailbox (it receives both magic links **and** the 48h checklist alerts, hard-coded in `src/actions/alerts.ts`).
- [ ] Custom domain attached to the Vercel project and DNS resolves.

---

## 8. Smoke test (in production, before telling Murdo)
1. Visit the prod URL → redirected to `/auth/signin`.
2. Enter `murdo@bar-excellence.co.uk` → receive the magic link → it points at the **prod** domain → clicking it logs you in as owner.
3. Create a test event → add a cocktail → open "Send to LC" preview → send one brief to yourself → confirm it arrives with the cocktail reference image rendering.
4. Delete/cancel that test event.

When all four pass, hand it to Murdo.
