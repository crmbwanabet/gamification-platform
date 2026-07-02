# Firebrand CRM — Backbone + Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Supabase-backed Telegram bot that turns freeform director↔sales-manager group chat into structured CRM records, asks the director to confirm contradictions/low-confidence extractions, and answers report questions in chat.

**Architecture:** A single Supabase Edge Function (Deno/TypeScript) is the Telegram webhook. Incoming messages are logged, classified (Groq), extracted into proposed operations (Groq → OpenAI fallback), reconciled against the DB by deterministic pure functions, then either saved silently or turned into a director confirmation. Pure logic (matching, reconciliation, confirmation state machine, report formatting) is isolated from I/O (Telegram, Groq, OpenAI, Supabase) so it can be unit-tested without network. Network functions take an injectable `fetchImpl` for mocking.

**Tech Stack:** Supabase (Postgres + Edge Functions/Deno), TypeScript, Telegram Bot API, Groq (llama-3.3-70b-versatile), OpenAI (gpt-4o), `@std/assert` for tests.

---

## File Structure

```
firebrand CRM/
├─ deno.json                                  # tasks + import map
├─ .env.example                               # documents required secrets
├─ supabase/
│  ├─ config.toml                             # supabase init output
│  ├─ migrations/
│  │  └─ 0001_initial_schema.sql              # the 9 tables + indexes
│  └─ functions/
│     └─ telegram-bot/
│        ├─ index.ts                          # webhook entry + routing (I/O)
│        └─ lib/
│           ├─ types.ts                       # shared types + constants (pure)
│           ├─ matching.ts                    # client name/alias matching (pure)
│           ├─ matching_test.ts
│           ├─ reconcile.ts                   # contradiction/confidence tagging (pure)
│           ├─ reconcile_test.ts
│           ├─ confirmations.ts               # confirmation state machine (pure)
│           ├─ confirmations_test.ts
│           ├─ reports.ts                     # report formatters (pure)
│           ├─ reports_test.ts
│           ├─ llm.ts                         # shared OpenAI-compatible chat call (I/O)
│           ├─ groq.ts                        # relevance/extraction/intent (I/O)
│           ├─ groq_test.ts
│           ├─ openai.ts                      # fallback resolver (I/O)
│           ├─ extract.ts                     # pipeline orchestration
│           ├─ extract_test.ts
│           ├─ telegram.ts                    # Telegram API client + parsing (I/O)
│           ├─ telegram_test.ts
│           └─ db.ts                          # Supabase data access (I/O)
```

**Responsibility split:** pure modules (`types`, `matching`, `reconcile`, `confirmations`, `reports`) hold all decision logic and are exhaustively unit-tested. I/O modules (`llm`, `groq`, `openai`, `telegram`, `db`) are thin adapters. `extract.ts` and `index.ts` orchestrate; they are tested with injected fakes.

---

## Task 0: Scaffold project

**Files:**
- Create: `deno.json`
- Create: `.env.example`
- Create: `supabase/config.toml` (via CLI)

- [ ] **Step 1: Initialize Supabase locally**

Run from the `firebrand CRM` directory:
```bash
supabase init
```
Expected: creates `supabase/config.toml` and `supabase/` folders. If it asks about generating VS Code settings, answer `N`.

- [ ] **Step 2: Create `deno.json`**

```json
{
  "tasks": {
    "test": "deno test --allow-env --allow-net"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2"
  },
  "fmt": { "semiColons": true },
  "lint": { "rules": { "tags": ["recommended"] } }
}
```

- [ ] **Step 3: Create `.env.example`**

```bash
# Telegram
TELEGRAM_BOT_TOKEN=123456:abc
TELEGRAM_WEBHOOK_SECRET=long-random-string
TELEGRAM_GROUP_CHAT_ID=-1001234567890
DIRECTOR_TELEGRAM_USER_ID=987654321

# AI providers
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx

# Supabase (auto-injected in deployed edge functions; needed for local run)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=xxx
```

- [ ] **Step 4: Create the edge function skeleton**

Run:
```bash
supabase functions new telegram-bot
```
Expected: creates `supabase/functions/telegram-bot/index.ts`. We overwrite it in Task 12.

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/deno.json" "firebrand CRM/.env.example" "firebrand CRM/supabase"
git commit -m "chore: scaffold Firebrand CRM supabase + deno project"
```

---

## Task 1: Database schema

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Firebrand CRM phase 1 schema. All money is numeric ZMW (Kwacha).

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  type text check (type in ('bar','hotel','retailer','individual')),
  status text not null default 'prospect' check (status in ('prospect','active','inactive')),
  phone text,
  whatsapp text,
  email text,
  address text,
  area text,
  interest_level text check (interest_level in ('hot','warm','cold','not_interested')),
  notes text,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  telegram_update_id bigint not null unique,
  telegram_message_id bigint,
  chat_id bigint not null,
  sender_id bigint,
  sender_name text,
  text text,
  sent_at timestamptz,
  is_relevant boolean,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null check (type in ('visit','call','message','tasting','note')),
  summary text,
  raw_excerpt text,
  interest_signal text,
  occurred_at timestamptz not null default now(),
  source_message_id uuid references messages(id),
  created_at timestamptz not null default now()
);

create table samples (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  status text not null check (status in ('requested','delivered')),
  quantity int,
  requested_at timestamptz,
  delivered_at timestamptz,
  source_message_id uuid references messages(id),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','confirmed','delivered','cancelled')),
  quantity int not null,
  unit_price numeric,
  total_amount numeric,
  ordered_at timestamptz not null default now(),
  delivered_at timestamptz,
  notes text,
  source_message_id uuid references messages(id),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  amount numeric not null,
  method text check (method in ('cash','transfer','mobile_money')),
  paid_at timestamptz not null default now(),
  source_message_id uuid references messages(id),
  created_at timestamptz not null default now()
);

create table pending_confirmations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('conflict','low_confidence')),
  proposed_ops jsonb not null,
  reason text,
  client_id uuid references clients(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','awaiting_correction','approved','declined','corrected')),
  bot_message_id bigint,
  source_message_id uuid references messages(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by bigint
);

create table extraction_log (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  provider text not null check (provider in ('groq','openai')),
  raw_output jsonb,
  confidence numeric,
  latency_ms int,
  created_at timestamptz not null default now()
);

create index on interactions(client_id);
create index on samples(client_id);
create index on orders(client_id);
create index on payments(client_id);
create index on pending_confirmations(status);
create index on pending_confirmations(bot_message_id);
create index on messages(chat_id, sent_at);
```

- [ ] **Step 2: Apply the migration locally and verify**

Run:
```bash
supabase start
supabase migration up
```
Expected: no errors; then verify all 9 tables exist:
```bash
supabase db diff --schema public | head -5
```
Expected: reports no schema drift (migration matches DB).

- [ ] **Step 3: Commit**

```bash
git add "firebrand CRM/supabase/migrations/0001_initial_schema.sql"
git commit -m "feat: initial CRM schema (9 tables)"
```

---

## Task 2: Shared types and constants

**Files:**
- Create: `supabase/functions/telegram-bot/lib/types.ts`

- [ ] **Step 1: Write the types**

```ts
// Shared domain types + constants. Pure, no imports.

export const CONFIDENCE_THRESHOLD = 0.75;

export type ClientType = "bar" | "hotel" | "retailer" | "individual";
export type ClientStatus = "prospect" | "active" | "inactive";
export type InterestLevel = "hot" | "warm" | "cold" | "not_interested";
export type InteractionType = "visit" | "call" | "message" | "tasting" | "note";
export type SampleStatus = "requested" | "delivered";
export type OrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";
export type PaymentMethod = "cash" | "transfer" | "mobile_money";

interface OpBase {
  confidence: number; // 0..1
  clientRef: string; // the place/person name as written in chat
}

export interface UpsertClientOp extends OpBase {
  op: "upsert_client";
  name: string;
  asNew?: boolean; // true when the message frames this as a first-time/new place
  type?: ClientType;
  area?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  interest_level?: InterestLevel;
  notes?: string;
}

export interface LogInteractionOp extends OpBase {
  op: "log_interaction";
  kind: InteractionType;
  summary: string;
  raw_excerpt?: string;
  interest_signal?: string;
}

export interface RecordSampleOp extends OpBase {
  op: "record_sample";
  status: SampleStatus;
  quantity?: number;
}

export interface RecordOrderOp extends OpBase {
  op: "record_order";
  status?: OrderStatus;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
}

export interface RecordPaymentOp extends OpBase {
  op: "record_payment";
  amount: number;
  method?: PaymentMethod;
  claimsFull?: boolean; // true when the message says "paid in full" / "cleared"
}

export type ProposedOp =
  | UpsertClientOp
  | LogInteractionOp
  | RecordSampleOp
  | RecordOrderOp
  | RecordPaymentOp;

export type Verdict = "clean" | "low_confidence" | "contradiction";

export interface ReconciledOp {
  op: ProposedOp;
  verdict: Verdict;
  reason: string | null;
  matchedClientId: string | null;
}

// Minimal client view used by pure logic (built from DB in db.ts).
export interface ClientRecord {
  id: string;
  name: string;
  aliases: string[];
  area: string | null;
  balance: number; // sum(orders.total_amount) - sum(payments.amount)
  openOrders: { id: string; quantity: number }[];
  pendingSamples: number;
}

export interface DbSnapshot {
  clients: ClientRecord[];
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
deno check "supabase/functions/telegram-bot/lib/types.ts"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/types.ts"
git commit -m "feat: shared domain types + constants"
```

