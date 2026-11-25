// One row of reply pills, without sideways scrolling (Cameron, Nov 11): the pills that fit on the
// first line are shown and the rest are left out. Replies come in order of usefulness, so the
// ones dropped are the least likely picks. Re-measured whenever the row changes width.
import { useLayoutEffect } from 'preact/hooks';

export function fitOneRow(row: HTMLElement): void {
  const pills = [...row.children] as HTMLElement[];
  for (const p of pills) p.hidden = false;
  const top = pills[0]?.offsetTop ?? 0;
  pills.forEach((p, i) => {
    if (i > 0 && p.offsetTop > top + 2) p.hidden = true;
  });
}

export function useOneRow(ref: { current: HTMLElement | null }, key: unknown): void {
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    fitOneRow(row);
    if (typeof ResizeObserver !== 'function') return;
    let width = row.clientWidth;
    const ro = new ResizeObserver(() => {
      if (row.clientWidth === width) return; // hiding pills changes only the height
      width = row.clientWidth;
      fitOneRow(row);
    });
    ro.observe(row);
    return () => ro.disconnect();
  }, [key]);
}
