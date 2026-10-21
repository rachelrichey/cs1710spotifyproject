import { useCallback, useRef, useState } from 'react';

/**
 * Tiny tooltip helper for SVG/canvas charts.
 *   const { ref, tip, show, hide } = useTooltip();
 *   <div ref={ref} className="chart"> ... onMouseMove={(e) => show(e, <b>Hi</b>)} ... <Tooltip tip={tip} /></div>
 * Position is computed relative to the chart wrapper so it works inside sticky layouts.
 */
export function useTooltip() {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  const show = useCallback((evt, content) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: evt.clientX - box.left, y: evt.clientY - box.top, w: box.width, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return { ref, tip, show, hide };
}

export function Tooltip({ tip }) {
  if (!tip) return null;
  const flip = tip.x > tip.w * 0.55;
  return (
    <div
      className="tooltip"
      role="status"
      style={{ left: tip.x, top: tip.y, transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)` }}
    >
      {tip.content}
    </div>
  );
}