---

## Task 3: Client matching (pure)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/matching.ts`
- Test: `supabase/functions/telegram-bot/lib/matching_test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { assertEquals } from "@std/assert";
import { matchClient, normalize } from "./matching.ts";
import type { ClientRecord } from "./types.ts";

function client(id: string, name: string, aliases: string[] = []): ClientRecord {
  return { id, name, aliases, area: null, balance: 0, openOrders: [], pendingSamples: 0 };
}

const clients = [
  client("1", "Buff's Bar", ["Buffs", "Buffalo"]),
  client("2", "Great East Lodge"),
  client("3", "Buffer Zone Club"),
];

Deno.test("normalize strips case and punctuation", () => {
  assertEquals(normalize("Buff's  Bar!"), "buffsbar");
});

Deno.test("exact name match returns one", () => {
  const r = matchClient("buffs bar", clients);
  assertEquals(r.status, "one");
  assertEquals(r.clientId, "1");
});

Deno.test("alias match returns one", () => {
  assertEquals(matchClient("Buffalo", clients).clientId, "1");
});

Deno.test("no match returns none", () => {
  assertEquals(matchClient("Radisson", clients).status, "none");
});

Deno.test("substring against a single client matches one", () => {
  assertEquals(matchClient("Great East", clients).clientId, "2");
});

Deno.test("ambiguous substring returns many", () => {
  // "buff" is a substring of both "Buff's Bar" and "Buffer Zone Club"
  const r = matchClient("buff", clients);
  assertEquals(r.status, "many");
  assertEquals(r.candidateIds.sort(), ["1", "3"]);
});

Deno.test("very short refs do not substring-match", () => {
  assertEquals(matchClient("bu", clients).status, "none");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/telegram-bot/lib/matching_test.ts`
Expected: FAIL — cannot find module `./matching.ts`.

- [ ] **Step 3: Write the implementation**

```ts
import type { ClientRecord } from "./types.ts";

export function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface MatchResult {
  status: "none" | "one" | "many";
  clientId: string | null;
  candidateIds: string[];
}

export function matchClient(ref: string, clients: ClientRecord[]): MatchResult {
  const n = normalize(ref);
  if (!n) return { status: "none", clientId: null, candidateIds: [] };

  // 1. Exact match on name or any alias.
  const exact = clients.filter(
    (c) => normalize(c.name) === n || c.aliases.some((a) => normalize(a) === n),
  );

  // 2. Fallback: substring either direction, but only for refs >= 3 chars.
  const pool = exact.length > 0
    ? exact
    : n.length >= 3
    ? clients.filter((c) => {
      const cn = normalize(c.name);
      return cn.includes(n) || n.includes(cn);
    })
    : [];

  const ids = pool.map((c) => c.id);
  if (ids.length === 0) return { status: "none", clientId: null, candidateIds: [] };
  if (ids.length === 1) return { status: "one", clientId: ids[0], candidateIds: ids };
  return { status: "many", clientId: null, candidateIds: ids };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test supabase/functions/telegram-bot/lib/matching_test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/matching.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/matching_test.ts"
git commit -m "feat: client name/alias matching"
```

---

## Task 4: Reconciliation (pure) — the contradiction engine

**Files:**
- Create: `supabase/functions/telegram-bot/lib/reconcile.ts`
- Test: `supabase/functions/telegram-bot/lib/reconcile_test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { assertEquals } from "@std/assert";
import { reconcile } from "./reconcile.ts";
import type { ClientRecord, DbSnapshot, ProposedOp } from "./types.ts";

function client(over: Partial<ClientRecord> & { id: string; name: string }): ClientRecord {
  return { aliases: [], area: null, balance: 0, openOrders: [], pendingSamples: 0, ...over };
}

const snap: DbSnapshot = {
  clients: [
    client({ id: "1", name: "Buff's Bar", balance: 400 }),
    client({ id: "2", name: "Buffer Zone" }),
  ],
};

Deno.test("confident, matching op is clean", () => {
  const ops: ProposedOp[] = [
    { op: "log_interaction", clientRef: "Buff's Bar", kind: "visit", summary: "tasted", confidence: 0.95 },
  ];
  const [r] = reconcile(ops, snap);
  assertEquals(r.verdict, "clean");
  assertEquals(r.matchedClientId, "1");
});

Deno.test("low confidence is flagged", () => {
  const ops: ProposedOp[] = [
    { op: "record_order", clientRef: "Buff's Bar", quantity: 6, confidence: 0.5 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "low_confidence");
});

Deno.test("ambiguous client is a contradiction", () => {
  const ops: ProposedOp[] = [
    { op: "log_interaction", clientRef: "Buff", kind: "note", summary: "x", confidence: 0.99 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "contradiction");
});

Deno.test("upsert framed as new but already on file is a contradiction", () => {
  const ops: ProposedOp[] = [
    { op: "upsert_client", clientRef: "Buff's Bar", name: "Buff's Bar", asNew: true, confidence: 0.95 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "contradiction");
});

Deno.test("op referencing unknown client is a contradiction", () => {
  const ops: ProposedOp[] = [
    { op: "record_payment", clientRef: "Radisson", amount: 100, confidence: 0.95 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "contradiction");
});

Deno.test("unknown client is fine if same batch creates it", () => {
  const ops: ProposedOp[] = [
    { op: "upsert_client", clientRef: "Radisson", name: "Radisson", confidence: 0.95 },
    { op: "record_sample", clientRef: "Radisson", status: "requested", confidence: 0.9 },
  ];
  const rs = reconcile(ops, snap);
  assertEquals(rs[0].verdict, "clean");
  assertEquals(rs[1].verdict, "clean");
});

Deno.test("paid-in-full that doesn't clear the balance is a contradiction", () => {
  const ops: ProposedOp[] = [
    { op: "record_payment", clientRef: "Buff's Bar", amount: 300, claimsFull: true, confidence: 0.95 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "contradiction");
});

Deno.test("paid-in-full that clears the balance is clean", () => {
  const ops: ProposedOp[] = [
    { op: "record_payment", clientRef: "Buff's Bar", amount: 400, claimsFull: true, confidence: 0.95 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "clean");
});

Deno.test("order figures that don't add up are a contradiction", () => {
  const ops: ProposedOp[] = [
    { op: "record_order", clientRef: "Buff's Bar", quantity: 6, unit_price: 100, total_amount: 500, confidence: 0.95 },
  ];
  assertEquals(reconcile(ops, snap)[0].verdict, "contradiction");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/telegram-bot/lib/reconcile_test.ts`
Expected: FAIL — cannot find module `./reconcile.ts`.

- [ ] **Step 3: Write the implementation**

```ts
import {
  CONFIDENCE_THRESHOLD,
  type ClientRecord,
  type DbSnapshot,
  type ProposedOp,
  type ReconciledOp,
} from "./types.ts";
import { matchClient, normalize } from "./matching.ts";

export function reconcile(ops: ProposedOp[], snapshot: DbSnapshot): ReconciledOp[] {
  const willCreate = new Set(
    ops.filter((o) => o.op === "upsert_client").map((o) => normalize(o.clientRef)),
  );
  return ops.map((op) => reconcileOne(op, snapshot, willCreate));
}

function reconcileOne(op: ProposedOp, snapshot: DbSnapshot, willCreate: Set<string>): ReconciledOp {
  const match = matchClient(op.clientRef, snapshot.clients);
  const client = match.status === "one"
    ? snapshot.clients.find((c) => c.id === match.clientId) ?? null
    : null;

  const contradiction = detectContradiction(op, match.status, client, willCreate);
  if (contradiction) {
    return { op, verdict: "contradiction", reason: contradiction, matchedClientId: match.clientId };
  }
  if (op.confidence < CONFIDENCE_THRESHOLD) {
    return {
      op,
      verdict: "low_confidence",
      reason: `Confidence ${op.confidence.toFixed(2)} is below ${CONFIDENCE_THRESHOLD}.`,
      matchedClientId: match.clientId,
    };
  }
  return { op, verdict: "clean", reason: null, matchedClientId: match.clientId };
}

function detectContradiction(
  op: ProposedOp,
  status: "none" | "one" | "many",
  client: ClientRecord | null,
  willCreate: Set<string>,
): string | null {
  if (status === "many") {
    return `"${op.clientRef}" matches more than one place on file — which one?`;
  }

  if (op.op === "upsert_client") {
    if (op.asNew && status === "one" && client) {
      return `Logged as a new place, but "${client.name}" is already on file.`;
    }
    return null;
  }

  // Non-upsert ops need an existing client, or one created in the same batch.
  if (status === "none" && !willCreate.has(normalize(op.clientRef))) {
    return `References "${op.clientRef}", who isn't on file yet.`;
  }

  if (op.op === "record_payment" && client && op.claimsFull) {
    const remaining = round2(client.balance - op.amount);
    if (Math.abs(remaining) > 0.005) {
      return `Marked as paid in full, but ${client.name}'s balance would be K${remaining.toFixed(2)}.`;
    }
  }

  if (op.op === "record_order" && op.unit_price != null && op.total_amount != null) {
    if (Math.abs(op.unit_price * op.quantity - op.total_amount) > 0.005) {
      return `Order figures don't add up: ${op.quantity} × K${op.unit_price} ≠ K${op.total_amount}.`;
    }
  }

  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test supabase/functions/telegram-bot/lib/reconcile_test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/reconcile.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/reconcile_test.ts"
