import React from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

interface RevealOnScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delay in ms before the reveal animation starts. */
  delay?: number;
  /** Tailwind translate class used in the hidden state. */
  from?: "bottom" | "left" | "right";
}

/**
 * Wraps children with a fade + slight slide-in animation when scrolled into view.
 * Respects prefers-reduced-motion via the `motion-reduce:` Tailwind variants.
 */
export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  className,
  delay = 0,
  from = "bottom",
  style,
  ...rest
}) => {
  const { ref, inView } = useInView<HTMLDivElement>();

  const hiddenTransform =
    from === "left" ? "-translate-x-3" : from === "right" ? "translate-x-3" : "translate-y-3";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms", ...style }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        "motion-reduce:transition-none motion-reduce:transform-none",
        inView ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${hiddenTransform}`,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default RevealOnScroll;
