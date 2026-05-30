import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-5 pb-16 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-3xl font-serif mb-1">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 30, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Agreement to Terms</h2>
          <p>By creating an account or using the Plate app, you agree to these Terms of Service. If you don't agree, don't use the app. We may update these terms from time to time — continued use after changes means you accept the updated terms.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">What Plate Is</h2>
          <p>Plate is a personal nutrition and wellness app. It provides personalized meal plans, macro tracking, barcode scanning, and related health tools. Plate is not a medical service, dietitian, or licensed healthcare provider. Nothing in the app constitutes medical advice. Always consult a qualified healthcare professional before making significant changes to your diet or health routine.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Your Account</h2>
          <ul className="space-y-2 list-none">
            <li>You must be at least 13 years old to use Plate.</li>
            <li>You're responsible for keeping your login credentials secure.</li>
            <li>You're responsible for all activity that occurs under your account.</li>
            <li>Don't share your account with others or create accounts on behalf of someone else without their consent.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Free &amp; Premium Plans</h2>
          <p>Plate offers a free tier and a paid Premium subscription. Premium features are only accessible with an active subscription. Subscription pricing, billing cycles, and features are described in the app at the time of purchase.</p>
          <ul className="space-y-2 list-none">
            <li><span className="font-medium">Billing</span> — subscriptions are billed through Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis.</li>
            <li><span className="font-medium">Cancellation</span> — you can cancel anytime from your account settings. Cancellation takes effect at the end of the current billing period; no partial refunds are issued for unused time.</li>
            <li><span className="font-medium">Refunds</span> — all purchases are final unless required by applicable law. Contact support if you believe a charge was made in error.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="space-y-2 list-none">
            <li>Use Plate for any unlawful purpose</li>
            <li>Attempt to reverse-engineer, hack, or disrupt the app or its infrastructure</li>
            <li>Scrape, copy, or redistribute content or data from Plate without permission</li>
            <li>Impersonate another person or entity</li>
            <li>Upload or transmit malicious code or content</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Your Content</h2>
          <p>You own the data you enter into Plate (meal logs, progress entries, goals, etc.). By using Plate, you grant us a limited license to store and process that data for the purpose of providing the service to you. We don't sell your personal health data or use it to train AI models sold to third parties. See our <a href="/privacy" className="underline hover:no-underline">Privacy Policy</a> for full details.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Intellectual Property</h2>
          <p>All content, design, code, branding, and features of Plate — other than user-submitted data — are owned by Plate and protected by applicable intellectual property laws. You may not copy, reproduce, or distribute any part of the app without written permission.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Disclaimers</h2>
          <p>Plate is provided "as is" without warranties of any kind, express or implied. We do not guarantee that the app will be error-free, uninterrupted, or that nutritional data will be perfectly accurate. Nutritional information is sourced from third-party databases and may contain errors.</p>
          <p>Use Plate as a helpful tool — not as a substitute for professional medical or nutritional advice.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Plate and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app. Our total liability to you for any claim shall not exceed the amount you paid to us in the 12 months preceding the claim.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Governing Law</h2>
          <p>These terms are governed by the laws of the State of North Carolina, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts located in Wake County, North Carolina.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Contact</h2>
          <p>Questions about these terms? Email us at <a href="mailto:support@getplate.app" className="underline hover:no-underline">support@getplate.app</a></p>
          <p className="text-muted-foreground">
            Plate<br />
            Raleigh, NC 27601<br />
            United States
          </p>
        </section>

      </div>
    </div>
  );
}