git commit -m "feat: reconciliation + contradiction detection"
```

---

## Task 5: Confirmation state machine (pure)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/confirmations.ts`
- Test: `supabase/functions/telegram-bot/lib/confirmations_test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { assertEquals } from "@std/assert";
import { applyAction, applyCorrectionReply } from "./confirmations.ts";

Deno.test("approve from pending commits", () => {
  assertEquals(applyAction("pending", "approve"), {
    ok: true, next: "approved", commit: true, askCorrection: false,
  });
});

Deno.test("decline from pending does not commit", () => {
  assertEquals(applyAction("pending", "decline"), {
    ok: true, next: "declined", commit: false, askCorrection: false,
  });
});

Deno.test("correct from pending asks for a correction and does not commit yet", () => {
  assertEquals(applyAction("pending", "correct"), {
    ok: true, next: "awaiting_correction", commit: false, askCorrection: true,
  });
});

Deno.test("acting on an already-resolved confirmation errors", () => {
  const r = applyAction("approved", "approve");
  assertEquals(r.ok, false);
});

Deno.test("a correction reply while awaiting commits", () => {
  assertEquals(applyCorrectionReply("awaiting_correction"), {
    ok: true, next: "corrected", commit: true, askCorrection: false,
  });
});

Deno.test("a correction reply when not awaiting errors", () => {
  assertEquals(applyCorrectionReply("pending").ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/telegram-bot/lib/confirmations_test.ts`
Expected: FAIL — cannot find module `./confirmations.ts`.

- [ ] **Step 3: Write the implementation**

```ts
export type ConfirmationStatus =
  | "pending"
  | "awaiting_correction"
  | "approved"
  | "declined"
  | "corrected";

export type ConfirmationAction = "approve" | "decline" | "correct";

export type ActionResult =
  | { ok: true; next: ConfirmationStatus; commit: boolean; askCorrection: boolean }
  | { ok: false; error: string };

export function applyAction(
  current: ConfirmationStatus,
  action: ConfirmationAction,
): ActionResult {
  if (current !== "pending") {
    return { ok: false, error: `This confirmation is already ${current}.` };
  }
  switch (action) {
    case "approve":
      return { ok: true, next: "approved", commit: true, askCorrection: false };
    case "decline":
      return { ok: true, next: "declined", commit: false, askCorrection: false };
    case "correct":
      return { ok: true, next: "awaiting_correction", commit: false, askCorrection: true };
  }
}

export function applyCorrectionReply(current: ConfirmationStatus): ActionResult {
  if (current !== "awaiting_correction") {
    return { ok: false, error: `Not awaiting a correction (status: ${current}).` };
  }
  return { ok: true, next: "corrected", commit: true, askCorrection: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test supabase/functions/telegram-bot/lib/confirmations_test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/confirmations.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/confirmations_test.ts"
git commit -m "feat: confirmation state machine"
```

---

## Task 6: Report formatters (pure)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/reports.ts`
- Test: `supabase/functions/telegram-bot/lib/reports_test.ts`

These format already-fetched data into Telegram messages. The DB queries that feed them live in `db.ts` (Task 10). Keeping formatting pure makes it testable.

- [ ] **Step 1: Write the failing test**

```ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { formatClientHistory, formatWhoOwes, formatNeedsSamples } from "./reports.ts";

Deno.test("who owes lists clients with balances, largest first", () => {
  const out = formatWhoOwes([
    { name: "Buff's Bar", balance: 400 },
    { name: "Great East", balance: 1200 },
  ]);
  // largest first
  assertStringIncludes(out.indexOf("Great East") < out.indexOf("Buff's Bar") ? "ok" : "", "ok");
  assertStringIncludes(out, "K1200");
  assertStringIncludes(out, "K400");
});

Deno.test("who owes with nobody owing says so", () => {
  assertEquals(formatWhoOwes([]), "Nobody currently owes money. ✅");
});

Deno.test("needs samples lists requested places", () => {
  const out = formatNeedsSamples([{ name: "Radisson", quantity: 2 }]);
  assertStringIncludes(out, "Radisson");
  assertStringIncludes(out, "2");
});

Deno.test("client history shows profile and balance", () => {
  const out = formatClientHistory({
    name: "Buff's Bar",
    type: "bar",
    area: "Kabulonga",
    balance: 400,
    interactions: [{ occurred_at: "2026-06-30", type: "visit", summary: "tasted a sample" }],
    openOrders: 1,
    pendingSamples: 0,
  });
  assertStringIncludes(out, "Buff's Bar");
  assertStringIncludes(out, "Kabulonga");
  assertStringIncludes(out, "K400");
  assertStringIncludes(out, "tasted a sample");
});
```

Add these tests for the remaining three intents (same file):

```ts
import { formatHotLeads, formatOpenOrders, formatRecentActivity } from "./reports.ts";

Deno.test("hot leads lists prospects by interest", () => {
  const out = formatHotLeads([{ name: "Radisson", interest_level: "hot" }]);
  assertStringIncludes(out, "Radisson");
  assertStringIncludes(out, "hot");
});

Deno.test("open orders lists undelivered orders", () => {
  const out = formatOpenOrders([{ name: "Buff's Bar", quantity: 6, status: "pending" }]);
  assertStringIncludes(out, "Buff's Bar");
  assertStringIncludes(out, "6");
});

Deno.test("recent activity summarises the window", () => {
  const out = formatRecentActivity(
    [{ occurred_at: "2026-06-30", name: "Buff's Bar", type: "visit", summary: "tasted" }],
    7,
  );
  assertStringIncludes(out, "Buff's Bar");
  assertStringIncludes(out, "7");
});

Deno.test("recent activity with nothing says so", () => {
  assertStringIncludes(formatRecentActivity([], 7), "Nothing");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/telegram-bot/lib/reports_test.ts`
Expected: FAIL — cannot find module `./reports.ts`.

- [ ] **Step 3: Write the implementation**

```ts
export interface OwesRow { name: string; balance: number; }
export interface SampleRow { name: string; quantity: number | null; }
export interface HistoryView {
  name: string;
  type: string | null;
  area: string | null;
  balance: number;
  interactions: { occurred_at: string; type: string; summary: string | null }[];
  openOrders: number;
  pendingSamples: number;
}

export function formatWhoOwes(rows: OwesRow[]): string {
  if (rows.length === 0) return "Nobody currently owes money. ✅";
  const sorted = [...rows].sort((a, b) => b.balance - a.balance);
  const lines = sorted.map((r) => `• ${r.name} — K${r.balance}`);
  return `💰 *Outstanding balances*\n${lines.join("\n")}`;
}

export function formatNeedsSamples(rows: SampleRow[]): string {
  if (rows.length === 0) return "No places are waiting on samples right now.";
  const lines = rows.map((r) => `• ${r.name}${r.quantity ? ` (${r.quantity})` : ""}`);
  return `🧪 *Places needing samples*\n${lines.join("\n")}`;
}

export function formatClientHistory(v: HistoryView): string {
  const header = [
    `*${v.name}*`,
    [v.type, v.area].filter(Boolean).join(" · "),
  ].filter(Boolean).join("\n");

  const stats = `Balance: K${v.balance} · Open orders: ${v.openOrders} · Samples pending: ${v.pendingSamples}`;

  const history = v.interactions.length === 0
    ? "_No interactions logged yet._"
    : v.interactions
      .map((i) => `• ${i.occurred_at.slice(0, 10)} — ${i.type}: ${i.summary ?? ""}`.trimEnd())
      .join("\n");

  return `${header}\n${stats}\n\n🗒 *Recent activity*\n${history}`;
}

export interface LeadRow { name: string; interest_level: string | null; }
export interface OrderRow { name: string; quantity: number; status: string; }
export interface ActivityRow { occurred_at: string; name: string; type: string; summary: string | null; }

export function formatHotLeads(rows: LeadRow[]): string {
  if (rows.length === 0) return "No hot or warm leads right now.";
  const rank = (l: string | null) => (l === "hot" ? 0 : l === "warm" ? 1 : 2);
  const sorted = [...rows].sort((a, b) => rank(a.interest_level) - rank(b.interest_level));
  const lines = sorted.map((r) => `• ${r.name} — ${r.interest_level ?? "?"}`);
  return `🔥 *Leads by interest*\n${lines.join("\n")}`;
}

export function formatOpenOrders(rows: OrderRow[]): string {
  if (rows.length === 0) return "No open orders. ✅";
  const lines = rows.map((r) => `• ${r.name} — ${r.quantity} (${r.status})`);
  return `📦 *Open orders*\n${lines.join("\n")}`;
}

export function formatRecentActivity(rows: ActivityRow[], days: number): string {
  if (rows.length === 0) return `Nothing logged in the last ${days} day(s).`;
  const lines = rows.map(
    (r) => `• ${r.occurred_at.slice(0, 10)} — ${r.name}: ${r.type}${r.summary ? ` (${r.summary})` : ""}`,
  );
  return `🗓 *Activity — last ${days} day(s)*\n${lines.join("\n")}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test supabase/functions/telegram-bot/lib/reports_test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/reports.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/reports_test.ts"
