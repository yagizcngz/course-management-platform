/** Percent change from `previous` to `current`; from zero, any rise counts as 100%. */
export const growthPercent = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

/** How many dates fall in this calendar month and in the month before (local time); undated rows count in neither. */
export const thisAndLastMonth = (dates: (string | null | undefined)[], now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let current = 0;
  let previous = 0;
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (d >= start) current++;
    else if (d >= prevStart) previous++;
  }
  return { current, previous };
};
