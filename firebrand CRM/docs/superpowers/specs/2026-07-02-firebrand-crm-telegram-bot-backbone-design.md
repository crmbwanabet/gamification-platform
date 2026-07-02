# Firebrand CRM — Phase 1: Data Backbone + Telegram Bot Core Loop

**Date:** 2026-07-02
**Status:** Design approved, pending written-spec review
**Sub-project:** 1 of ~5 (backbone + bot → dashboard → accounting → Android/PWA)

## Context

Firebrand Spirits is the exclusive Zambian distributor of Stolichnaya Premium
Vodka (1L, 40% ABV), a small Lusaka operation. It sells B2B (bars, hotels,
retailers) and B2C (direct). Orders arrive informally via WhatsApp, phone, and
email. Sales activity is coordinated in a Telegram group between the **director**
and the **sales manager**.

The full CRM vision spans several subsystems: a Telegram bot that captures all
sales activity from group chat, a client/prospect database, order & delivery
tracking, accounting, a web dashboard, and an Android app. This is too large for
one spec, so it is decomposed into sequential sub-projects, each with its own
spec → plan → implementation cycle.

**This spec covers only Sub-project 1: the data backbone plus the Telegram bot
core loop.** It de-risks the core idea (freeform chat → structured CRM records)
and delivers value immediately, entirely within Telegram. Later phases (web
dashboard, full accounting, Android/PWA) build on this backbone.

## Goals