git commit -m "feat: report formatters"
```

---

## Task 7: Shared LLM chat helper (I/O)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/llm.ts`

Both Groq and OpenAI expose the OpenAI chat-completions shape, so one helper serves both. It takes an injectable `fetchImpl` for testing.

- [ ] **Step 1: Write the implementation**

```ts
export type FetchImpl = typeof fetch;

export interface ChatArgs {
  url: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  fetchImpl?: FetchImpl;
}

// Calls an OpenAI-compatible chat endpoint in JSON mode and returns parsed JSON.
export async function chatJSON<T = unknown>(args: ChatArgs): Promise<T> {
  const { url, apiKey, model, system, user, fetchImpl = fetch } = args;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM call failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM response missing message content");
  }
  return JSON.parse(content) as T;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `deno check "supabase/functions/telegram-bot/lib/llm.ts"`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/llm.ts"
git commit -m "feat: shared OpenAI-compatible chat helper"
```

---

## Task 8: Groq client — relevance, extraction, intent (I/O)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/groq.ts`
- Test: `supabase/functions/telegram-bot/lib/groq_test.ts`

- [ ] **Step 1: Write the failing test**

The network is stubbed; we test that (a) `validateOps` cleans model output, and (b) `classifyRelevance` reads the model's answer through a fake fetch.

```ts
import { assertEquals } from "@std/assert";
import { classifyRelevance, validateOps } from "./groq.ts";

function fakeFetch(jsonContent: unknown): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(jsonContent) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as ReturnType<typeof fetch>;
}

Deno.test("validateOps drops malformed ops and clamps confidence", () => {
  const ops = validateOps([
    { op: "record_order", clientRef: "Buff's", quantity: 6, confidence: 1.4 },
    { op: "not_a_real_op", clientRef: "x", confidence: 0.9 },
    { op: "log_interaction", clientRef: "Buff's", kind: "visit", summary: "hi", confidence: 0.9 },
    { op: "record_order", confidence: 0.9 }, // missing clientRef + quantity
  ]);
  assertEquals(ops.length, 2);
  assertEquals(ops[0].confidence, 1); // clamped
});

Deno.test("classifyRelevance returns the model's label", async () => {
  const label = await classifyRelevance("who owes money?", [], "key", fakeFetch({ label: "query" }));
  assertEquals(label, "query");
});

Deno.test("classifyRelevance defaults unknown labels to ignore", async () => {
  const label = await classifyRelevance("lol", [], "key", fakeFetch({ label: "banter" }));
  assertEquals(label, "ignore");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test --allow-net supabase/functions/telegram-bot/lib/groq_test.ts`
Expected: FAIL — cannot find module `./groq.ts`.

- [ ] **Step 3: Write the implementation**

```ts
import { chatJSON, type FetchImpl } from "./llm.ts";
import type { ProposedOp } from "./types.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export type Relevance = "event" | "query" | "ignore";
export interface QueryRoute {
  intent:
    | "client_history"
    | "who_owes"
    | "needs_samples"
    | "hot_leads"
    | "recent_activity"
    | "open_orders"
    | "unknown";
  clientRef?: string;
  days?: number;
}

const VALID_OPS = new Set([
  "upsert_client",
  "log_interaction",
  "record_sample",
  "record_order",
  "record_payment",
]);

function contextBlock(context: string[]): string {
  return context.length ? `Recent messages (oldest first):\n${context.join("\n")}\n\n` : "";
}

export async function classifyRelevance(
  text: string,
  context: string[],
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
): Promise<Relevance> {
  const res = await chatJSON<{ label?: string }>({
    url: GROQ_URL,
    apiKey,
    model: GROQ_MODEL,
    fetchImpl,
    system:
      'You classify a sales-team chat message. Reply as JSON {"label": "event"|"query"|"ignore"}. ' +
      '"event" = reports a real-world fact (a visit, order, payment, sample, interest). ' +
      '"query" = asks the bot for information already stored. ' +
      '"ignore" = greetings, banter, logistics with no CRM value.',
    user: `${contextBlock(context)}Message: ${text}`,
  });
  const label = res.label;
  return label === "event" || label === "query" ? label : "ignore";
}

export async function extractOps(
  text: string,
  context: string[],
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
): Promise<ProposedOp[]> {
  const res = await chatJSON<{ ops?: unknown[] }>({
    url: GROQ_URL,
    apiKey,
    model: GROQ_MODEL,
    fetchImpl,
    system: EXTRACTION_SYSTEM,
    user: `${contextBlock(context)}Message: ${text}`,
  });
  return validateOps(res.ops ?? []);
}

export async function routeQueryIntent(
  text: string,
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
): Promise<QueryRoute> {
  const res = await chatJSON<QueryRoute>({
    url: GROQ_URL,
    apiKey,
    model: GROQ_MODEL,
    fetchImpl,
    system:
      "Map the user's question to one report intent. Reply JSON " +
      '{"intent": one of ["client_history","who_owes","needs_samples","hot_leads","recent_activity","open_orders","unknown"], ' +
      '"clientRef": string?, "days": number?}. Use client_history when they name a specific place.',
    user: text,
  });
  const intent = res?.intent ?? "unknown";
  return { intent, clientRef: res?.clientRef, days: res?.days };
}

export function validateOps(raw: unknown[]): ProposedOp[] {
  const out: ProposedOp[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.op !== "string" || !VALID_OPS.has(o.op)) continue;
    if (typeof o.clientRef !== "string" || !o.clientRef.trim()) continue;
    if (typeof o.confidence !== "number") continue;

    // op-specific required fields
    if (o.op === "upsert_client" && typeof o.name !== "string") continue;
    if (o.op === "log_interaction" && (typeof o.kind !== "string" || typeof o.summary !== "string")) continue;
    if (o.op === "record_sample" && typeof o.status !== "string") continue;
    if (o.op === "record_order" && typeof o.quantity !== "number") continue;
    if (o.op === "record_payment" && typeof o.amount !== "number") continue;

    o.confidence = Math.max(0, Math.min(1, o.confidence));
    out.push(o as unknown as ProposedOp);
  }
  return out;
}

const EXTRACTION_SYSTEM =
  "You extract CRM operations from a spirits-distributor sales chat (Firebrand, Lusaka; " +
  "product = Stolichnaya 1L; currency = Kwacha/K). Use the recent messages for context to " +
  "resolve who 'they'/'them' refers to. Reply JSON {\"ops\": Op[]}. Each Op has: " +
  "op (upsert_client|log_interaction|record_sample|record_order|record_payment), " +
  "clientRef (the place/person name as written), confidence (0..1), and op-specific fields:\n" +
  "- upsert_client: name, asNew?(true if framed as a brand-new place), type?, area?, phone?, whatsapp?, email?, address?, interest_level?, notes?\n" +
  "- log_interaction: kind(visit|call|message|tasting|note), summary, raw_excerpt?, interest_signal?\n" +
  "- record_sample: status(requested|delivered), quantity?\n" +
  "- record_order: quantity, unit_price?, total_amount?, status?\n" +
  "- record_payment: amount, method?(cash|transfer|mobile_money), claimsFull?(true if 'paid in full'/'cleared')\n" +
  "Emit multiple ops when a message reports multiple facts. Set confidence honestly; " +
  "use low values when the place, amount, or meaning is ambiguous. Return {\"ops\": []} for no facts.";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test --allow-net supabase/functions/telegram-bot/lib/groq_test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/groq.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/groq_test.ts"
git commit -m "feat: groq relevance/extraction/intent client"
```

