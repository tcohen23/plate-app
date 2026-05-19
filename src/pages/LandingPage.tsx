import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlateLogoFull } from "@/components/PlateLogo";

export function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [installOpen, setInstallOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32 min-h-[85vh]">
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-up">
          <PlateLogoFull />

          {/* App install bubble */}
          <div className="flex justify-center mt-4">
            <div className="w-full max-w-sm">
              <button
                onClick={() => setInstallOpen(!installOpen)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">📲</span>
                  <span className="text-sm font-medium text-foreground">Add Plate to your home screen</span>
                </div>
                <ChevronDown
                  className={`size-4 text-primary flex-shrink-0 transition-transform duration-200 ${installOpen ? "rotate-180" : ""}`}
                />
              </button>

              {installOpen && (
                <div className="mt-2 rounded-2xl bg-card border border-border/50 overflow-hidden text-left animate-fade-up">
                  <p className="px-5 pt-4 pb-2 text-xs text-muted-foreground">
                    Until we're in the App Store, here's how to install Plate on your phone in seconds.
                  </p>
                  <div className="px-5 py-4 border-t border-border/40">
                    <p className="text-xs font-semibold text-foreground mb-2.5">iPhone (Safari)</p>
                    <ol className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">1</span><span>Open this page in <strong className="text-foreground">Safari</strong></span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">2</span><span>Tap the <strong className="text-foreground">Share button</strong> (square with arrow) at the bottom</span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">3</span><span>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">4</span><span>Tap <strong className="text-foreground">"Add"</strong> and Plate opens like a real app</span></li>
                    </ol>
                  </div>
                  <div className="px-5 py-4 border-t border-border/40">
                    <p className="text-xs font-semibold text-foreground mb-2.5">Android (Chrome)</p>
                    <ol className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">1</span><span>Open this page in <strong className="text-foreground">Chrome</strong></span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">2</span><span>Tap the <strong className="text-foreground">three-dot menu</strong> (⋮) top-right</span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">3</span><span>Tap <strong className="text-foreground">"Add to Home screen"</strong> or <strong className="text-foreground">"Install app"</strong></span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold font-mono">4</span><span>Tap <strong className="text-foreground">"Install"</strong> and it launches full-screen like a native app</span></li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed font-light mt-6">
            Precision nutrition tailored to your body. Personalized meal plans, macro tracking, and grocery lists crafted by science and designed for you.
          </p>

          {!isAuthenticated && !isLoading && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button size="lg" className="text-sm h-12 px-8 rounded-full font-medium tracking-wide" asChild>
                <Link to="/signup">
                  Begin Your Journey
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-sm h-12 px-8 rounded-full font-medium text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          )}
          {isAuthenticated && (
            <div className="pt-4">
              <Button size="lg" className="text-sm h-12 px-8 rounded-full font-medium tracking-wide" asChild>
                <Link to="/dashboard">
                  Open Plate
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 animate-fade-in" style={{ animationDelay: "1s" }}>
          <span className="text-[10px] uppercase tracking-[0.2em] font-sans font-medium">Discover</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/30 to-transparent" />
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-20 items-start">
            <div className="space-y-6">
              <span className="label-uppercase text-muted-foreground">Our Philosophy</span>
              <h2 className="text-3xl md:text-4xl font-serif font-normal leading-tight">
                Nutrition is personal.<br />Your plan should be too.
              </h2>
            </div>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Plate uses the Mifflin-St Jeor equation, the gold standard in metabolic science, combined with your activity level, goals, and food preferences to build plans that actually work.
              </p>
              <p>
                No generic templates. No guesswork. Every calorie, every macro, every grocery item is calculated specifically for your body and your life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <span className="label-uppercase text-muted-foreground">What's Included</span>
            <h2 className="text-3xl md:text-4xl font-serif font-normal">
              Everything, thoughtfully considered
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden">
            <FeatureCell
              number="01"
              title="Smart Meal Plans"
              description="7-day plans built from 30+ chef-curated meals. Swap any meal instantly. Filtered by cooking time, diet preference, and your exact macros."
            />
            <FeatureCell
              number="02"
              title="Precision Tracking"
              description="Log meals with a tap, scan barcodes with your camera, or quick-add custom foods. Every macro counted, every calorie tracked."
            />
            <FeatureCell
              number="03"
              title="Grocery Intelligence"
              description="Auto-generated shopping lists from your meal plan. Real prices estimated by ZIP code and store. Organized by aisle."
            />
            <FeatureCell
              number="04"
              title="Barcode Scanner"
              description="Point your camera at any food product. Plate instantly pulls the nutrition facts and adds it to your daily log."
            />
            <FeatureCell
              number="05"
              title="Adaptive Engine"
              description="Your plan evolves with you. Update your weight, goals, or preferences anytime and your targets recalculate automatically."
            />
            <FeatureCell
              number="06"
              title="Progress Insights"
              description="Track weight trends, earn achievements, build streaks. See your transformation unfold with data that motivates."
            />
          </div>
        </div>
      </section>

      {/* Install as App */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <span className="label-uppercase text-muted-foreground">Get the App</span>
            <h2 className="text-3xl md:text-4xl font-serif font-normal">
              Add Plate to your home screen
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Plate works like a native app. No app store needed. Install it in seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-card rounded-2xl p-8 space-y-5 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h3 className="text-lg font-serif">iPhone (Safari)</h3>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">1</span>
                  <span>Open this page in <strong className="text-foreground">Safari</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">2</span>
                  <span>Tap the <strong className="text-foreground">Share button</strong> (square with arrow) at the bottom of the screen</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">3</span>
                  <span>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">4</span>
                  <span>Tap <strong className="text-foreground">"Add"</strong> and Plate appears on your home screen like a real app</span>
                </li>
              </ol>
            </div>

            <div className="bg-card rounded-2xl p-8 space-y-5 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h3 className="text-lg font-serif">Android (Chrome)</h3>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">1</span>
                  <span>Open this page in <strong className="text-foreground">Chrome</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">2</span>
                  <span>Tap the <strong className="text-foreground">three-dot menu</strong> (⋮) in the top-right</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">3</span>
                  <span>Tap <strong className="text-foreground">"Add to Home screen"</strong> or <strong className="text-foreground">"Install app"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-primary font-bold mt-0.5">4</span>
                  <span>Tap <strong className="text-foreground">"Install"</strong> and Plate launches full-screen just like a native app</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-serif font-normal leading-tight">
            Your transformation<br />starts with a plan.
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Set up in two minutes. Get your personalized meal plan, macro targets, and grocery list right away.
          </p>
          {!isAuthenticated && !isLoading && (
            <Button size="lg" className="text-sm h-12 px-10 rounded-full font-medium tracking-wide" asChild>
              <Link to="/signup">
                Get Started
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-serif text-lg">Plate</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
            <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Plate. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCell({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-card p-8 md:p-10 space-y-4 group hover:bg-accent/30 transition-colors duration-300">
      <span className="text-xs font-mono text-muted-foreground/60">{number}</span>
      <h3 className="text-lg font-serif">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
