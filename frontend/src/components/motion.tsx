import { animate, motion, useInView, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Children, useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
// The server cannot know the visitor's motion preference, so `initial` must be the same on
// both sides (branching it on useReducedMotion broke hydration). Reduced motion instead
// gets an instant transition.
const INSTANT = { duration: 0 } as const;

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={reduce ? INSTANT : { duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container whose StaggerItem children reveal one after another. Key it on the list's
 * filter so a new set of items gets its own reveal instead of staying hidden.
 */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  // a long list must not take seconds to fill in: the whole cascade stays under ~0.8 s
  const step = Math.min(0.07, 0.8 / Math.max(1, Children.count(children)));
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      // a share of the element (amount: 0.1) never fits on screen for a grid taller than
      // ten viewports, so it would stay hidden; trigger once its top is well inside instead
      viewport={{ once: true, amount: "some", margin: "0px 0px -10% 0px" }}
      variants={{ show: { transition: reduce ? INSTANT : { staggerChildren: step } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: reduce ? INSTANT : { duration: 0.7, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Splits a headline into words that rise in; words wrapped in *asterisks* get the gold italic. */
export function SplitHeadline({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => {
        const accent = w.startsWith("*");
        const clean = w.replace(/\*/g, "");
        return (
          <motion.span
            key={i}
            className={accent ? "text-gold inline-block italic" : "inline-block"}
            initial={{ opacity: 0, y: 28, rotate: 2, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
            transition={reduce ? INSTANT : { duration: 0.9, ease: EASE, delay: 0.1 + i * 0.07 }}
          >
            {clean}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        );
      })}
    </span>
  );
}

/** Counts up to `value` once visible. */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString(),
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0); // same first render on server and client

  useEffect(() => {
    if (!inView) return;
    if (reduce) return setShown(value);
    const controls = animate(0, value, { duration: 1.6, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(shown)}
    </span>
  );
}
