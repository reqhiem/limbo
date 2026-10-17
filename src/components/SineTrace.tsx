import { useMemo, useSyncExternalStore } from "react";
import styles from "./SineTrace.module.css";

const W = 1200;
const H = 40;
const CYCLES = 3.5;
const STEPS_PER_CYCLE = 16;

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(reducedQuery).matches);

/** One sine trace; its phase advances one discrete step per arrival (no easing). */
export function SineTrace({ phase }: { phase: number }) {
  const reduced = useReducedMotion();
  const step = reduced ? 0 : phase % STEPS_PER_CYCLE;
  const d = useMemo(() => {
    const shift = (step / STEPS_PER_CYCLE) * Math.PI * 2;
    const points: string[] = [];
    for (let x = 0; x <= W; x += 4) {
      const y = H / 2 - (H / 2 - 4) * Math.sin((x / W) * CYCLES * Math.PI * 2 - shift);
      points.push(`${x} ${y.toFixed(2)}`);
    }
    return `M${points.join("L")}`;
  }, [step]);

  return (
    <svg className={styles.trace} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M0 ${H / 2}H${W}`} className={styles.axis} vectorEffect="non-scaling-stroke" />
      <path d={d} className={styles.wave} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
