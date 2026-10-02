// The stack, as MonishOS prints it: `monishos fetch`, a neofetch-style readout.
// The M mark in ASCII on the left, the stack grouped by domain on the right,
// and the brand palette as colour blocks underneath.
import { F, lettering, r1, esc } from "./lettering.mjs";

// The site's M mark: frame in sky, letter in indigo (rows 2-9, inside the frame)
const LOGO = [
  "   .------------------.",
  "  /                    \\",
  " |  ##              ##  |",
  " |  ####          ####  |",
  " |  ## ##        ## ##  |",
  " |  ##  ##      ##  ##  |",
  " |  ##   ##    ##   ##  |",
  " |  ##    ##  ##    ##  |",
  " |  ##     ####     ##  |",
  " |  ##      ##      ##  |",
  "  \\                    /",
  "   '------------------'",
];

export function fetchCard(mode, { C, BRAND, os, stack, user = "monish", host = "monishos" }) {
  const L = lettering();
  const W = 1200, WX = 34, WY = 26, WW = W - WX * 2, TITLE = 40;
  const S = 15.5, LH = 23, cw = L.width("a", S, F.mono);
  const T_TYPE = 0.3, TYPE_LEN = 0.6, T0 = 1.1, STEP = 0.07;
  let b = "";

  // Readout: user@host, a rule, then one line per domain
  const keyW = Math.max(2, ...stack.map(([k]) => k.length)) + 2;
  const info = [["OS", [`${os} 1.0.0`]], ...stack];
  const lines = info.length + 2;
  const PROMPT = WY + TITLE + 36, BLOCK = PROMPT + LH * 1.7;
  const rows = Math.max(LOGO.length, lines + 2);
  const END = BLOCK + rows * LH + 8;                 // the next prompt
  const WH = END + 30 - WY, H = WY + WH + 26;

  // ---- Desktop: the website's starfield ----
  b += `<rect width="${W}" height="${H}" rx="14" fill="${BRAND.bg}"/>`;
  let seed = 41;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let stars = "";
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H, r = rnd() < 0.08 ? 1.5 : 0.5 + rnd() * 0.7;
    const c = rnd() < 0.15 ? BRAND.sky : rnd() < 0.25 ? BRAND.indigo : "#ffffff";
    const tw = rnd() < 0.18 ? ` class="tw" style="animation-delay:${(-rnd() * 4).toFixed(2)}s"` : "";
    stars += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${c}" fill-opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"${tw}/>`;
  }
  b += `<g clip-path="url(#desk)">${stars}</g>`;

  // ---- Terminal window ----
  b += `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="11" fill="${C.panel}" filter="url(#winShadow)"/>`;
  b += `<path d="M${WX} ${WY + TITLE} V${WY + 11} A11 11 0 0 1 ${WX + 11} ${WY} H${WX + WW - 11} A11 11 0 0 1 ${WX + WW} ${WY + 11} V${WY + TITLE} Z" fill="${C.chrome}"/><path d="M${WX} ${WY + TITLE + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  [["#ff5f57", "#e0443e"], ["#febc2e", "#dea123"], ["#28c840", "#1aab29"]].forEach(([f, s], i) => { b += `<circle cx="${WX + 22 + i * 21}" cy="${WY + 20}" r="6.5" fill="${f}" stroke="${s}" stroke-width="0.8"/>`; });
  b += L.text(`Terminal — ${user}@${host}`, W / 2, WY + 25, 13.5, { font: F.uiBold, anchor: "middle", fill: C.ui });

  // ---- Prompt and command ----
  const TX = WX + 28;
  const prompt = (y) => L.text("~/Monish25", TX, y, S, { font: F.monoBold, fill: C.prompt }) + L.text("$", TX + cw * 11, y, S, { font: F.mono, fill: C.term });
  const cmd = `${os.toLowerCase()} fetch`, cmdX = TX + cw * 13;
  b += prompt(PROMPT) + `<g class="typed">${L.text(cmd, cmdX, PROMPT, S, { font: F.mono, fill: C.term })}</g>`;

  // ---- Block: logo left, readout right, centred together ----
  const logoW = Math.max(...LOGO.map((l) => l.length)) * cw;
  const infoW = (keyW + Math.max(...info.map(([, v]) => v.join(" · ").length))) * cw;
  const gap = 4 * cw, BX = WX + Math.round((WW - (logoW + gap + infoW)) / 2), IX = BX + logoW + gap;
  const line = (i, svg) => `<g class="ln" style="animation-delay:${(T0 + i * STEP).toFixed(2)}s">${svg}</g>`;
  LOGO.forEach((row, i) => {
    const y = BLOCK + i * LH;
    let g = "";
    [...row].forEach((ch, k) => {
      if (ch === " ") return;
      const letter = i >= 2 && i <= 9 && k > 1 && k < row.length - 1;
      g += L.text(ch, BX + k * cw, y, S, { font: F.monoBold, fill: letter ? C.link : C.mark });
    });
    b += line(i, g);
  });
  // user@host and its rule
  const title = `${user}@${host}`;
  b += line(0, L.text(user, IX, BLOCK, S, { font: F.monoBold, fill: C.mark }) + L.text("@", IX + cw * user.length, BLOCK, S, { font: F.mono, fill: C.term }) + L.text(host, IX + cw * (user.length + 1), BLOCK, S, { font: F.monoBold, fill: C.mark }));
  b += line(1, L.text("-".repeat(title.length), IX, BLOCK + LH, S, { font: F.mono, fill: C.termDim }));
  info.forEach(([key, items], i) => {
    const y = BLOCK + (i + 2) * LH;
    let g = L.text(`${key}:`, IX, y, S, { font: F.monoBold, fill: C.mark });
    let x = IX + keyW * cw;
    items.forEach((item, k) => {
      if (k) { g += L.text("·", x + cw, y, S, { font: F.mono, fill: C.termDim }); x += cw * 3; }
      g += L.text(item, x, y, S, { font: F.mono, fill: C.term });
      x += item.length * cw;
    });
    b += line(i + 2, g);
  });
  // Palette blocks: the website's colours
  const sw = [BRAND.bg, BRAND.bg2, BRAND.dim, BRAND.mut, BRAND.ink, BRAND.sky, BRAND.indigo, C.ok];
  const py = BLOCK + (lines + 0.6) * LH - 15;
  let pal = "";
  sw.forEach((c, k) => { pal += `<rect x="${r1(IX + k * cw * 3.4)}" y="${r1(py)}" width="${r1(cw * 3)}" height="18" rx="2" fill="${c}" stroke="${C.border}"/>`; });
  b += line(lines + 1, pal);

  // ---- Next prompt, caret blinking ----
  const tEnd = T0 + (rows + 1) * STEP;
  b += `<g class="ln" style="animation-delay:${tEnd.toFixed(2)}s">${prompt(END)}<rect class="caret" x="${r1(cmdX)}" y="${END - 14}" width="9" height="18" fill="${C.term}" fill-opacity="0.85"/></g>`;

  const css = `
  .tw { animation: tw 3.2s ease-in-out infinite; }
  @keyframes tw { 50% { fill-opacity: .95; } }
  .typed { animation: type ${TYPE_LEN}s steps(${cmd.length}, end) ${T_TYPE}s both; }
  @keyframes type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  .ln { animation: show .01s linear both; }
  @keyframes show { from { opacity: 0; } to { opacity: 1; } }
  .caret { animation: blink 1.06s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }`;
  const defs = `<clipPath id="desk"><rect width="${W}" height="${H}" rx="14"/></clipPath>
<filter id="winShadow" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/></filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(fetchAlt({ os, stack }))}">
<defs>${defs}${L.defsSvg()}</defs>
<style>${css}
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${b}
</svg>
`;
}

// Alt text: the whole stack, so screen readers get what the picture shows
export const fetchAlt = ({ os, stack }) =>
  `${os} terminal running ${os.toLowerCase()} fetch. ` + stack.map(([k, v]) => `${k}: ${v.join(", ")}.`).join(" ");