---

## Task 9: OpenAI fallback resolver (I/O)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/openai.ts`

Given the flagged ops, the current client snapshot, and context, GPT-4o either returns a corrected op (with fresh confidence) or declines to resolve. Deterministic re-checking happens afterward in `extract.ts`, so this module only needs to return candidate ops.

- [ ] **Step 1: Write the implementation**

```ts
import { chatJSON, type FetchImpl } from "./llm.ts";
import { validateOps } from "./groq.ts";
import type { DbSnapshot, ProposedOp, ReconciledOp } from "./types.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

export interface Resolution {
  resolved: ProposedOp[]; // ops OpenAI is confident about; will be re-reconciled
}

export async function resolveFlagged(
  flagged: ReconciledOp[],
  snapshot: DbSnapshot,
  context: string[],
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
): Promise<Resolution> {
  if (flagged.length === 0) return { resolved: [] };

  const res = await chatJSON<{ ops?: unknown[] }>({
    url: OPENAI_URL,
    apiKey,
    model: OPENAI_MODEL,
    fetchImpl,
    system:
      "You are the senior reviewer for a spirits-distributor CRM bot. Some extracted operations " +
      "were flagged as low-confidence or as contradicting existing records. Using the context and " +
      "the current client data, re-issue ONLY the operations you can now assert with high confidence " +
      '(confidence >= 0.75). Drop anything still uncertain. Reply JSON {"ops": Op[]} using the same ' +
      "Op schema as extraction. It is correct to return an empty list when the director must decide.",
    user: JSON.stringify({
      context,
      current_clients: snapshot.clients,
      flagged: flagged.map((f) => ({ op: f.op, reason: f.reason })),
    }),
  });

  return { resolved: validateOps(res.ops ?? []) };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `deno check "supabase/functions/telegram-bot/lib/openai.ts"`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/openai.ts"
git commit -m "feat: openai fallback resolver"
```

---

## Task 10: Data access layer (I/O)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/db.ts`
- Test: `supabase/functions/telegram-bot/lib/db_test.ts` (integration; requires `supabase start`)

- [ ] **Step 1: Write the implementation**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ClientRecord,
  DbSnapshot,
  ProposedOp,
  ReconciledOp,
  UpsertClientOp,
} from "./types.ts";
import { normalize } from "./matching.ts";

