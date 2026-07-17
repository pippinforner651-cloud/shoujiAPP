# E23 Android-Then-Route Sequenced Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the approved order: prove Android startup stability first, then produce the 27,000+ kilometre real V2 route.

**Architecture:** Two independent implementation plans are connected by a hard evidence gate. The route plan cannot start until the Android plan concludes PASS; neither plan activates V2, merges main, or runs a database migration.

**Tech Stack:** React/Capacitor Android, ADB/logcat, GitHub Actions, Node/TypeScript, static GeoJSON route packages.

## Global Constraints

- Branch: `codex/e23-v2-baseline`.
- PR #1 remains Draft.
- No merge to `main`.
- No Prisma migration or production database.
- No AMap Key/SDK/online routing.
- No public OSM online tiles or tile prefetch.
- No fake route, progress, runner, or ranking.
- V2 remains `DRAFT` until genuine route verification.

---

### Task 1: Execute the Android startup plan

**Files:**
- Plan: `docs/superpowers/plans/2026-07-17-e23-android-startup-stability.md`

**Interfaces:**
- Produces: evidence-backed root cause, minimal-fix decision, emulator 5/5, phone 5/5, and APK PASS/FAIL.

- [ ] **Step 1: Execute all Android plan tasks in order**

Use every command, expected result, stop condition, and rollback rule in the Android plan.

- [ ] **Step 2: Apply the route-start gate**

Route work may begin only when the Android report records:

```text
unique_root_cause=CONFIRMED
emulator_cold_starts=5/5
physical_cold_starts=5/5
resume_cycles=3/3
location_denial_crash=NO
local_persistence=PASS
apk_decision=PASS
```

If any field differs, stop and continue Android diagnosis.

---

### Task 2: Execute the real-route plan

**Files:**
- Plan: `docs/superpowers/plans/2026-07-17-e23-v2-real-route.md`

**Interfaces:**
- Consumes: Android PASS gate.
- Produces: no higher than a genuinely `VERIFIED`, inactive, immutable V2 route package.

- [ ] **Step 1: Execute all route plan tasks in order**

Follow its DRAFT, evidence, source, content, distance, audit, version, and rollback gates.

- [ ] **Step 2: Stop before map integration**

Do not bind the route to an event, set it `ACTIVE`, or change the homepage. Present the verified route report and request the separate route-switch/map-integration decision.
