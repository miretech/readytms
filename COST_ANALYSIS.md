# ReadyTMS — Project Cost & Token Analysis

> **Bottom line (rough estimate): ≈ $350 – $1,050 spent to date.**
> Most likely **~$450 – $600** if development ran on a flat Claude Code
> subscription; the high end applies only if Claude Code was billed
> pay‑as‑you‑go on the API. Only **$124** of this is a fixed, known fee
> (Apple $99 + Google Play $25) — **everything else is an estimate.**

_Prepared 2026-07-01. All figures are rough estimates unless marked "known fee."_

---

## Why these are estimates, not exact figures

Two facts drive this whole analysis:

1. **Nothing about cost is stored in the project.** ReadyTMS calls the Anthropic
   API for document/load extraction and fuel‑report parsing
   (`server/aiExtraction.ts`, `server/fuelImport.ts`, `server/gmailPoller.ts`,
   all using `claude-haiku-4-5-20251001`), but it records **no token counts, no
   usage logs, and no cost tables**. The app's own AI spend has to be estimated
   from how it uses the API, not read back from a ledger.
2. **The project is only ~3 weeks old.** Git history shows the first commit on
   **2026‑06‑10** (Replit Agent) and the latest on **2026‑06‑28** — 56 commits
   total, ~66.6K lines of code, with ~14 commits authored by Claude / Claude
   Code. A three‑week window caps every cost category. This is a young project,
   so the total is in the **low hundreds of dollars**, dominated by
   AI‑assisted development rather than a large accumulated bill.

Anthropic does not expose billing/usage data through any tool available in this
workspace, so the API and Claude Code figures below are modeled, not retrieved.

---

## Pricing inputs

| Item | Rate | Source |
|---|---|---|
| Anthropic API — **Haiku 4.5** (model ReadyTMS uses) | **$1.00 / M input tok, $5.00 / M output tok** | Current Anthropic pricing |
| Anthropic API — **Opus 4.8** (if Claude Code ran pay‑as‑you‑go) | **$5.00 / M input, $25.00 / M output** | Current Anthropic pricing |
| **Claude Code** subscription tiers | Pro ~$20/mo · Max 5× ~$100/mo · Max 20× ~$200/mo | Approx. consumer pricing (not the API rate card) |
| **Apple Developer Program** | $99 / year | Fixed fee |
| **Google Play Developer** | $25 one‑time | Fixed fee |
| **Replit Core** (project bootstrapped by Replit Agent) | ~$20/mo + Agent usage | Approx. |

---

## Cost breakdown

| # | Category | Low | High | Basis / assumption |
|---|---|---:|---:|---|
| 1 | **ReadyTMS app — own Anthropic API tokens (Haiku 4.5)** | $5 | $40 | Doc extraction ≤1024 out‑tok/call; fuel parsing ≤8K tok/call; plus Gmail‑poller auto‑extractions. ~hundreds→few‑thousand calls over 3 weeks of build + light traffic, modeled at ~2–3K in / 0.7–1.5K out per call. |
| 2 | **Claude Code — development usage** | $200 | $800+ | The dominant AI cost. ~14 of 56 commits Claude‑authored on a 66K‑line, 3‑week agentic build. **Low = flat subscription** (Max 20× ≈ $200/mo). **High = API pay‑as‑you‑go on Opus 4.8** for intensive agentic coding. *This is the single biggest swing in the total.* |
| 3 | **Replit Agent / hosting bootstrap** | $20 | $60 | First commit is Replit Agent → ~1 month Replit Core + some Agent checkpoint usage. |
| 4 | **Apple Developer Program** (App Store) | $99 | $99 | **Known fee** — $99/yr, assumed paid once. |
| 5 | **Google Play Developer** (Play Store) | $25 | $25 | **Known fee** — $25 one‑time. |
| 6 | **ReadyTMS operating / hosting** | $0 | $40 | Node server + Postgres (`shared/schema.ts`, 37 tables) + Gmail integration run ~3 weeks on a small managed host + managed DB (Neon/Railway/Replit). |
| 7 | **Misc** (domain, etc.) | $0 | $15 | ~$12/yr if a domain is registered. |
| | **Total (rough)** | **≈ $350** | **≈ $1,080** | |

**Most likely case (~$450–$600):** development on a flat Claude Code
subscription (~$200), app API tokens ~$15, Replit ~$30, Apple $99, Play $25,
hosting ~$20, misc ~$10.

### What's fixed vs. estimated

- **Known, fixed fees:** Apple $99 + Google Play $25 = **$124**.
- **Everything else is an estimate** — and category #2 (Claude Code) accounts for
  nearly the entire spread between the low and high totals. Pin down how Claude
  Code is billed (flat subscription vs. metered API) and the range collapses to a
  tight figure.

---

## How to replace these estimates with exact numbers

1. **Anthropic API + Claude Code:** Anthropic Console → **Billing / Usage**
   export gives exact token counts and dollar cost per day and per API key.
2. **App Store / Play Store:** the $99 Apple and $25 Google receipts are in the
   billing inbox (search Gmail for "Apple Developer" and "Google Play
   Developer").
3. **Replit / hosting / domain:** provider invoices (Replit, Neon/Railway,
   registrar) — also typically emailed receipts.
4. **Consolidated actuals:** if these expenses are booked in QuickBooks, a P&L
   for 2026‑06‑01 → today lists every real transaction and replaces this whole
   estimate with actuals.

_Once you have any of the above, this table can be updated in place — the
structure stays the same, only the numbers firm up._