export function createDb(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export interface IncomingMessage {
  updateId: number;
  messageId: number | null;
  chatId: number;
  senderId: number | null;
  senderName: string | null;
  text: string | null;
  sentAt: string | null;
}

// Idempotent insert. Returns the row id, or null if this update was already seen.
export async function insertMessageIfNew(
  db: SupabaseClient,
  m: IncomingMessage,
): Promise<string | null> {
  const { data, error } = await db
    .from("messages")
    .upsert(
      {
        telegram_update_id: m.updateId,
        telegram_message_id: m.messageId,
        chat_id: m.chatId,
        sender_id: m.senderId,
        sender_name: m.senderName,
        text: m.text,
        sent_at: m.sentAt,
      },
      { onConflict: "telegram_update_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return data && data.length > 0 ? data[0].id : null;
}

export async function markProcessed(
  db: SupabaseClient,
  messageId: string,
  isRelevant: boolean,
): Promise<void> {
  const { error } = await db
    .from("messages")
    .update({ is_relevant: isRelevant, processed_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

export async function getContextWindow(
  db: SupabaseClient,
  chatId: number,
  limit = 10,
): Promise<string[]> {
  const { data, error } = await db
    .from("messages")
    .select("sender_name, text")
    .eq("chat_id", chatId)
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? [])
    .reverse()
    .map((r) => `${r.sender_name ?? "?"}: ${r.text ?? ""}`);
}

// Build the reconciliation snapshot: every client whose normalized name/alias could
// plausibly relate to the referenced names. For low volume we just load all clients
// and compute balances/open-orders/pending-samples.
export async function getSnapshot(db: SupabaseClient): Promise<DbSnapshot> {
  const { data: clients, error } = await db
    .from("clients")
    .select("id, name, aliases, area");
  if (error) throw error;

  const { data: orders } = await db
    .from("orders")
    .select("id, client_id, quantity, total_amount, status");
  const { data: payments } = await db.from("payments").select("client_id, amount");
  const { data: samples } = await db
    .from("samples")
    .select("client_id, status");

  const records: ClientRecord[] = (clients ?? []).map((c) => {
    const cOrders = (orders ?? []).filter((o) => o.client_id === c.id);
    const cPaid = (payments ?? [])
      .filter((p) => p.client_id === c.id)
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const cOrdered = cOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    return {
      id: c.id,
      name: c.name,
      aliases: c.aliases ?? [],
      area: c.area,
      balance: Math.round((cOrdered - cPaid) * 100) / 100,
      openOrders: cOrders
        .filter((o) => o.status === "pending" || o.status === "confirmed")
        .map((o) => ({ id: o.id, quantity: o.quantity })),
      pendingSamples: (samples ?? []).filter(
        (s) => s.client_id === c.id && s.status === "requested",
      ).length,
    };
  });

  return { clients: records };
}

// Commit a set of already-approved/clean ops. Creates clients first so dependent
// ops can resolve their client_id. Returns nothing; throws on failure.
export async function commitOps(
  db: SupabaseClient,
  ops: ReconciledOp[],
  sourceMessageId: string | null,
): Promise<void> {
  const idByRef = new Map<string, string>();

  // 1. upserts first
  for (const r of ops) {
    if (r.op.op !== "upsert_client") continue;
    const op = r.op as UpsertClientOp;
    if (r.matchedClientId) {
      idByRef.set(normalize(op.clientRef), r.matchedClientId);
      await db.from("clients").update({
        type: op.type, area: op.area, phone: op.phone, whatsapp: op.whatsapp,
        email: op.email, address: op.address, interest_level: op.interest_level,
        notes: op.notes, updated_at: new Date().toISOString(),
      }).eq("id", r.matchedClientId);
      continue;
    }
    const { data, error } = await db.from("clients").insert({
      name: op.name, type: op.type, area: op.area, phone: op.phone,
      whatsapp: op.whatsapp, email: op.email, address: op.address,
      interest_level: op.interest_level, notes: op.notes,
    }).select("id").single();
    if (error) throw error;
    idByRef.set(normalize(op.clientRef), data.id);
  }

  // 2. dependent ops
  for (const r of ops) {
    const op = r.op;
    if (op.op === "upsert_client") continue;
    const clientId = r.matchedClientId ?? idByRef.get(normalize(op.clientRef));
    if (!clientId) continue; // should not happen post-reconcile

    if (op.op === "log_interaction") {
      await db.from("interactions").insert({
        client_id: clientId, type: op.kind, summary: op.summary,
        raw_excerpt: op.raw_excerpt, interest_signal: op.interest_signal,
        source_message_id: sourceMessageId,
      });
    } else if (op.op === "record_sample") {
      await db.from("samples").insert({
        client_id: clientId, status: op.status, quantity: op.quantity,
        requested_at: op.status === "requested" ? new Date().toISOString() : null,
        delivered_at: op.status === "delivered" ? new Date().toISOString() : null,
        source_message_id: sourceMessageId,
      });
    } else if (op.op === "record_order") {
      const total = op.total_amount ??
        (op.unit_price != null ? op.unit_price * op.quantity : null);
      await db.from("orders").insert({
        client_id: clientId, status: op.status ?? "pending", quantity: op.quantity,
        unit_price: op.unit_price, total_amount: total,
        source_message_id: sourceMessageId,
      });
    } else if (op.op === "record_payment") {
      await db.from("payments").insert({
        client_id: clientId, amount: op.amount, method: op.method,
        source_message_id: sourceMessageId,
      });
    }
  }
}

export async function createConfirmation(
  db: SupabaseClient,
  args: {
    kind: "conflict" | "low_confidence";
    proposedOps: ProposedOp[];
    reason: string;
    clientId: string | null;
    sourceMessageId: string | null;
    botMessageId: number;
  },
): Promise<void> {
  const { error } = await db.from("pending_confirmations").insert({
    kind: args.kind, proposed_ops: args.proposedOps, reason: args.reason,
    client_id: args.clientId, source_message_id: args.sourceMessageId,
    bot_message_id: args.botMessageId,
  });
  if (error) throw error;
}

export async function getConfirmationByBotMessage(db: SupabaseClient, botMessageId: number) {
  const { data, error } = await db
    .from("pending_confirmations")
    .select("*")
    .eq("bot_message_id", botMessageId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAwaitingCorrection(db: SupabaseClient) {
  const { data, error } = await db
    .from("pending_confirmations")
    .select("*")
    .eq("status", "awaiting_correction")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setConfirmationStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  resolvedBy: number | null,
): Promise<void> {
  const resolved = status !== "awaiting_correction";
  const { error } = await db.from("pending_confirmations").update({
    status,
    resolved_by: resolvedBy,
    resolved_at: resolved ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) throw error;
}

export async function logExtraction(
  db: SupabaseClient,
  args: { messageId: string; provider: "groq" | "openai"; rawOutput: unknown; confidence: number | null; latencyMs: number },
): Promise<void> {
  await db.from("extraction_log").insert({
    message_id: args.messageId, provider: args.provider,
    raw_output: args.rawOutput, confidence: args.confidence, latency_ms: args.latencyMs,
  });
}

// --- Report queries (feed reports.ts formatters) ---

export async function queryWhoOwes(db: SupabaseClient) {
  const snap = await getSnapshot(db);
  return snap.clients
    .filter((c) => c.balance > 0)
    .map((c) => ({ name: c.name, balance: c.balance }));
}

export async function queryNeedsSamples(db: SupabaseClient) {
  const { data, error } = await db
    .from("samples")
    .select("quantity, clients(name)")
    .eq("status", "requested");
  if (error) throw error;
  return (data ?? []).map((s: Record<string, unknown>) => ({
    name: (s.clients as { name: string })?.name ?? "?",
    quantity: (s.quantity as number) ?? null,
  }));
}

export async function queryClientHistory(db: SupabaseClient, clientRef: string) {
  const snap = await getSnapshot(db);
  const { matchClient } = await import("./matching.ts");
  const match = matchClient(clientRef, snap.clients);
  if (match.status !== "one") return null;
  const rec = snap.clients.find((c) => c.id === match.clientId)!;

  const { data: cli } = await db
    .from("clients").select("type, area").eq("id", rec.id).single();
  const { data: inter } = await db
    .from("interactions")
    .select("occurred_at, type, summary")
    .eq("client_id", rec.id)
    .order("occurred_at", { ascending: false })
    .limit(5);

  return {
    name: rec.name,
    type: cli?.type ?? null,
    area: cli?.area ?? null,
    balance: rec.balance,
    interactions: inter ?? [],
    openOrders: rec.openOrders.length,
    pendingSamples: rec.pendingSamples,
  };
}

export async function queryHotLeads(db: SupabaseClient) {
  const { data, error } = await db
    .from("clients")
    .select("name, interest_level")
    .in("interest_level", ["hot", "warm"]);
  if (error) throw error;
  return (data ?? []).map((c) => ({ name: c.name, interest_level: c.interest_level }));
}

export async function queryOpenOrders(db: SupabaseClient) {
  const { data, error } = await db
    .from("orders")
    .select("quantity, status, clients(name)")
    .in("status", ["pending", "confirmed"])
    .order("ordered_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o: Record<string, unknown>) => ({
    name: (o.clients as { name: string })?.name ?? "?",
    quantity: (o.quantity as number) ?? 0,
    status: (o.status as string) ?? "pending",
  }));
}

export async function queryRecentActivity(db: SupabaseClient, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await db
    .from("interactions")
    .select("occurred_at, type, summary, clients(name)")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((i: Record<string, unknown>) => ({
    occurred_at: i.occurred_at as string,
    name: (i.clients as { name: string })?.name ?? "?",
    type: i.type as string,
    summary: (i.summary as string) ?? null,
  }));
}
```

- [ ] **Step 2: Write the idempotency integration test**

```ts
import { assert, assertEquals } from "@std/assert";
import { createDb, insertMessageIfNew } from "./db.ts";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const run = url && key ? Deno.test : Deno.test.ignore;

run("insertMessageIfNew dedupes by telegram_update_id", async () => {
  const db = createDb(url!, key!);
  const updateId = Math.floor(Math.random() * 1e9) + 1e9;
  const msg = {
    updateId, messageId: 1, chatId: -100, senderId: 5, senderName: "T",
    text: "hi", sentAt: new Date().toISOString(),
  };
  const first = await insertMessageIfNew(db, msg);
  const second = await insertMessageIfNew(db, msg);
  assert(first !== null);
  assertEquals(second, null);
});
```

- [ ] **Step 3: Run the integration test**

Run (requires `supabase start` and env vars from `.env`):
```bash
supabase start
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=$(supabase status --output json | jq -r .SERVICE_ROLE_KEY) deno test --allow-env --allow-net supabase/functions/telegram-bot/lib/db_test.ts
```
Expected: PASS (1 test). If Supabase isn't running, the test is skipped (ignored), which is acceptable in CI without a stack.

- [ ] **Step 4: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/db.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/db_test.ts"
git commit -m "feat: supabase data access layer"
```

---

## Task 11: Extraction pipeline orchestration

**Files:**
- Create: `supabase/functions/telegram-bot/lib/extract.ts`
- Test: `supabase/functions/telegram-bot/lib/extract_test.ts`

`runPipeline` ties extraction → reconcile → OpenAI fallback → re-reconcile together. It takes injected functions so it can be tested without network.

- [ ] **Step 1: Write the failing test**

```ts
import { assertEquals } from "@std/assert";
import { runPipeline } from "./extract.ts";
import type { DbSnapshot, ProposedOp, ReconciledOp } from "./types.ts";

const emptySnap: DbSnapshot = { clients: [] };

Deno.test("clean ops go to save, flagged unresolved go to confirm", async () => {
  const extracted: ProposedOp[] = [
    { op: "upsert_client", clientRef: "New Bar", name: "New Bar", confidence: 0.95 },
    { op: "record_payment", clientRef: "Ghost", amount: 50, confidence: 0.9 }, // unknown client -> contradiction
  ];
  const result = await runPipeline({
    text: "msg",
    context: [],
    extractFn: () => Promise.resolve(extracted),
    getSnapshot: () => Promise.resolve(emptySnap),
    resolveFn: () => Promise.resolve({ resolved: [] }), // OpenAI resolves nothing
  });
  assertEquals(result.toSave.length, 1);
  assertEquals(result.toSave[0].op.op, "upsert_client");
  assertEquals(result.toConfirm.length, 1);
});

Deno.test("openai resolution promotes a flagged op to save", async () => {
  const extracted: ProposedOp[] = [
    { op: "record_order", clientRef: "New Bar", quantity: 6, confidence: 0.4 }, // low confidence
  ];
  const resolvedOp: ProposedOp = {
    op: "record_order", clientRef: "New Bar", quantity: 6, confidence: 0.95,
  };
  const result = await runPipeline({
    text: "msg",
    context: [],
    extractFn: () => Promise.resolve(extracted),
    // snapshot has the client so the resolved op reconciles clean
    getSnapshot: () =>
      Promise.resolve({
        clients: [{ id: "1", name: "New Bar", aliases: [], area: null, balance: 0, openOrders: [], pendingSamples: 0 }],
      }),
    resolveFn: () => Promise.resolve({ resolved: [resolvedOp] }),
  });
  assertEquals(result.toSave.length, 1);
  assertEquals(result.toConfirm.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/telegram-bot/lib/extract_test.ts`
Expected: FAIL — cannot find module `./extract.ts`.

- [ ] **Step 3: Write the implementation**

```ts
import { reconcile } from "./reconcile.ts";
import type { DbSnapshot, ProposedOp, ReconciledOp } from "./types.ts";

export interface PipelineArgs {
  text: string;
  context: string[];
  extractFn: (text: string, context: string[]) => Promise<ProposedOp[]>;
  getSnapshot: () => Promise<DbSnapshot>;
  resolveFn: (
    flagged: ReconciledOp[],
    snapshot: DbSnapshot,
    context: string[],
  ) => Promise<{ resolved: ProposedOp[] }>;
}

export interface PipelineResult {
  toSave: ReconciledOp[];
  toConfirm: { op: ReconciledOp; reason: string }[];
}

export async function runPipeline(args: PipelineArgs): Promise<PipelineResult> {
  const { text, context, extractFn, getSnapshot, resolveFn } = args;

  const ops = await extractFn(text, context);
  if (ops.length === 0) return { toSave: [], toConfirm: [] };

  const snapshot = await getSnapshot();
  const reconciled = reconcile(ops, snapshot);

  const clean = reconciled.filter((r) => r.verdict === "clean");
  const flagged = reconciled.filter((r) => r.verdict !== "clean");

  const toSave = [...clean];
  const toConfirm: { op: ReconciledOp; reason: string }[] = [];

  if (flagged.length > 0) {
    const { resolved } = await resolveFn(flagged, snapshot, context);
    const reReconciled = reconcile(resolved, snapshot);
    const resolvedClean = reReconciled.filter((r) => r.verdict === "clean");
    toSave.push(...resolvedClean);

    // Any originally-flagged op whose (op signature) wasn't resolved cleanly → confirm.
    const resolvedKeys = new Set(resolvedClean.map((r) => opKey(r.op)));
    for (const f of flagged) {
      if (!resolvedKeys.has(opKey(f.op))) {
        toConfirm.push({ op: f, reason: f.reason ?? "Needs your confirmation." });
      }
    }
  }

  return { toSave, toConfirm };
}

function opKey(op: ProposedOp): string {
  return `${op.op}:${op.clientRef.toLowerCase()}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test supabase/functions/telegram-bot/lib/extract_test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/extract.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/extract_test.ts"
git commit -m "feat: extraction pipeline orchestration"
```

---

## Task 12: Telegram client + parsing (I/O)

**Files:**
- Create: `supabase/functions/telegram-bot/lib/telegram.ts`
- Test: `supabase/functions/telegram-bot/lib/telegram_test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { assert, assertEquals } from "@std/assert";
import { parseUpdate, verifySecret, buildConfirmationKeyboard } from "./telegram.ts";

Deno.test("verifySecret compares the header", () => {
  assert(verifySecret("abc", "abc"));
  assert(!verifySecret("abc", "xyz"));
  assert(!verifySecret(null, "abc"));
});

Deno.test("parseUpdate reads a group text message", () => {
  const p = parseUpdate({
    update_id: 10,
    message: {
      message_id: 5,
      chat: { id: -100 },
      from: { id: 7, first_name: "Sales" },
      text: "visited Buff's",
      date: 1700000000,
    },
  });
  assertEquals(p.kind, "message");
  if (p.kind === "message") {
    assertEquals(p.updateId, 10);
    assertEquals(p.chatId, -100);
    assertEquals(p.senderId, 7);
    assertEquals(p.text, "visited Buff's");
  }
});

Deno.test("parseUpdate reads a callback query", () => {
  const p = parseUpdate({
    update_id: 11,
    callback_query: {
      id: "cb1",
      from: { id: 9 },
      data: "approve",
      message: { message_id: 42, chat: { id: -100 } },
    },
  });
  assertEquals(p.kind, "callback");
  if (p.kind === "callback") {
    assertEquals(p.data, "approve");
    assertEquals(p.botMessageId, 42);
    assertEquals(p.fromId, 9);
  }
});

Deno.test("confirmation keyboard has approve/correct/decline", () => {
  const kb = buildConfirmationKeyboard();
  const data = kb.inline_keyboard[0].map((b) => b.callback_data);
  assertEquals(data, ["approve", "correct", "decline"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/telegram-bot/lib/telegram_test.ts`
Expected: FAIL — cannot find module `./telegram.ts`.

- [ ] **Step 3: Write the implementation**

```ts
import type { FetchImpl } from "./llm.ts";

const API = "https://api.telegram.org";

export function verifySecret(header: string | null, expected: string): boolean {
  return !!header && header === expected;
}

export type ParsedUpdate =
  | {
    kind: "message";
    updateId: number;
    messageId: number;
    chatId: number;
    senderId: number | null;
    senderName: string | null;
    text: string;
    sentAt: string;
    replyToBotMessageId: number | null;
  }
  | {
    kind: "callback";
    updateId: number;
    callbackId: string;
    fromId: number;
    data: string;
    botMessageId: number;
    chatId: number;
  }
  | { kind: "other"; updateId: number };

export function parseUpdate(u: Record<string, any>): ParsedUpdate {
  const updateId = u.update_id;
  if (u.callback_query) {
    const cq = u.callback_query;
    return {
      kind: "callback",
      updateId,
      callbackId: cq.id,
      fromId: cq.from?.id,
      data: cq.data ?? "",
      botMessageId: cq.message?.message_id,
      chatId: cq.message?.chat?.id,
    };
  }
  const m = u.message;
  if (m && typeof m.text === "string") {
    return {
      kind: "message",
      updateId,
      messageId: m.message_id,
      chatId: m.chat?.id,
      senderId: m.from?.id ?? null,
      senderName: m.from?.first_name ?? m.from?.username ?? null,
      text: m.text,
      sentAt: new Date((m.date ?? 0) * 1000).toISOString(),
      replyToBotMessageId: m.reply_to_message?.message_id ?? null,
    };
  }
  return { kind: "other", updateId };
}

export interface InlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][];
}

export function buildConfirmationKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [[
      { text: "✅ Approve", callback_data: "approve" },
      { text: "✏️ Correct", callback_data: "correct" },
      { text: "❌ Decline", callback_data: "decline" },
    ]],
  };
}

async function call(
  token: string,
  method: string,
  body: Record<string, unknown>,
  fetchImpl: FetchImpl,
): Promise<Record<string, any>> {
  const res = await fetchImpl(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  return data.result;
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  opts: { replyMarkup?: InlineKeyboard } = {},
  fetchImpl: FetchImpl = fetch,
): Promise<number> {
  const result = await call(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: opts.replyMarkup,
  }, fetchImpl);
  return result.message_id;
}

export function sendConfirmation(
  token: string,
  chatId: number,
  text: string,
  fetchImpl: FetchImpl = fetch,
): Promise<number> {
  return sendMessage(token, chatId, text, { replyMarkup: buildConfirmationKeyboard() }, fetchImpl);
}

export async function answerCallbackQuery(
  token: string,
  callbackId: string,
  text: string | undefined,
  fetchImpl: FetchImpl = fetch,
): Promise<void> {
  await call(token, "answerCallbackQuery", { callback_query_id: callbackId, text }, fetchImpl);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `deno test supabase/functions/telegram-bot/lib/telegram_test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/lib/telegram.ts" "firebrand CRM/supabase/functions/telegram-bot/lib/telegram_test.ts"
git commit -m "feat: telegram client + update parsing"
```

---

## Task 13: Webhook entry + routing

**Files:**
- Modify (overwrite): `supabase/functions/telegram-bot/index.ts`

This wires everything. It has no unit test of its own (it is thin glue over tested modules); it is validated by the live smoke test in Task 14. Read each branch carefully — it must match the signatures defined above.

- [ ] **Step 1: Write the handler**

```ts
import {
  answerCallbackQuery,
  parseUpdate,
  sendConfirmation,
  sendMessage,
  verifySecret,
} from "./lib/telegram.ts";
import { classifyRelevance, extractOps, routeQueryIntent } from "./lib/groq.ts";
import { resolveFlagged } from "./lib/openai.ts";
import { runPipeline } from "./lib/extract.ts";
import { applyAction, applyCorrectionReply, type ConfirmationAction } from "./lib/confirmations.ts";
import {
  formatClientHistory,
  formatHotLeads,
  formatNeedsSamples,
  formatOpenOrders,
  formatRecentActivity,
  formatWhoOwes,
} from "./lib/reports.ts";
import {
  commitOps,
  createConfirmation,
  createDb,
  getAwaitingCorrection,
  getConfirmationByBotMessage,
  getContextWindow,
  getSnapshot,
  insertMessageIfNew,
  markProcessed,
  queryClientHistory,
  queryHotLeads,
  queryNeedsSamples,
  queryOpenOrders,
  queryRecentActivity,
  queryWhoOwes,
  setConfirmationStatus,
} from "./lib/db.ts";
import { reconcile } from "./lib/reconcile.ts";
import type { ReconciledOp } from "./lib/types.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const BOT_TOKEN = env("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = env("TELEGRAM_WEBHOOK_SECRET");
const GROUP_CHAT_ID = Number(env("TELEGRAM_GROUP_CHAT_ID"));
const DIRECTOR_ID = Number(env("DIRECTOR_TELEGRAM_USER_ID"));
const GROQ_KEY = env("GROQ_API_KEY");
const OPENAI_KEY = env("OPENAI_API_KEY");

const db = createDb(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

Deno.serve(async (req) => {
  // 1. Verify webhook secret.
  if (!verifySecret(req.headers.get("x-telegram-bot-api-secret-token"), WEBHOOK_SECRET)) {
    return new Response("forbidden", { status: 403 });
  }

  let update: Record<string, unknown>;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (e) {
    console.error("handler error", e);
    // Always 200 so Telegram doesn't hammer retries; errors are logged.
  }
  return new Response("ok");
});

async function handleUpdate(update: Record<string, unknown>): Promise<void> {
  const parsed = parseUpdate(update as Record<string, any>);
  if (parsed.kind === "other") return;

  // 2. Only serve the configured group.
  if (parsed.chatId !== GROUP_CHAT_ID) return;

  if (parsed.kind === "callback") {
    await handleCallback(parsed);
    return;
  }

  // 3. Idempotent message log.
  const messageId = await insertMessageIfNew(db, {
    updateId: parsed.updateId,
    messageId: parsed.messageId,
    chatId: parsed.chatId,
    senderId: parsed.senderId,
    senderName: parsed.senderName,
    text: parsed.text,
    sentAt: parsed.sentAt,
  });
  if (messageId === null) return; // duplicate delivery

  // 4. Correction reply? (director replying while a confirmation awaits)
  const awaiting = await getAwaitingCorrection(db);
  if (awaiting && parsed.senderId === DIRECTOR_ID) {
    const res = applyCorrectionReply("awaiting_correction");
    if (res.ok && res.commit) {
      const ctx = await getContextWindow(db, parsed.chatId);
      const ops = await extractOps(parsed.text, ctx, GROQ_KEY);
      const snapshot = await getSnapshot(db);
      const reconciled = reconcile(ops, snapshot).filter((r) => r.verdict === "clean");
      await commitOps(db, reconciled, messageId);
      await setConfirmationStatus(db, awaiting.id, "corrected", DIRECTOR_ID);
      await sendMessage(BOT_TOKEN, parsed.chatId, `✅ Corrected — saved ${reconciled.length} record(s).`);
      await markProcessed(db, messageId, true);
      return;
    }
  }

  // 5. Classify.
  const context = await getContextWindow(db, parsed.chatId);
  const relevance = await classifyRelevance(parsed.text, context, GROQ_KEY);
  await markProcessed(db, messageId, relevance !== "ignore");
  if (relevance === "ignore") return;

  if (relevance === "query") {
    await handleQuery(parsed.text, parsed.chatId);
    return;
  }

  await handleEvent(parsed.text, context, parsed.chatId, messageId);
}

async function handleEvent(
  text: string,
  context: string[],
  chatId: number,
  messageId: string,
): Promise<void> {
  const result = await runPipeline({
    text,
    context,
    extractFn: (t, c) => extractOps(t, c, GROQ_KEY),
    getSnapshot: () => getSnapshot(db),
    resolveFn: (flagged, snapshot, ctx) => resolveFlagged(flagged, snapshot, ctx, OPENAI_KEY),
  });

  if (result.toSave.length > 0) {
    await commitOps(db, result.toSave, messageId);
  }

  for (const c of result.toConfirm) {
    const botMessageId = await sendConfirmation(
      BOT_TOKEN,
      chatId,
      `⚠️ ${c.reason}\nProposed: ${describeOp(c.op)}`,
    );
    await createConfirmation(db, {
      kind: c.op.verdict === "contradiction" ? "conflict" : "low_confidence",
      proposedOps: [c.op.op],
      reason: c.reason,
      clientId: c.op.matchedClientId,
      sourceMessageId: messageId,
      botMessageId,
    });
  }
}

async function handleCallback(
  cb: Extract<ReturnType<typeof parseUpdate>, { kind: "callback" }>,
): Promise<void> {
  // Only the director resolves confirmations.
  if (cb.fromId !== DIRECTOR_ID) {
    await answerCallbackQuery(BOT_TOKEN, cb.callbackId, "Only the director can decide this.");
    return;
  }
  const conf = await getConfirmationByBotMessage(db, cb.botMessageId);
  if (!conf) {
    await answerCallbackQuery(BOT_TOKEN, cb.callbackId, "That confirmation is gone.");
    return;
  }
  const action = cb.data as ConfirmationAction;
  const res = applyAction(conf.status, action);
  if (!res.ok) {
    await answerCallbackQuery(BOT_TOKEN, cb.callbackId, res.error);
    return;
  }

  await setConfirmationStatus(db, conf.id, res.next, DIRECTOR_ID);

  if (res.commit) {
    // Reconcile stored ops against the CURRENT snapshot before saving.
    const snapshot = await getSnapshot(db);
    const reconciled = reconcile(conf.proposed_ops as ReconciledOp["op"][], snapshot)
      .map((r) => ({ ...r, verdict: "clean" as const })); // director approved → force-save
    await commitOps(db, reconciled, conf.source_message_id);
    await answerCallbackQuery(BOT_TOKEN, cb.callbackId, "Saved ✅");
    await sendMessage(BOT_TOKEN, cb.chatId, "✅ Approved and saved.");
  } else if (res.askCorrection) {
    await answerCallbackQuery(BOT_TOKEN, cb.callbackId, "Reply with the correction.");
    await sendMessage(BOT_TOKEN, cb.chatId, "✏️ What's the correction? Reply here.");
  } else {
    await answerCallbackQuery(BOT_TOKEN, cb.callbackId, "Discarded ❌");
    await sendMessage(BOT_TOKEN, cb.chatId, "❌ Declined — nothing saved.");
  }
}

async function handleQuery(text: string, chatId: number): Promise<void> {
  const route = await routeQueryIntent(text, GROQ_KEY);
  let reply: string;
  switch (route.intent) {
    case "who_owes":
      reply = formatWhoOwes(await queryWhoOwes(db));
      break;
    case "needs_samples":
      reply = formatNeedsSamples(await queryNeedsSamples(db));
      break;
    case "client_history": {
      if (!route.clientRef) { reply = "Which place do you mean?"; break; }
      const h = await queryClientHistory(db, route.clientRef);
      reply = h ? formatClientHistory(h) : `I don't have "${route.clientRef}" on file.`;
      break;
    }
    case "hot_leads":
      reply = formatHotLeads(await queryHotLeads(db));
      break;
    case "open_orders":
      reply = formatOpenOrders(await queryOpenOrders(db));
      break;
    case "recent_activity": {
      const days = route.days ?? 7;
      reply = formatRecentActivity(await queryRecentActivity(db, days), days);
      break;
    }
    default:
      reply = "I can't answer that yet. Try: who owes money, who needs samples, hot leads, open orders, recent activity, or a place's name.";
  }
  await sendMessage(BOT_TOKEN, chatId, reply);
}

function describeOp(r: ReconciledOp): string {
  const op = r.op;
  switch (op.op) {
    case "upsert_client": return `add/update client "${op.name}"`;
    case "log_interaction": return `${op.kind} for ${op.clientRef}: ${op.summary}`;
    case "record_sample": return `sample ${op.status} for ${op.clientRef}`;
    case "record_order": return `order ${op.quantity} for ${op.clientRef}`;
    case "record_payment": return `payment K${op.amount} from ${op.clientRef}`;
  }
}
```

- [ ] **Step 2: Type-check the whole function**

Run: `deno check "supabase/functions/telegram-bot/index.ts"`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `deno task test`
Expected: PASS — all unit tests across matching, reconcile, confirmations, reports, groq, extract, telegram (integration db_test skipped unless a local stack is up).

- [ ] **Step 4: Commit**

```bash
git add "firebrand CRM/supabase/functions/telegram-bot/index.ts"
git commit -m "feat: telegram webhook entry + routing"
```

---

## Task 14: Deploy + register webhook + live smoke test

**Files:** none (operational).

- [ ] **Step 1: Create the Supabase project and push the schema**

Create a new Supabase project named "Firebrand CRM" (dashboard or `supabase projects create`). Then link and push:
```bash
supabase link --project-ref <ref>
supabase db push
```
Expected: the 9 tables appear in the remote project.

- [ ] **Step 2: Set the function secrets**

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_WEBHOOK_SECRET=... \
  TELEGRAM_GROUP_CHAT_ID=... \
  DIRECTOR_TELEGRAM_USER_ID=... \
  GROQ_API_KEY=... \
  OPENAI_API_KEY=...
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically at runtime.)

- [ ] **Step 3: Deploy the function**

```bash
supabase functions deploy telegram-bot --no-verify-jwt
```
Expected: prints the function URL, e.g. `https://<ref>.functions.supabase.co/telegram-bot`.

- [ ] **Step 4: Register the Telegram webhook (with secret)**

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<ref>.functions.supabase.co/telegram-bot" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
```
Expected: `{"ok":true,"result":true,"description":"Webhook was set"}`.

Also: add the bot to the group, and disable its Telegram privacy mode via @BotFather (`/setprivacy` → Disable) so it can read all group messages.

- [ ] **Step 5: Live smoke test**

In the group, post:
1. `Visited Radisson today, they tasted a sample and want to order 6 next week` → expect a client + interaction + (possibly) order/sample saved silently. Verify rows in the `clients`, `interactions` tables.
2. `who needs samples?` → expect the bot to reply listing Radisson (if a sample was requested).
3. Post something contradictory (e.g. mark a paid-in-full that doesn't clear a known balance) → expect a confirmation message with Approve/Correct/Decline. As the director, tap each and verify DB state.

- [ ] **Step 6: Commit any operational notes**

If you capture the project ref / URLs in a README, commit it:
```bash
git add "firebrand CRM/README.md"
git commit -m "docs: deployment notes for telegram-bot"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** every spec section maps to a task — schema (T1), types (T2), matching (T3), reconciliation + all contradiction rules (T4), confirmation state machine (T5), report intents (T6/T10/T13), two-pass AI Groq→OpenAI (T7–T9, T11), Telegram + security secret + director-only + group-only + idempotency (T12–T13), deploy + webhook secret + privacy mode (T14).
- **Deferred by spec (do not build here):** web dashboard, full accounting, Android app, separate deliveries table, multi-product, confirmation auto-commit.
- **Confidence threshold** lives only in `types.ts` (`CONFIDENCE_THRESHOLD`) — change it in one place.
- **No auto-commit:** unanswered `pending_confirmations` simply stay `pending`; nothing in the code times them out. This is intentional.
```
