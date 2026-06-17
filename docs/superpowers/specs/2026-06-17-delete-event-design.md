# Delete (duplicate/junk) event — design

**Date:** 2026-06-17
**Status:** Approved
**Bug:** Murdo logged "BUG ONE" — no way to remove a duplicate event (a duplicate
"Wild West Cocktail Bar" stuck in `enquiry` state). The app shipped
"Mark as Completed" and "Advance to …" but **no delete/archive/cancel** for
events, so the duplicate cannot be removed. (Marking it completed would be
wrong and would expose the junk row to the partner, since `completed` maps to
the partner-visible `delivered` display.)

## Decision

Hard delete, available on any **non-completed** event, owner/super_admin only,
behind a confirmation modal.

- **Hard delete** (not soft-archive): matches the intent for a duplicate, the
  six child tables cascade-delete cleanly, no schema change, and avoids the
  misleading "Cancelled" label / the missing un-archive UI.
- **Any non-completed event**: deletable while `status !== "completed"`. Protects
  the finished records on the `/completed` page from accidental loss.

## Components

### Policy — `src/lib/event-deletion.ts` (pure, TDD)
```ts
canDeleteEvent(status: DbStatus): boolean   // status !== "completed"
deleteBlockedReason(status: DbStatus): string | null  // message when blocked
```
Isolated so the rule is unit-tested independently of the DB.

### Action — `deleteEvent(id)` in `src/actions/events.ts`
1. `requireRole("owner", "super_admin")` first.
2. Fetch event; if missing → `{ error: "Event not found" }`.
3. If `!canDeleteEvent(event.status)` → `{ error: deleteBlockedReason(...) }`.
4. `db.delete(events).where(eq(events.id, id))` — children cascade.
5. `revalidatePath("/events" | "/completed" | "/")`.
6. Return `{ success: true }` / `{ error }`.

No transaction (single statement; cascade is DB-level — fine for neon-http).

### UI — `src/components/events/delete-event-button.tsx` (client)
- Rendered in the event-detail header, owner-only, **only when
  `status !== "completed"`**, placed last and styled in the Reserve Noir error
  tone (separated from primary actions).
- Confirmation modal names the event and lists what is removed; "Cancel" /
  "Delete permanently". On success → redirect to `/events`.

## Security & isolation
Owner/super_admin enforced in the action (not just hidden in UI). No partner
surface touched; no change to `partner-event-projection.ts`.

## Tests
Unit tests for `canDeleteEvent` / `deleteBlockedReason` (red first): deletable
for enquiry/confirmed/preparation/ready/delivered/cancelled; blocked for
completed. Action DB path + modal verified via build and manual check
(repo convention: unit tests cover pure logic only).

## Out of scope (YAGNI)
Delete from the list/kanban view; undo/restore.
