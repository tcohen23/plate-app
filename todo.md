# PLATE — MFP Redesign + Feature Gates + PostHog
## Status: IN PROGRESS

## ⚠️ TYLER'S CONFIRMED RULES (2026-05-28)
- **DO NOT touch onboarding** — keep existing screens + split tests as-is
- **DO NOT change pricing** — keep existing Stripe prices ($5/mo etc.)
- **DO** implement free vs premium feature gates
- **DO** add PostHog events
- **DO** complete button audit / interactive polish

---

## Phase 1: Dashboard Redesign ✅ (mostly done)
- [x] MFP-style redesign base — all major pages built
- [x] Week strip navigation (tap through days)
- [x] "Today ▼" date navigation + date picker
- [x] "+" button → goes directly to Food Log (MFP-style)
- [x] Hydration tracking, grocery list, all core cards
- [x] All major pages: Food Log, Goals, Profile, Sleep, Weekly Digest, Learn, Friends, Messages, Help, More, Settings

---

## Phase 2: Button Audit (IN PROGRESS — threads working on it)
- [ ] Verify every button/dropdown from MFP screenshots works correctly
- [ ] "Today ▼" dropdown fully functional (tap back through dates)
- [ ] Week navigation prev/next works
- [ ] "+ Add a glass" button on hydration card
- [ ] All diary section Log/••• buttons
- [ ] Food Log tabs (History | My Meals | My Recipes | My Foods)
- [ ] Barcode Scan / Meal Scan in food log
- [ ] Settings sub-pages all navigable

---

## Phase 3: Free vs Premium Feature Gates
- [ ] `useIsPremium()` hook — verify or update existing
- [ ] Voice Log → premium gate (lock icon + "Go Premium" prompt)
- [ ] Meal Scan → premium gate
- [ ] AI meal plan limit (1/month free, unlimited premium)
- [ ] "Go Premium" gold pill in dashboard header (free users only)
- [ ] Gate any other premium-only features consistently

---

## Phase 4: PostHog Events
- [ ] Dashboard load event (with user plan: free/premium)
- [ ] Food log events (log food, barcode scan, voice log attempt, meal scan attempt)
- [ ] Feature gate hit events (user hit a premium gate — which feature)
- [ ] "Go Premium" CTA tap events (where in app)
- [ ] Hydration log events
- [ ] Weight log events
- [ ] Goals page view
- [ ] Weekly digest view
- [ ] Settings page views

---

## After coding
- [ ] `bun run sync:build`
- [ ] E2E test
- [ ] Screenshots / preview
- [ ] Show Tyler diff before deploying
