import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { PlateLogoImage } from "./PlateLogo";

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <PlateLogoImage size={28} />
            <span className="font-serif text-lg font-normal hidden sm:inline">Plate</span>
          </Link>

          <nav className="flex items-center gap-2">
            {isLoading ? null : isAuthenticated ? (
              <Button size="sm" asChild>
                <Link to="/dashboard">
                  Open App
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              !isAuthPage && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
