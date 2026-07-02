import type { DayStat } from './api';
import { fmtInt, fmtTokens } from './format';

/** Stable palette for pie slices / lines. */
export const PALETTE = [
  '#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff',
  '#39c5cf', '#ff7b72', '#a5d6ff', '#7ee787', '#ffa657',
];

export interface Slice {
  label: string;
  value: number;
}

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** Dependency-free SVG donut chart with a legend of shares. */
export function PieChart(props: { title: string; data: Slice[] }) {
  const data = props.data.filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 80, r = 46, cx = 100, cy = 100;

  return (
    <div className="card">
      <h3>{props.title}</h3>
      {total === 0 ? (
        <p className="muted">No data yet.</p>
      ) : (
        <div className="pie-wrap">
          <svg viewBox="0 0 200 200" className="pie" role="img" aria-label={props.title}>
            {(() => {
              let start = -Math.PI / 2;
              return data.map((d, i) => {
                const frac = d.value / total;
                const end = start + frac * Math.PI * 2;
                const large = end - start > Math.PI ? 1 : 0;
                const [x0, y0] = polar(cx, cy, R, start);
                const [x1, y1] = polar(cx, cy, R, end);
                const [ix1, iy1] = polar(cx, cy, r, end);
                const [ix0, iy0] = polar(cx, cy, r, start);
                // Full-circle single slice needs two arcs (a 360° arc is degenerate).
                const path = data.length === 1
                  ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} ` +
                    `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
                  : `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix0} ${iy0} Z`;
                start = end;
                return (
                  <path key={d.label} d={path} fill={PALETTE[i % PALETTE.length]} fillRule="evenodd">
                    <title>{`${d.label}: ${fmtInt(d.value)} (${((frac) * 100).toFixed(1)}%)`}</title>
                  </path>
                );
              });
            })()}
            <text x={cx} y={cy - 4} textAnchor="middle" className="pie-center-num">{fmtInt(total)}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="pie-center-label">total</text>
          </svg>
          <ul className="legend-list">
            {data.map((d, i) => (
              <li key={d.label}>
                <i className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="legend-label" title={d.label}>{d.label}</span>
                <span className="legend-val">{((d.value / total) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Dependency-free SVG line chart with two series (calls + est. tokens, dual axis). */
export function LineChart(props: { data: DayStat[] }) {
  const { data } = props;
  const W = 720, H = 220, padL = 44, padR = 44, padT = 16, padB = 28;
  if (data.length === 0) return <div className="card"><h3>Trends</h3><p className="muted">No data yet.</p></div>;

  const maxCalls = Math.max(1, ...data.map((d) => d.calls));
  const maxTok = Math.max(1, ...data.map((d) => d.outTokens));
  const n = data.length;
  const x = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const yCalls = (v: number) => H - padB - ((H - padT - padB) * v) / maxCalls;
  const yTok = (v: number) => H - padB - ((H - padT - padB) * v) / maxTok;

  const line = (accessor: (d: DayStat) => number, y: (v: number) => number) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(accessor(d)).toFixed(1)}`).join(' ');

  const callsPath = line((d) => d.calls, yCalls);
  const tokPath = line((d) => d.outTokens, yTok);

  return (
    <div className="card">
      <h3>Trends — calls &amp; est. tokens / day</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Daily trends">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} className="axis" />
        <path d={callsPath} className="line-calls" fill="none" />
        <path d={tokPath} className="line-tok" fill="none" />
        {data.map((d, i) => (
          <g key={d.day}>
            <circle cx={x(i)} cy={yCalls(d.calls)} r={2.5} className="dot-calls">
              <title>{`${d.day}: ${d.calls} calls`}</title>
            </circle>
            <circle cx={x(i)} cy={yTok(d.outTokens)} r={2.5} className="dot-tok">
              <title>{`${d.day}: ${fmtTokens(d.outTokens)} tokens`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="swatch line-calls-sw" /> calls</span>
        <span><i className="swatch line-tok-sw" /> est. tokens</span>
        <span className="muted">{data[0].day} → {data[data.length - 1].day}</span>
      </div>
    </div>
  );
}
