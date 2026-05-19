/**
 * Plate brand logomark — stylized serif P with circular arc.
 * Uses the official PNG logo asset for pixel-perfect rendering,
 * with an SVG fallback for inline/small uses.
 */

/**
 * PNG-based logo mark — uses the actual logo image asset.
 * Best for headers, hero sections, and anywhere the logo needs to look perfect.
 */
export function PlateLogoImage({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/plate-logo.png"
      alt="Plate"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}

/**
 * SVG logo mark — for inline use, icons, and places where currentColor is needed.
 * Matches the flat design: serif P with C-arc wrapping around.
 */
export function PlateLogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 220"
      fill="none"
      className={className}
      aria-label="Plate logo"
    >
      {/* Outer C-arc: opens on the right side */}
      <path
        d="M 140 175 A 78 78 0 1 1 140 45"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      {/* P vertical stem */}
      <line
        x1="68" y1="28" x2="68" y2="192"
        stroke="currentColor"
        strokeWidth="8"
      />
      {/* P serif foot */}
      <path
        d="M 54 192 L 80 192"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* P serif top */}
      <path
        d="M 60 28 L 76 28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* P bowl — smooth open curve */}
      <path
        d="M 68 35 C 68 35, 95 32, 118 48 C 141 64, 141 88, 118 104 C 95 120, 68 117, 68 117"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full Plate logo with text — for landing page hero and larger displays.
 * Uses PNG logo mark + "Plate" wordmark + "Nutrition, Perfected." tagline.
 */
export function PlateLogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <PlateLogoImage size={80} />
      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-normal tracking-tight leading-[0.95] mt-5">
        Plate
      </h1>
      <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted-foreground mt-3 font-medium">
        Nutrition, Perfected.
      </p>
    </div>
  );
}
