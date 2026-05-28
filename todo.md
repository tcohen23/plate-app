# PLATE — MFP Redesign + Feature Gates + PostHog
## Status: IN PROGRESS (consolidation build)

## ⚠️ TYLER'S CONFIRMED RULES (2026-05-28)
- **DO NOT touch onboarding** — keep existing screens + split tests as-is
- **DO NOT change pricing** — keep existing Stripe prices
- **Paywall rules**: Scanner features (barcode, meal_scan, voice_log) → carousel bottom-sheet paywall. All other paywalls → existing animated full-screen overlay. GLP-1 is FREE (no gate).
- **DO** implement free vs premium feature gates
- **DO** add PostHog events

---

## Remaining Fixes Needed:

### 1. MeasurementsPage — Add "Last 7 Days" period option
- Currently only 1M/3M/6M — need "7D" option too

### 2. SettingsPage — Remove Community slot (if present)
- Already verified not in settings, may be in MorePage

### 3. MorePage — Verify Community not listed
- Already verified clean

### 4. Date navigation debugging
- Tyler says "Today ▼" and day dots still not working
- Portal already implemented — investigate if issue is with data loading for past dates

### 5. PostHog events
- Dashboard load, food log, gate hits, CTA taps, hydration, weight

### 6. Feature gates audit
- Voice Log, Meal Scan, Barcode Scan → scanner paywall
- Others → standard animated paywall

### After coding
- [ ] Build passes cleanly
- [ ] Deploy to Cloudflare preview
- [ ] Send Tyler the preview URL
