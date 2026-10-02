// The monitor: a second MonishOS window, a dashboard with one panel per thing
// about.md says Monish does. An agent run (AI), a training run (ML), a data
// pipeline (data) and a web app deploy (web).
// Everything plays once and rests on its finished state; the pipeline keeps
// streaming and the LIVE dot keeps pulsing.
import { F, lettering, r1, esc } from "./lettering.mjs";

const HOLD = 0.32;   // same beat as the boot log

export function monitor(mode, { C, BRAND, os }) {
  const L = lettering();
  const W = 1200, WX = 34, WY = 26, WW = W - WX * 2, TITLE = 40, P = 18, GAP = 16;
  const X0 = WX + P, X1 = WX + WW - P, LW = 560, RX = X0 + LW + GAP, RW = X1 - RX;
  const R1Y = WY + TITLE + P, R1H = 232, R2Y = R1Y + R1H + GAP, R2H = 214;
  const STATUS = R2Y + R2H + P, WH = STATUS + 28 - WY, H = WY + WH + 26;
  const animate = [];   // [selector, css] pairs collected while drawing
  let b = "", PK = 0;

  // ---- Desktop: the website's starfield ----
  b += `<rect width="${W}" height="${H}" rx="14" fill="${BRAND.bg}"/>`;
  let seed = 19;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let stars = "";
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = rnd() * H, r = rnd() < 0.08 ? 1.5 : 0.5 + rnd() * 0.7;
    const c = rnd() < 0.15 ? BRAND.sky : rnd() < 0.25 ? BRAND.indigo : "#ffffff";
    const tw = rnd() < 0.18 ? ` class="tw" style="animation-delay:${(-rnd() * 4).toFixed(2)}s"` : "";
    stars += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${c}" fill-opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"${tw}/>`;
  }
  b += `<g clip-path="url(#desk)">${stars}</g>`;

  // ---- Window ----
  b += `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="11" fill="${C.bg}" filter="url(#winShadow)"/>`;
  b += `<path d="M${WX} ${WY + TITLE} V${WY + 11} A11 11 0 0 1 ${WX + 11} ${WY} H${WX + WW - 11} A11 11 0 0 1 ${WX + WW} ${WY + 11} V${WY + TITLE} Z" fill="${C.chrome}"/><path d="M${WX} ${WY + TITLE + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  [["#ff5f57", "#e0443e"], ["#febc2e", "#dea123"], ["#28c840", "#1aab29"]].forEach(([f, s], i) => { b += `<circle cx="${WX + 22 + i * 21}" cy="${WY + 20}" r="6.5" fill="${f}" stroke="${s}" stroke-width="0.8"/>`; });
  b += L.text(`Monitor — ${os}`, W / 2, WY + 25, 13.5, { font: F.uiBold, anchor: "middle", fill: C.ui });
  // LIVE chip
  const lw = 58, lx = WX + WW - lw - 14, ly = WY + 10;
  b += `<rect x="${lx}" y="${ly}" width="${lw}" height="20" rx="10" fill="none" stroke="${C.accent}" stroke-opacity="0.45"/><circle class="pulse" cx="${lx + 14}" cy="${ly + 10}" r="3.5" fill="${C.accent}"/>`;
  b += L.text("LIVE", lx + 24, ly + 14, 10.5, { font: F.monoBold, ls: 1.2, fill: C.accent });

  // ---- Panels ----
  const panel = (x, y, w, h, label, sub) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.panel}" stroke="${C.border}"/>`;
    s += L.text(label, x + 18, y + 25, 11, { font: F.monoBold, ls: 1.4, fill: C.accent });
    let sx = x + 26 + L.width(label, 11, F.monoBold, 1.4);
    sub.split(" → ").forEach((part, i) => {
      if (i) { s += `<path d="M${r1(sx + 4)} ${y + 21} h12 m-4 -4 l4 4 l-4 4" fill="none" stroke="${C.uiDim}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`; sx += 22; }
      s += L.text(part, sx, y + 25, 12, { font: F.mono, fill: C.uiDim });
      sx += L.width(part + " ", 12, F.mono);
    });
    s += `<path d="M${x + 1} ${y + 38.5} H${x + w - 1}" stroke="${C.border}"/>`;
    return s;
  };
  const tsMono = (n) => n.toFixed(2) + "s";
  // Swap between text variants over time (like the scan HUD). steps: [[t, svg]...]
  let swapN = 0;
  const swap = (steps) => {
    let s = "";
    steps.forEach(([t, svg], i) => {
      const id = `sw${swapN}_${i}`, last = i === steps.length - 1;
      s += `<g class="${id}">${svg}</g>`;
      const from = t, to = last ? null : steps[i + 1][0];
      animate.push({ id, from, to, first: i === 0, last });
    });
    swapN++;
    return s;
  };
  const appear = (svg, t, cls = "show") => `<g class="${cls}" style="animation-delay:${t.toFixed(2)}s">${svg}</g>`;
  const spinner = (x, y, c) => `<g transform="translate(${x} ${y})"><circle r="5" fill="none" stroke="${c}" stroke-opacity="0.25" stroke-width="1.8"/><circle class="spin" r="5" fill="none" stroke="${c}" stroke-width="1.8" stroke-dasharray="8 24" stroke-linecap="round"/></g>`;
  const tick = (x, y, c, r = 7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><path d="M${x - r * 0.43} ${y + 0.2} l${r * 0.3} ${r * 0.3} l${r * 0.58} -${r * 0.62}" fill="none" stroke="${C.panel}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  const status = (x, y, t, runText, doneText) => swap([
    [0, spinner(x - L.width(runText, 12, F.mono) - 12, y - 4, C.ui) + L.text(runText, x, y, 12, { font: F.mono, anchor: "end", fill: C.ui })],
    [t, L.text(doneText, x, y, 12, { font: F.mono, anchor: "end", fill: C.ok })],
  ]);

  // Agent run (AI): it summarises this profile, and its answer is the domains
  {
    const x = X0, y = R1Y, w = LW;
    b += panel(x, y, w, R1H, "AGENT", "profile-bot");
    const T0 = 0.45;
    const rows = [
      ["goal", C.ui, [["summarise github.com/Monish25", C.text]]],
      ["plan", C.ui, [["3 tool calls", C.text]]],
      ["tool", C.link, [["github.repos", C.strong], ["(", C.punc], ['"Monish25"', C.url], [")", C.punc]], "0.21s"],
      ["tool", C.link, [["fs.read", C.strong], ["(", C.punc], ['"about.md"', C.url], [")", C.punc]], "0.04s"],
      ["tool", C.link, [["classify", C.strong], ["(repos, by=", C.punc], ['"domain"', C.url], [")", C.punc]], "0.38s"],
      ["answer", C.ok, null],
    ];
    const RY = y + 66, RH = 27, DX = x + 28, LX = x + 46, CX = x + 122;
    b += `<path d="M${DX} ${RY - 4} V${RY + (rows.length - 1) * RH - 4}" stroke="${C.border}" stroke-width="1.5"/>`;
    const done = T0 + rows.length * HOLD + 0.3;
    rows.forEach(([role, rc, call, dur], i) => {
      const yy = RY + i * RH, t = T0 + i * HOLD;
      let g = `<circle cx="${DX}" cy="${yy - 4.5}" r="4" fill="${C.panel}" stroke="${rc}" stroke-width="1.8"/>`;
      g += L.text(role, LX, yy, 12.5, { font: F.monoBold, fill: rc });
      if (call) {
        let cx = CX;
        for (const [txt, c] of call) { g += L.text(txt, cx, yy, 13, { font: F.mono, fill: c }); cx += L.width(txt, 13, F.mono); }
        if (dur) g += L.text(dur, x + w - 20, yy, 12, { font: F.mono, anchor: "end", fill: C.uiDim });
        b += appear(g, t);
      } else {
        b += appear(g, t);
        // The answer: one tag per domain, popping in one after another
        let tx = CX;
        ["web", "ML", "data", "AI"].forEach((d, k) => {
          const tw = L.width(d, 12.5, F.monoBold) + 18;
          const tag = `<rect x="${r1(tx)}" y="${yy - 16}" width="${r1(tw)}" height="22" rx="11" fill="${C.ok}" fill-opacity="0.12" stroke="${C.ok}" stroke-opacity="0.55"/>` + L.text(d, tx + 9, yy - 0.5, 12.5, { font: F.monoBold, fill: C.ok });
          b += appear(tag, t + 0.1 + k * 0.08, "pop");
          tx += tw + 7;
        });
      }
    });
    b += status(x + w - 18, y + 25, done, "running", "done · 3 calls");
  }

  // Training run (ML): train and validation loss, drawn as the epochs go by
  {
    const x = RX, y = R1Y, w = RW, EPOCHS = 40;
    const T0 = 0.45, DUR = 2.6;
    const cx0 = x + 52, cx1 = x + w - 22, cy0 = y + 62, cy1 = y + R1H - 36;
    const sx = (e) => cx0 + (e / EPOCHS) * (cx1 - cx0), sy = (v) => cy1 - (v / 0.9) * (cy1 - cy0);
    let n = 3;
    const noise = () => ((n = (n * 16807) % 2147483647) / 2147483647 - 0.5);
    const train = [], val = [];
    for (let e = 0; e <= EPOCHS; e++) {
      train.push(0.07 + 0.72 * Math.exp(-e / 8.5) + noise() * 0.018);
      val.push(0.15 + 0.63 * Math.exp(-e / 9.5) + 0.0028 * Math.max(0, e - 26) ** 1.4 + noise() * 0.024);
    }
    let best = 0;
    val.forEach((v, e) => { if (v < val[best]) best = e; });
    b += panel(x, y, w, R1H, "TRAINING", "text-classifier");
    // Grid and axes
    for (const v of [0.2, 0.4, 0.6, 0.8]) {
      b += `<path d="M${cx0} ${r1(sy(v))} H${cx1}" stroke="${C.border}" stroke-dasharray="2 4"/>`;
      b += L.text(v.toFixed(1), cx0 - 10, sy(v) + 4, 10.5, { font: F.mono, anchor: "end", fill: C.uiDim });
    }
    b += `<path d="M${cx0} ${cy0 - 6} V${cy1} H${cx1}" fill="none" stroke="${C.gutter}"/>`;
    for (const e of [0, 10, 20, 30, 40]) b += L.text(String(e), sx(e), cy1 + 17, 10.5, { font: F.mono, anchor: "middle", fill: C.uiDim });
    b += L.text("loss", cx0 - 10, cy0 - 12, 10.5, { font: F.mono, anchor: "end", fill: C.uiDim });
    // Legend
    const lgx = cx1 - 128, lgy = cy0 + 2;
    b += `<path d="M${lgx} ${lgy - 4} h18" stroke="${C.accent}" stroke-width="2.2" stroke-linecap="round"/>` + L.text("train", lgx + 24, lgy, 11.5, { font: F.mono, fill: C.ui });
    b += `<path d="M${lgx + 70} ${lgy - 4} h18" stroke="${C.link}" stroke-width="2.2" stroke-dasharray="4 3"/>` + L.text("val", lgx + 94, lgy, 11.5, { font: F.mono, fill: C.ui });
    // Curves, drawn with pathLength=1 so one keyframe fits both
    const line = (pts) => pts.map((v, e) => `${e ? "L" : "M"}${r1(sx(e))} ${r1(sy(v))}`).join(" ");
    b += `<path class="draw" d="${line(train)}" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    // The val curve is dashed with a striped mask, since its own dasharray draws it in
    b += `<g class="drawdash"><path class="draw" d="${line(val)}" pathLength="1" fill="none" stroke="${C.link}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></g>`;
    animate.push({ css: `.draw { stroke-dasharray: 1; animation: draw ${tsMono(DUR)} linear ${tsMono(T0)} both; }` });
    // Best checkpoint
    const bx = sx(best), by = sy(val[best]);
    const ck = `<path d="M${r1(bx)} ${r1(by + 8)} V${cy1}" stroke="${C.ok}" stroke-dasharray="2 3"/><circle cx="${r1(bx)}" cy="${r1(by)}" r="5" fill="${C.panel}" stroke="${C.ok}" stroke-width="2"/>` +
      L.text(`best ckpt · epoch ${best}`, bx, by - 13, 11.5, { font: F.mono, anchor: "middle", fill: C.ok });
    b += appear(ck, T0 + DUR + 0.1, "pop");
    // Epoch counter in the header
    const ex = x + w - 18;
    b += swap([0, 8, 16, 24, 32, 40].map((e) => [T0 + (e / EPOCHS) * DUR, L.text(`epoch ${e}/${EPOCHS}`, ex, y + 25, 12, { font: F.mono, anchor: "end", fill: e === EPOCHS ? C.ok : C.ui })]));
  }

  // Data pipeline (data): stages light up in order, then rows keep streaming
  {
    const x = X0, y = R2Y, w = LW;
    b += panel(x, y, w, R2H, "PIPELINE", "raw → model");
    const T0 = 0.65;
    const stages = [["ingest", "csv · api"], ["clean", "dedupe"], ["features", "embed"], ["train", "pytorch"], ["serve", "fastapi"]];
    const NW = 78, NH = 38, NY = y + 64, sx0 = x + 20, step = (w - 40 - NW) / (stages.length - 1);
    const cy = NY + NH / 2;
    PK = step - NW - 16;
    stages.forEach(([name, cap], i) => {
      const nx = sx0 + i * step, t = T0 + i * HOLD;
      if (i < stages.length - 1) {
        const ax = nx + NW + 3, bx2 = nx + step - 3;
        b += `<path d="M${r1(ax)} ${cy} H${r1(bx2)}" stroke="${C.border}" stroke-width="1.5"/><path d="M${r1(bx2 - 5)} ${cy - 4} L${r1(bx2)} ${cy} L${r1(bx2 - 5)} ${cy + 4}" fill="none" stroke="${C.gutter}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        // Packets: two per link, flowing once both ends are up
        let pk = "";
        for (let k = 0; k < 2; k++) pk += `<circle class="pk" cx="${r1(ax + 2)}" cy="${cy}" r="2.6" fill="${C.accent}" style="animation-delay:${(-k * 0.55 - i * 0.2).toFixed(2)}s"/>`;
        b += appear(pk, T0 + (i + 1) * HOLD + 0.1);
      }
      b += `<rect x="${r1(nx)}" y="${NY}" width="${NW}" height="${NH}" rx="8" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>`;
      b += appear(`<rect x="${r1(nx)}" y="${NY}" width="${NW}" height="${NH}" rx="8" fill="${C.accent}" fill-opacity="0.08" stroke="${C.accent}" stroke-width="1.5"/>`, t);
      b += L.text(name, nx + NW / 2, NY + 24, 12.5, { font: F.monoBold, anchor: "middle", fill: C.strong });
      b += L.text(cap, nx + NW / 2, NY + NH + 18, 11, { font: F.mono, anchor: "middle", fill: C.uiDim });
    });
    // Throughput: one bar per batch, filling in left to right
    const BY = y + R2H - 16, BH = 30, NB = 46, bw = (w - 40) / NB;
    let n = 11;
    const rn = () => (n = (n * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < NB; k++) {
      const v = 0.35 + 0.45 * Math.sin(k / 5) ** 2 + rn() * 0.2;
      const hh = Math.max(3, v * BH), bx = x + 20 + k * bw;
      b += `<rect class="bar" x="${r1(bx)}" y="${r1(BY - hh)}" width="${r1(bw - 3)}" height="${r1(hh)}" rx="1" fill="${C.accent}" fill-opacity="${k === NB - 1 ? 0.9 : 0.3}" style="animation-delay:${(T0 + k * 0.045).toFixed(2)}s"/>`;
    }
    b += L.text("rows / batch", x + w - 20, BY - BH - 6, 10.5, { font: F.mono, anchor: "end", fill: C.uiDim });
    b += status(x + w - 18, y + 25, T0 + stages.length * HOLD, "starting", "streaming");
  }

  // Deploy (web): the website's own pipeline, lint to Vercel
  {
    const x = RX, y = R2Y, w = RW;
    b += panel(x, y, w, R2H, "DEPLOY", "web app");
    const T0 = 1.1;
    const checks = [
      ["lint", "eslint, no warnings"],
      ["test", "vitest + playwright"],
      ["build", "next build"],
      ["ship", "vercel, preview live"],
    ];
    const rcx = x + 82, rcy = y + 116, rr = 44;
    b += `<circle cx="${rcx}" cy="${rcy}" r="${rr}" fill="none" stroke="${C.border}" stroke-width="7"/>`;
    b += `<circle class="ring" cx="${rcx}" cy="${rcy}" r="${rr}" pathLength="1" fill="none" stroke="${C.ok}" stroke-width="7" stroke-linecap="round" transform="rotate(-90 ${rcx} ${rcy})" style="animation-delay:${T0.toFixed(2)}s"/>`;
    animate.push({ css: `.ring { stroke-dasharray: 1; animation: draw ${tsMono(checks.length * HOLD)} steps(${checks.length}, start) both; }` });
    b += swap(checks.map((_, k) => [k === 0 ? 0 : T0 + (k - 1) * HOLD, L.text(`${k}/${checks.length}`, rcx, rcy + 7, 22, { font: F.uiBold, anchor: "middle", fill: C.strong })]).concat([[T0 + (checks.length - 1) * HOLD, L.text(`${checks.length}/${checks.length}`, rcx, rcy + 7, 22, { font: F.uiBold, anchor: "middle", fill: C.strong })]]));
    b += L.text("passed", rcx, rcy + 25, 11, { font: F.mono, anchor: "middle", fill: C.uiDim });
    const CX = x + 160, CY = y + 72;
    checks.forEach(([name, note], i) => {
      const yy = CY + i * 31, t = T0 + i * HOLD;
      b += `<circle cx="${CX + 7}" cy="${yy - 4.5}" r="7" fill="none" stroke="${C.border}" stroke-width="1.5"/>`;
      b += appear(tick(CX + 7, yy - 4.5, C.ok), t, "pop");
      b += L.text(name, CX + 24, yy, 13.5, { font: F.uiBold, fill: C.strong });
      b += L.text(note, CX + 86, yy, 13, { font: F.mono, fill: C.ui });
    });
    b += status(x + w - 18, y + 25, T0 + checks.length * HOLD, "deploying", "live");
  }

  // ---- Status bar ----
  b += `<path d="M${WX} ${STATUS} H${WX + WW} V${STATUS + 28 - 11} A11 11 0 0 1 ${WX + WW - 11} ${STATUS + 28} H${WX + 11} A11 11 0 0 1 ${WX} ${STATUS + 28 - 11} Z" fill="${C.status}"/><path d="M${WX} ${STATUS + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  b += `<rect x="${WX + 14}" y="${STATUS + 7}" width="14" height="14" rx="3.5" fill="none" stroke="${C.accent}" stroke-width="1.3"/>` + L.text("M", WX + 21, STATUS + 17.5, 9.5, { font: F.monoBold, anchor: "middle", fill: C.accent });
  b += L.text(`${os}  ·  monitor`, WX + 36, STATUS + 18.5, 12, { fill: C.ui });
  b += swap([[0, L.text("4 jobs running", WX + 170, STATUS + 18.5, 12, { fill: C.ui })], [3.3, L.text("4 jobs done  ·  0 errors", WX + 170, STATUS + 18.5, 12, { fill: C.ok })]]);
  b += L.text(`web  ·  ML  ·  data  ·  AI     Theme: ${C.name}`, WX + WW - 16, STATUS + 18.5, 12, { anchor: "end", fill: C.ui });

  // ---- Timing ----
  const total = 4;
  const pct = (t) => ((Math.min(t, total) / total) * 100).toFixed(2);
  let css = `
  .tw { animation: tw 3.2s ease-in-out infinite; }
  @keyframes tw { 50% { fill-opacity: .95; } }
  .pulse { animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .25; } }
  .show { animation: show .01s linear both; }
  @keyframes show { from { opacity: 0; } to { opacity: 1; } }
  .pop { animation: pop .28s cubic-bezier(.2,.9,.3,1.3) both; transform-box: fill-box; transform-origin: center; }
  @keyframes pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
  .spin { transform-box: fill-box; transform-origin: center; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  .drawdash { mask: url(#dash); }
  .pk { animation: pk 1.1s linear infinite; }
  @keyframes pk { from { transform: translateX(0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } to { transform: translateX(${PK}px); opacity: 0; } }
  .bar { transform-box: fill-box; transform-origin: bottom; animation: bar .35s ease-out both; }
  @keyframes bar { from { transform: scaleY(0); } to { transform: none; } }`;
  for (const a of animate) {
    if (a.css) { css += `\n  ${a.css}`; continue; }
    const { id, from, to, first, last } = a;
    const start = first ? 0 : from, end = last ? total : to;
    css += `\n  .${id} { opacity: ${last ? 1 : 0}; animation: ${id} ${total}s linear both; }
  @keyframes ${id} { 0%, ${pct(Math.max(0, start - 0.001))}% { opacity: ${first ? 1 : 0}; } ${pct(start)}%, ${pct(Math.max(start, end - 0.001))}% { opacity: 1; } ${pct(end)}%, 100% { opacity: ${last ? 1 : 0}; } }`;
  }
  const defs = `<clipPath id="desk"><rect width="${W}" height="${H}" rx="14"/></clipPath>
<mask id="dash" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/>${Array.from({ length: Math.ceil(WW / 7) }, (_, i) => `<rect x="${WX + i * 7}" y="0" width="4" height="${H}" fill="#fff"/>`).join("")}</mask>
<filter id="winShadow" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/></filter>`;
  const label = `${os} Monitor, four panels. Agent: profile-bot summarises github.com/Monish25 in three tool calls and answers web, ML, data, AI. Training: a text classifier's train and validation loss fall over 40 epochs, best checkpoint marked. Pipeline: ingest, clean, features, train, serve, with rows streaming through. Deploy of a web app: lint, test, build and ship to Vercel, 4 of 4 passed.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
<defs>${defs}${L.defsSvg()}</defs>
<style>${css}
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${b}
</svg>
`;
}
