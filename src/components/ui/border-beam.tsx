import { cn } from "@/lib/utils";

export const BorderBeam = ({
  className,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  duration = 5,
  delay = 0,
}: {
  className?: string;
  colorFrom?: string;
  colorTo?: string;
  duration?: number;
  delay?: number;
}) => {
  return (
    <div
      style={
        {
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--duration": `${duration}s`,
          "--delay": `${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        "absolute inset-0 rounded-[inherit] [border:calc(var(--border-width,1px))_solid_transparent]",
        // mask styles
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        // pseudo-element styles
        "after:absolute after:aspect-square after:w-[200%] after:content-['']",
        "after:![animation-delay:var(--delay)] after:![animation-duration:var(--duration)]",
        // animation
        "after:animate-border-beam after:[background:linear-gradient(to_right,var(--color-from),var(--color-to),var(--color-from))] after:[offset-anchor:calc(var(--anchor-x,0)*1%)_calc(var(--anchor-y,0)*1%)] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--radius)-var(--border-width)))]",
        className,
      )}
    />
  );
};