- Every message in the director↔sales-manager Telegram group is captured.
- The bot turns freeform reports ("visited Buff's, tasted a sample, they'll take
  6 next week, still owe K400") into structured records: clients/prospects,
  interactions, samples, orders, payments.
- Clear, confident information is saved silently.
- When new info **contradicts existing records** or is **low-confidence**, the
  bot asks the director to **Approve / Correct / Decline**.
- The director and sales manager can **ask the bot questions** in chat ("who
  owes money?", "show Buff's Bar", "who needs samples?") and get answers.

## Non-goals (deferred to later sub-projects)

- Web dashboard / any browser UI.
- Full accounting (statements, ledgers, reconciliation reports).
- Android app / PWA.
- A separate deliveries subsystem (folded into order status for now).
- Multi-product catalog / line items (single product: Stoli 1L).

## Architecture & data flow

Phase 1 lives in two places: **Supabase** (data + bot logic) and **Telegram**
(the interface). No web app.

```
Telegram group (director + sales manager)
        │  every message
        ▼
Supabase Edge Function  ◄── Telegram webhook (secured w/ secret-token header)
        │
        ├─ 1. Log raw message (context + audit)
        ├─ 2. Relevance filter (Groq): event / query / ignore
        ├─ 3a. If EVENT → Extraction (Groq → OpenAI fallback)
        │        → proposed operations, each with a confidence score
        ├─ 4.  Reconcile proposed ops against current DB (deterministic)
        │        → clean & confident  → save silently
        │        → contradiction OR low confidence → open a Confirmation
        ├─ 5.  Confirmation loop → bot asks director (Approve/Correct/Decline)
        └─ 3b. If QUERY → intent routing → run report → reply in chat
        ▼
Supabase Postgres (clients, interactions, samples, orders, payments, …)
```

Key choices:
- **Conversational context:** the extractor receives a window of the last ~10
  messages, not just one, to resolve references across turns.
- **Two AI passes:** Groq (Llama 3.3 70B) does the cheap first pass on
  everything; OpenAI (GPT-4o) is called only for low-confidence or contradiction
  cases. Low volume keeps cost negligible.
- **Fully auditable:** every raw message and every proposed change is stored.
- **Single brain:** one Edge Function routes each message to ignore / save /
  confirm / answer.

## Tech stack

- **Database:** Supabase (new project), Postgres.
- **Bot:** a single Supabase Edge Function acting as the Telegram webhook.
- **AI:** Groq (Llama 3.3 70B) primary extraction; OpenAI (GPT-4o) fallback for
  low-confidence/contradiction reasoning. **Not** Claude.
- **Interface:** Telegram Bot API (inline keyboards for confirmations).
- **Config/secrets:** Edge Function environment variables (Groq key, OpenAI key,
  Telegram bot token, webhook secret, director Telegram user ID, group chat ID).

## Data model (9 tables)

All monetary amounts are `numeric` in Kwacha (ZMW).

### Core CRM

**`clients`** — master record for every place and person.
- `id`, `name`, `aliases[]` (resolves "Buff's" / "Buffs Bar" / "Buffalo" to one
  record), `type` (bar | hotel | retailer | individual), `status`
  (prospect | active | inactive), `phone`, `whatsapp`, `email`, `address`,
  `area` (e.g. Kabulonga), `interest_level` (hot | warm | cold | not_interested),
  `notes`, `first_seen_at`, `created_at`, `updated_at`.

**`interactions`** — running history of visits, calls, tastings, "what they said."
- `id`, `client_id`, `type` (visit | call | message | tasting | note),
  `summary` (bot's clean summary), `raw_excerpt` (actual words),
  `interest_signal`, `occurred_at`, `source_message_id`, `created_at`.

### Commerce

**`samples`** — "which place needs a sample."
- `id`, `client_id`, `status` (requested | delivered), `quantity`,
  `requested_at`, `delivered_at`, `source_message_id`.

**`orders`** — delivery folded into status for now.
- `id`, `client_id`, `status` (pending | confirmed | delivered | cancelled),
  `quantity` (bottles of Stoli 1L), `unit_price`, `total_amount`, `ordered_at`,
  `delivered_at`, `notes`, `source_message_id`.

**`payments`**
- `id`, `client_id`, `order_id` (nullable — partial/on-account payments allowed),
  `amount`, `method` (cash | transfer | mobile_money), `paid_at`,
  `source_message_id`.
- **Balance owed** for a client = sum(orders.total_amount) − sum(payments.amount).
  This is the seed of the later accounting module.

### Bot machinery

**`messages`** — raw log + context window + audit.
- `id`, `telegram_update_id` (**unique** → dedupes Telegram retries),
  `telegram_message_id`, `chat_id`, `sender_id`, `sender_name`, `text`,
  `sent_at`, `is_relevant`, `processed_at`.

**`pending_confirmations`** — confirmation state machine.
- `id`, `kind` (conflict | low_confidence), `proposed_ops` (JSONB — records
  awaiting save), `reason` (human-readable), `client_id`, `status`
  (pending | approved | declined | corrected), `bot_message_id`, `created_at`,
  `resolved_at`, `resolved_by`.

**`extraction_log`** — debugging + prompt tuning.
- `id`, `message_id`, `provider` (groq | openai), `raw_output` (JSONB),
  `confidence`, `latency_ms`.

## Extraction, reconciliation & the confirmation loop

Pipeline inside the Edge Function, per incoming message:

**Step 1 — Relevance filter (Groq).** Classify: `event`, `query`, or `ignore`.
Ignored messages are still logged for context.

**Step 2 — Extraction (Groq).** Message + last ~10 messages → strict JSON schema
→ list of proposed operations, each with a `confidence`. Client references are
matched to existing `clients` by name/alias (fuzzy). Example ops:
`upsert_client`, `log_interaction`, `record_sample`, `record_order`,
`record_payment`.

**Step 3 — Reconciliation (deterministic, no AI).** Each op is checked against
current DB state and tagged:
- **clean** — confident and no conflict → save silently.
- **low-confidence** — any op below **0.75** confidence (tunable).
- **contradiction** — conflicts with what's on file. Examples: "first visit" but
  client exists; "paid in full" but balance ≠ 0; order quantity/price disagrees
  with an existing pending order; ambiguous name matches two clients.

**Step 4 — OpenAI fallback (GPT-4o).** Any op flagged low-confidence or
contradiction is re-run with full context + the specific conflicting DB records,
asked to either resolve confidently or produce a crisp question for the director.

**Step 5 — Save or confirm.**
- Clean after fallback → **save silently.**
- Still flagged → open a `pending_confirmation`; the bot posts in the group,
  tagging the director, with inline buttons.

Example confirmation message:

> ⚠️ *Buff's Bar* — you logged them as a **new place**, but I already have
> "Buffs Bar (Kabulonga)" on file with an open order. Same place?
> **[✅ Yes, same] [✏️ Correct] [❌ Discard]**

**Confirmation state machine (Telegram inline buttons, director-only):**
- **✅ Approve** → commit proposed ops. Status → `approved`.
- **❌ Decline** → discard. Status → `declined`.
- **✏️ Correct** → bot asks "What's the correction?"; director replies; the
  correction text is re-extracted and committed. Status → `corrected`.
- Only the **configured director's** taps/replies count; the sales manager's do
  not resolve confirmations.
- **No auto-commit.** Unanswered confirmations stay `pending` indefinitely until
  the director acts.

**Idempotency & ordering:** `telegram_update_id` uniqueness prevents
double-saving on Telegram retries. Messages process in arrival order per chat.

## Query interface ("ask the bot in chat")

Messages classified as `query` are answered from the DB via **intent routing,
not free-form SQL**: Groq maps the question to one of a set of built-in,
hand-written parameterized report intents. Starting set:

- **Client history** — "show Buff's Bar" → profile + recent interactions,
  orders, balance, sample status.
- **Who owes money** — clients with balance > 0, sorted by amount.
- **Needs samples** — clients with `samples.status = requested`.
- **Interested / hot leads** — prospects by interest level.
- **Recent activity** — events in the last N days.
- **Open orders** — pending/confirmed but not delivered.

New reports are cheap to add. Anything the router can't map → "I can't answer
that yet" (no hallucinated numbers).

## Security

- Webhook verified via Telegram's **secret-token header**; unverified requests
  rejected.
- Only updates from the **configured group chat ID** are processed.
- Only the **director's Telegram user ID** can resolve confirmations.
- Edge Function uses the Supabase **service role** (server-side only); no public
  API and no client app yet, so no RLS surface.
- All keys/IDs/secrets in environment variables.

## Error handling

- Any AI/DB failure → message left `processed_at = null`; bot posts a quiet
  "⚠️ I couldn't process that one" so nothing is silently lost; reprocessable.
- Malformed AI JSON → one retry, then treat as low-confidence → confirmation
  rather than dropping data.

## Testing approach

The valuable logic is testable without live Telegram or live AI:
- **Reconciliation & contradiction detection** — pure functions: proposed ops +
  DB snapshot → assert flags. Heavily unit-tested (correctness-critical).
- **Confirmation state machine** — unit-tested transitions
  (approve/decline/correct).
- **Extraction** — golden-fixture tests: recorded real-style chat messages →
  expected proposed ops, AI mocked; plus a small live smoke test.
- **Idempotency** — same `update_id` twice → one record.

## Open questions / future

- Splitting deliveries into their own table when logistics grow.
- Multi-product catalog if Firebrand expands beyond Stoli 1L.
- Auto-commit-after-timeout for confirmations (explicitly rejected for now).
- These all belong to later sub-projects, not this one.
