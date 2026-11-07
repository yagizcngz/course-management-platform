/*
 * STASHED, not in use. Until 2026-11-07 the public course list (/kurslar) wrapped its grid in this
 * stagger: every filter, sort or view change remounted the grid (the `key` below) so each card
 * faded and slid in again one after another. With many courses in a subject the cascade took
 * seconds and re-ran the motion for every card on each click, so the list now renders a plain grid
 * and the unfiltered page shows the curated rows of components/CourseShowcase.tsx.
 *
 * How it works: Stagger/StaggerItem (components/motion.tsx, motion/react) give each child an
 * entrance delayed by its index; `listKey` joins the active filters, so a new filter is a new key
 * and the whole list animates in again instead of leaving new cards hidden.
 *
 * To bring it back in routes/kurslar.tsx, render the cards inside
 *   <StaggeredCourseGrid listKey={[search.q, search.category, ...].join("|")} className="...">
 * with each card as a child.
 */
import { Children, type ReactNode } from "react";
import { Stagger, StaggerItem } from "../motion";

export function StaggeredCourseGrid({
  listKey,
  className,
  children,
}: {
  /** Changes whenever the filters change, so the grid remounts and re-staggers. */
  listKey: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Stagger key={listKey} className={className}>
      {Children.map(children, (child) => (
        <StaggerItem>{child}</StaggerItem>
      ))}
    </Stagger>
  );
}
