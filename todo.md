# PLATE v3 — Full Overhaul (Ali's Brief)
## Status: IN PROGRESS

## KEY DIFFERENCES from existing onboarding v2
- Currently: 22-screen onboarding with hard paywall (Step17Paywall)
- New: 24-screen onboarding with soft upsell (no hard paywall), freemium model
- Pricing change: $14.99/mo + $71.88/yr (was $5/mo)
- Stripe already has new price IDs configured ✅

---

## Phase 1: Onboarding Overhaul (24 screens)
### Routes to create/update under `/onboarding/*`

- [x] Screen 1: Welcome carousel `/onboarding/welcome` (3 auto-advancing slides, sign up / log in)
- [ ] Screen 2: Sign up method `/onboarding/signup` (email, Google, Apple OAuth)
- [ ] Screen 3: Name `/onboarding/name` (firstName)
- [ ] Screen 4: Goals multi-select `/onboarding/goals`
- [ ] Screen 5: Emotional interstitial "Real Talk" `/onboarding/interstitial-realtalk` (conditional)
- [ ] Screen 6: "Small habits = mighty change" `/onboarding/interstitial-choices`
- [ ] Screen 7: Activity level `/onboarding/activity`
- [ ] Screen 8: GLP-1 `/onboarding/glp1`
- [ ] Screen 9: Past barriers `/onboarding/barriers` (conditional, weight goals only)
- [ ] Screen 10: Meal plan opt-in `/onboarding/mealplan-optin`
- [ ] Screen 11: "Your Kitchen, Your Rules" interstitial `/onboarding/interstitial-kitchen` (conditional)
- [ ] Screen 12: "This Is Your Journey" interstitial `/onboarding/interstitial-journey` (conditional)
- [ ] Screen 13: Personal stats (sex, age, country, ZIP) `/onboarding/about-you`
- [ ] Screen 14: Measurements (height, weight, goal weight) `/onboarding/measurements`
- [ ] Screen 15: Weekly weight goal `/onboarding/weekly-goal` (conditional)
- [ ] Screen 16: Healthy habits priority `/onboarding/habits`
- [ ] Screen 17: Personalization & privacy consent `/onboarding/personalization`
- [ ] Screen 18: Account creation (email + password) `/onboarding/create-account`
- [ ] Screen 18.5: Email verification OTP `/onboarding/verify-email`
- [ ] Screen 19: Username picker `/onboarding/username`
- [ ] Screen 20: Plan reveal `/onboarding/plan-ready`
- [ ] Screen 21: Feature showcase `/onboarding/features`
- [ ] Screen 22: Soft upsell `/onboarding/upgrade`
- [ ] Screen 23: Post-purchase premium welcome `/onboarding/welcome-premium`
- [ ] Screen 24: Dashboard first open tooltip (dashboard with tooltip overlay)

### Existing screens to archive
- Current onboarding screens (Step01-Step18) exist and work
- Already have `legacy/onboarding-v1/` directory  
- Need to archive current v2 flow there too before replacing

---

## Phase 2: Dashboard Redesign
- [ ] Top bar: "Today ▾" | gold "Go Premium" pill (free users only) | streak counter
- [ ] Day selector row (S M T W T F S)
- [ ] Calories card (0 cal / total, progress bar)
- [ ] Macros card (Carbs / Fat / Protein, grams or %)
- [ ] Ad slot placeholder (free users only)
- [ ] Diary section (Breakfast / Lunch / Dinner / Snacks cards)
- [ ] Bottom nav: Today | Plan | (+) | Progress | More
- [ ] "+" quick action bottom sheet (Log Food, Barcode Scan, Voice Log, Meal Scan, Water, Weight, Exercise)
- [ ] Premium gate on Voice Log + Meal Scan

---

## Phase 3: Stripe / Subscription Updates
- [x] New 4 price IDs already in Convex env
- [ ] Update `createCheckoutSession` action in `convex/stripe.ts` for new pricing
  - Premium monthly: $14.99/mo (7-day trial)
  - Premium annual: $71.88/yr (7-day trial)
  - Workout monthly: $5/mo (no trial)
  - Workout annual: $36/yr (no trial)
- [ ] Update `useIsPremium` hook logic
- [ ] Update `getMyAccess` / `getSubscriptionStatus` to handle new role structure
- [ ] Remove old $5/mo hard paywall references
- [ ] `workoutAddOnStatus` field and upsell already partially exist

---

## Phase 4: Free vs Premium Feature Gates
- [ ] `useIsPremium()` hook or update existing
- [ ] AI meal plan limit (1/month free, unlimited premium)
- [ ] Voice Log gate
- [ ] Meal Scan gate
- [ ] "Go Premium" badge in dashboard header

---

## Phase 5: Brand + Design Tokens
- [ ] Add brand CSS tokens to app.css (plate-gold, plate-gold-bg, etc.)
- [ ] Import Fraunces (serif) font from Google Fonts
- [ ] Update component conventions (rounded-full CTAs, etc.)

---

## Phase 6: Comp Access Role Update
- [x] Schema already has role/adminLevel fields
- [ ] Update comp access list to include: owner, admin, moderator, friends_family, family, friends
- [ ] Verify `hasPremiumAccess()` covers all these roles
- [ ] Add workout access to comp roles

---

## Phase 7: PostHog Events
- [ ] Add onboarding funnel events to each step
- [ ] Add upsell/conversion events

---

## After coding
- [ ] `bun run sync:build`
- [ ] E2E test
- [ ] Screenshots
- [ ] Deploy preview
- [ ] Notify Tyler with preview link
