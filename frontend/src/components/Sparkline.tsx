// Minimal line chart: no axes, just the shape of the series.
export default function Sparkline({ points }: { points: number[] }) {
  const w = 300;
  const h = 48;
  const min = Math.min(...points);
  const span = Math.max(...points) - min || 1;
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 4 - ((p - min) / span) * (h - 8)).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="trend">
      <path d={path} />
    </svg>
  );
}
