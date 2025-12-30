import { cn } from "@/lib/utils";

interface PatternProps {
  className?: string;
}

// Arabic geometric corner ornament
export const CornerOrnament = ({ className, position = "top-left" }: PatternProps & { position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) => {
  const positionClasses = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0 rotate-90",
    "bottom-left": "bottom-0 left-0 -rotate-90",
    "bottom-right": "bottom-0 right-0 rotate-180",
  };

  return (
    <svg
      className={cn("absolute w-16 h-16 text-heritage-gold/20 pointer-events-none", positionClasses[position], className)}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 0L32 0L32 8L8 8L8 32L0 32L0 0Z"
        fill="currentColor"
      />
      <path
        d="M0 0L16 16L8 16L0 8L0 0Z"
        fill="currentColor"
        opacity="0.5"
      />
      <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3" />
    </svg>
  );
};

// Decorative divider with heritage pattern
export const HeritageDivider = ({ className }: PatternProps) => {
  return (
    <div className={cn("flex items-center justify-center gap-4 my-8", className)}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-heritage-gold/30 to-heritage-gold/50" />
      <svg
        className="w-8 h-8 text-heritage-gold/60"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 0L20 12L32 16L20 20L16 32L12 20L0 16L12 12L16 0Z"
          fill="currentColor"
        />
        <circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.5" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-heritage-gold/30 to-heritage-gold/50" />
    </div>
  );
};

// Background pattern overlay
export const GeometricPattern = ({ className }: PatternProps) => {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]", className)}>
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="heritage-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            {/* Eight-pointed star pattern */}
            <path
              d="M30 0L35 25L60 30L35 35L30 60L25 35L0 30L25 25L30 0Z"
              fill="currentColor"
              className="text-heritage-brown"
            />
            <circle cx="30" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="1" className="text-heritage-gold" />
            <circle cx="0" cy="0" r="4" fill="currentColor" className="text-heritage-brown" />
            <circle cx="60" cy="0" r="4" fill="currentColor" className="text-heritage-brown" />
            <circle cx="0" cy="60" r="4" fill="currentColor" className="text-heritage-brown" />
            <circle cx="60" cy="60" r="4" fill="currentColor" className="text-heritage-brown" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#heritage-pattern)" />
      </svg>
    </div>
  );
};

// Diamond pattern for cards
export const DiamondPattern = ({ className }: PatternProps) => {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diamond-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 0L40 20L20 40L0 20Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-heritage-gold"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diamond-pattern)" />
      </svg>
    </div>
  );
};

// Decorative border frame
export const DecorativeBorder = ({ className, children }: PatternProps & { children?: React.ReactNode }) => {
  return (
    <div className={cn("relative", className)}>
      <CornerOrnament position="top-left" />
      <CornerOrnament position="top-right" />
      <CornerOrnament position="bottom-left" />
      <CornerOrnament position="bottom-right" />
      {children}
    </div>
  );
};

// Floating decorative elements
export const FloatingOrnaments = ({ className }: PatternProps) => {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Top left ornament */}
      <div className="absolute top-20 left-10 w-24 h-24 opacity-10 animate-float">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-heritage-gold">
          <path d="M50 0L62 38L100 50L62 62L50 100L38 62L0 50L38 38L50 0Z" fill="currentColor" />
        </svg>
      </div>
      
      {/* Top right ornament */}
      <div className="absolute top-40 right-20 w-16 h-16 opacity-10 animate-float" style={{ animationDelay: '1s' }}>
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-heritage-brown">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="15" fill="currentColor" opacity="0.3" />
        </svg>
      </div>
      
      {/* Bottom ornament */}
      <div className="absolute bottom-32 left-1/4 w-20 h-20 opacity-10 animate-float" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-heritage-gold">
          <path d="M50 10L90 50L50 90L10 50Z" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M50 25L75 50L50 75L25 50Z" fill="currentColor" opacity="0.2" />
        </svg>
      </div>
    </div>
  );
};

// Section title with decorative elements
export const HeritageTitle = ({ className, children, subtitle }: PatternProps & { children: React.ReactNode; subtitle?: string }) => {
  return (
    <div className={cn("text-center", className)}>
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="w-12 h-px bg-gradient-to-r from-transparent to-heritage-gold/50" />
        <svg className="w-6 h-6 text-heritage-gold/60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" />
        </svg>
        <div className="w-12 h-px bg-gradient-to-l from-transparent to-heritage-gold/50" />
      </div>
      <h2 className="text-3xl md:text-4xl font-display font-bold text-heritage-brown dark:text-heritage-cream">
        {children}
      </h2>
      {subtitle && (
        <p className="mt-2 text-heritage-brown/70 dark:text-heritage-cream/70">{subtitle}</p>
      )}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-heritage-gold/30 to-heritage-gold/50" />
        <div className="w-2 h-2 rounded-full bg-heritage-gold/40" />
        <div className="w-20 h-px bg-gradient-to-l from-transparent via-heritage-gold/30 to-heritage-gold/50" />
      </div>
    </div>
  );
};
