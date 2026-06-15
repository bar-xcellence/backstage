# Contributing to Backstage

Welcome. This guide covers **how we work on Backstage safely** — branching, reviews, and (most importantly) keeping production data and client emails out of harm's way.

For **code conventions** (server actions, role checks, the partner security model, design system, testing), `CLAUDE.md` is the source of truth. Read it before your first change. This file is about workflow and safety.

> **Backstage is a live tool for real people.** It is a bespoke system for a handful of named users, and `main` auto-deploys to production. There is no staging buffer between a merge and Murdo, Rob, and the LC partners using the result. Treat every change to `main` as a change to production.

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your OWN dev values — see below
npx drizzle-kit push         # push schema to YOUR dev database
npm run seed                 # load reference + demo data
npm run dev
```

Run the checks before you push:

```bash
npm run test -- --run        # Vitest unit suite
npm run build                # must pass
npm run test:e2e             # Playwright (boots next start with ENABLE_TEST_AUTH=true)
```

## 2. Use your own dev environment — never production credentials

This is the single most important rule. Do **not** point your local `.env.local` at the production database or the live Resend key.

- **Database:** use your own **Neon branch** (Neon branches off prod so you get realistic data without touching it). Your `DATABASE_URL` should point at *your* branch. Running `drizzle-kit push`, `npm run seed`, or `npm run seed:prod` against the production database can corrupt or wipe live event data.
- **Email:** use a **Resend test/sandbox key**, not the production key. "Send to LC" sends a **real email to a real client** (Murdo / Rory). Don't trigger it against live addresses while testing — use your own email as the recipient.
- **Secrets:** generate your own `SESSION_SECRET` and `MAGIC_LINK_SECRET` (any 64-char random string). They don't need to match production.
- **Login locally:** set `ENABLE_TEST_AUTH=true` and use `/auth/test-signin` — you don't need to be on the production auth allow-list to develop locally. `ENABLE_TEST_AUTH` must **never** be set in production.

If you're unsure whether a value is a prod credential, ask before using it.

## 3. Branch, PR, review — don't push to `main`

`main` is the production branch and auto-deploys. All changes go through a pull request.

```bash
git checkout main && git pull
git checkout -b feat/short-description   # or fix/, chore/, refactor/
# ... work, commit ...
git push -u origin feat/short-description
gh pr create                              # open a PR for review
```

- **One PR per logical change.** Don't batch unrelated work.
- **CI must pass** (build + tests) before merge.
- **Get a review** before merging anything that touches: auth, the partner security model (`partner-event-*`), money fields, database schema, or `send-to-lc`. When in doubt, request a review.
- **Keep PRs small and described** — say what changed and how you verified it.

## 4. Commits

Conventional Commits, one logical unit per commit:

```
feat:     a new capability
fix:      a bug fix
chore:    tooling, deps, config
refactor: behaviour-preserving restructure
docs:     documentation only
```

Example: `feat(recipes): add per-cocktail straw type to brief PDFs`

## 5. Security-sensitive areas — extra care

These have server-enforced guarantees that a small mistake can quietly break. Read the relevant section of `CLAUDE.md` and add/keep tests green:

- **Partner data isolation** — partners (LC) must never see financials or owner-only fields. The single sanitiser is `stripPartnerEvent()` (`src/lib/partner-event-sanitisation.ts`); the pinned test `partner-event-projection.test.ts` fails if a new `events` column isn't classified. Don't bypass it.
- **Role checks** — every server action calls `requireRole()` first. Every export in a `"use server"` file becomes a callable action — don't export helpers from those files.
- **Auth allow-list** — login is exact-match on email (`isAllowedEmail`). Adding a user means updating the allow-list *and* seeding a `users` row.
- **No transactions** — the neon-http driver has none. Multi-step writes use sequential statements + app-level invariants. Preserve those guards.

## 6. Schema changes

`src/db/schema.ts` is the single source of truth.

1. Edit the schema.
2. New `events` column? Classify it in `src/lib/partner-event-projection.ts` (partner-visible / stripped / owner-only) or the pinned test fails.
3. `npx drizzle-kit push` against **your** dev branch to verify.
4. Update `src/db/seed.ts` if the column needs seed data.
5. Coordinate the production migration with Rob — don't push schema to prod yourself.

## 7. After you ship

Per project convention, when a spec/feature lands, update `CLAUDE.md` (it carries the per-spec implementation notes and a mistakes log) and the README if the change is user-facing.

## Questions

When something isn't covered here or in `CLAUDE.md`, ask Rob rather than guessing — especially anything touching production data, client emails, or access control.
