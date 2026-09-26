// The architecture picture on /how-it-works/architecture. Hand-built SVG so it
// stays crisp and follows the light/dark theme (colors come from CSS classes
// in global.css). Two layouts: wide for desktop, stacked for phones.

function Box({
  x,
  y,
  w,
  h,
  title,
  lines,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
}) {
  const cx = x + w / 2;
  const top = y + h / 2 - (lines.length * 17) / 2;
  return (
    <g>
      <rect className="arch-box" x={x} y={y} width={w} height={h} rx={10} />
      <text className="arch-title" x={cx} y={top + 4} textAnchor="middle">
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={l} className="arch-sub" x={cx} y={top + 23 + i * 17} textAnchor="middle">
          {l}
        </text>
      ))}
    </g>
  );
}

function Arrowhead({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path className="arch-arrowhead" d="M0 0 L10 5 L0 10 z" />
    </marker>
  );
}

const STORES = [
  { title: "Ollama", lines: ["runs the AI models", "nomic-embed-text · llama3", "port 11434"], narrow: ["runs the AI models", "port 11434"] },
  { title: "Qdrant", lines: ["stores chunk vectors", "for search", "port 6333"], narrow: ["chunk vectors", "port 6333"] },
  { title: "Postgres", lines: ["stores your chats", "and messages", "port 5433"], narrow: ["chats, messages", "port 5433"] },
  { title: "documents.json", lines: ["list of the files", "you uploaded", "file on disk"], narrow: ["uploaded files", "file on disk"] },
];

function Wide() {
  const boxW = 160;
  const gap = 16;
  const xs = STORES.map((_, i) => 24 + i * (boxW + gap));
  return (
    <svg className="arch-svg arch-wide" viewBox="0 0 736 360" role="img" aria-labelledby="arch-wide-title">
      <title id="arch-wide-title">
        The web UI talks to the Express API, which uses Ollama, Qdrant, Postgres and documents.json. Everything runs on your machine.
      </title>
      <defs>
        <Arrowhead id="arch-arrow-w" />
      </defs>
      <rect className="arch-boundary" x={4} y={4} width={728} height={352} rx={14} />
      <text className="arch-boundary-label" x={22} y={30}>
        YOUR MACHINE · NOTHING LEAVES IT
      </text>

      <Box x={64} y={54} w={224} h={78} title="Web UI" lines={["React chat app", "port 5173"]} />
      <Box x={448} y={54} w={224} h={78} title="Express API" lines={["src/server.ts", "port 3000"]} />

      <line className="arch-line" x1={290} y1={80} x2={446} y2={80} markerEnd="url(#arch-arrow-w)" />
      <text className="arch-edge" x={368} y={71} textAnchor="middle">
        questions, uploads
      </text>
      <line className="arch-line" x1={446} y1={108} x2={290} y2={108} markerEnd="url(#arch-arrow-w)" />
      <text className="arch-edge" x={368} y={126} textAnchor="middle">
        answer, streamed + sources
      </text>

      <path className="arch-line" d={`M560 132 V184`} />
      <path className="arch-line" d={`M${xs[0] + boxW / 2} 184 H${xs[3] + boxW / 2}`} />
      {xs.map((x) => (
        <line key={x} className="arch-line" x1={x + boxW / 2} y1={184} x2={x + boxW / 2} y2={230} markerEnd="url(#arch-arrow-w)" />
      ))}
      {STORES.map((s, i) => (
        <Box key={s.title} x={xs[i]} y={232} w={boxW} h={96} title={s.title} lines={s.lines} />
      ))}
    </svg>
  );
}

function Narrow() {
  const boxW = 140;
  const boxH = 92;
  const pos = [
    { x: 20, y: 300 },
    { x: 200, y: 300 },
    { x: 20, y: 412 },
    { x: 200, y: 412 },
  ];
  return (
    <svg className="arch-svg arch-narrow" viewBox="0 0 360 524" role="img" aria-labelledby="arch-narrow-title">
      <title id="arch-narrow-title">
        The web UI talks to the Express API, which uses Ollama, Qdrant, Postgres and documents.json. Everything runs on your machine.
      </title>
      <defs>
        <Arrowhead id="arch-arrow-n" />
      </defs>
      <rect className="arch-boundary" x={4} y={4} width={352} height={516} rx={14} />
      <text className="arch-boundary-label" x={20} y={28}>
        YOUR MACHINE
      </text>

      <Box x={70} y={44} w={220} h={64} title="Web UI" lines={["React chat app · port 5173"]} />
      <Box x={70} y={180} w={220} h={64} title="Express API" lines={["src/server.ts · port 3000"]} />

      <line className="arch-line" x1={160} y1={110} x2={160} y2={178} markerEnd="url(#arch-arrow-n)" />
      <text className="arch-edge" x={150} y={148} textAnchor="end">
        ask, upload
      </text>
      <line className="arch-line" x1={200} y1={178} x2={200} y2={110} markerEnd="url(#arch-arrow-n)" />
      <text className="arch-edge" x={210} y={148}>
        answer + sources
      </text>

      <path className="arch-line" d="M180 244 V458" />
      {pos.map((p) => {
        const midY = p.y + boxH / 2;
        const toLeft = p.x < 180;
        return (
          <line
            key={`${p.x}-${p.y}`}
            className="arch-line"
            x1={180}
            y1={midY}
            x2={toLeft ? p.x + boxW + 2 : p.x - 2}
            y2={midY}
            markerEnd="url(#arch-arrow-n)"
          />
        );
      })}
      {STORES.map((s, i) => (
        <Box key={s.title} x={pos[i].x} y={pos[i].y} w={boxW} h={boxH} title={s.title} lines={s.narrow} />
      ))}
    </svg>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="arch-figure">
      <Wide />
      <Narrow />
    </figure>
  );
}
