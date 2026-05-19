import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-5 pb-16 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-3xl font-serif mb-1">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">

        <section className="space-y-2">
          <h2 className="text-base font-semibold">What Plate Does</h2>
          <p>Plate is a personal nutrition app. It generates personalized meal plans, tracks your food and macros, and helps you hit your health goals. This policy explains what data we collect to make that work and how we handle it.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">What We Collect</h2>
          <ul className="space-y-2 list-none">
            <li><span className="font-medium">Account info</span> — your name and email, used to identify your account.</li>
            <li><span className="font-medium">Health & body data</span> — height, weight, age, gender, activity level, diet preferences, and health goals. You provide this voluntarily during onboarding to generate your personalized plan.</li>
            <li><span className="font-medium">Food & meal logs</span> — meals you log, barcode scans, and nutrition data associated with them.</li>
            <li><span className="font-medium">Progress data</span> — weight check-ins, body composition entries, and workout logs you submit.</li>
            <li><span className="font-medium">Usage data</span> — which features you use, how often you open the app, and basic analytics to improve the product.</li>
            <li><span className="font-medium">Profile photo</span> — if you choose to upload one. Optional. Stored securely.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">How We Use It</h2>
          <ul className="space-y-2 list-none">
            <li>To generate your personalized meal plans and macro targets</li>
            <li>To track your progress and surface relevant insights</li>
            <li>To improve the app — identifying what works and what doesn't</li>
            <li>To operate leaderboards (your name and stats may appear to other users)</li>
          </ul>
          <p>We do not sell your data. We do not share it with advertisers. We do not use it to train AI models sold to third parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Data Storage & Security</h2>
          <p>Your data is stored in Convex, a secure cloud database. Data is encrypted in transit and at rest. We use Clerk for authentication — we never see or store your password.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Your Rights</h2>
          <p>You can update or delete your profile data from the Settings page at any time. To permanently delete your account and all associated data, contact us at the email below. We'll process it within 30 days.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Third-Party Services</h2>
          <p>Plate uses the following third-party services to operate:</p>
          <ul className="space-y-1 list-none text-muted-foreground">
            <li>Convex (database and backend)</li>
            <li>Vercel (hosting)</li>
            <li>Clerk (authentication)</li>
            <li>PostHog (analytics)</li>
          </ul>
          <p>Each has their own privacy policy. We only share the minimum data needed for these services to function.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Children</h2>
          <p>Plate is not intended for users under 13. If you believe a child has created an account, contact us and we'll remove it promptly.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Changes to This Policy</h2>
          <p>If we make material changes, we'll update the date at the top of this page. Continued use of the app after changes means you accept the updated policy.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Contact</h2>
          <p>Questions? Email us at <a href="mailto:support@getplate.app" className="underline hover:no-underline">support@getplate.app</a></p>
        </section>

      </div>
    </div>
  );
}
