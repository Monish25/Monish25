// Builds the profile README.
//
// Edit about.md (plain markdown) and the SETTINGS below, then run:
//   npm install        (once)
//   node build-md.mjs
// It redraws assets/readme-dark.svg and assets/readme-light.svg and writes
// README.md: your name and links centred, the image, then about.md rendered.
//
// The image is a MonishOS desktop (the same OS the website boots): a menu bar
// with the scan HUD, a starfield wallpaper, and an editor window where the
// terminal boots, scans and compiles about.md. An achievement pops, then goes.
// A cat in its own little window types the build command.
//
// A line in about.md like ![alt](assets/monitor.svg) becomes a light/dark
// <picture> of assets/monitor-dark.svg and assets/monitor-light.svg, which
// this script also draws (see monitor.mjs).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { F, lettering, r1, esc } from "./lettering.mjs";
import { monitor } from "./monitor.mjs";
import { fetchCard, fetchAlt } from "./fetch.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "assets");
mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------------------
// SETTINGS: the header above the image
// ---------------------------------------------------------------------------
const SETTINGS = {
  name: "Monish Raaj Selvanathan",
  // Contact chips under the name: [label, url, icon]. Icons: linkedin, mail.
  links: [
    ["LinkedIn", "https://linkedin.com/in/monish-raaj-selvanathan", "linkedin"],
    ["Email", "mailto:smonishraaj@gmail.com", "mail"],
  ],
  file: "about.md",              // the markdown shown in the editor and rendered below
  os: "MonishOS",                // same name the website boots
  // The cat on the desktop: a GIF in assets/ shown in its own small window
  // (null to drop it). It sits on a light card so a black cat stays visible.
  pet: { file: "kitt.gif", title: "kitt.gif" },
  // The stack card, `monishos fetch` (fetch.mjs): [domain, tools]. It shows
  // where about.md has ![...](assets/stack.svg); its alt text lists all of it.
  stack: [
    ["Languages", ["Python", "TypeScript", "SQL", "Rust", "C++"]],
    ["AI", ["LLM agents", "Transformers", "NLP", "quantization"]],
    ["ML", ["TensorFlow", "scikit-learn", "Jupyter"]],
    ["Data", ["pandas", "NumPy", "Plotly", "Postgres", "MongoDB"]],
    ["Web", ["React", "Next.js", "Tailwind", "Node.js", "Vite"]],
    ["Systems", ["Win32", "WebHID", "CMake"]],
    ["Testing", ["Vitest", "Playwright"]],
  ],
};

// Brand: the website's palette (monish-site/app/globals.css)
const BRAND = { bg: "#080a14", bg2: "#0b0e1a", ink: "#f8fafc", mut: "#94a3b8", dim: "#64748b", sky: "#38bdf8", indigo: "#818cf8" };

// Editor themes; the desktop stays in brand colours either way
const THEMES = {
  dark: {
    name: "Night Shift", chrome: "#10131f", bg: "#0e1120", border: "#232a3d", gutter: "#3b4259",
    text: "#d6dcea", strong: "#eef2fa", punc: "#6f7894", mark: "#38bdf8", link: "#a5b4fc", url: "#f2c38b", quote: "#97a0b8",
    ui: "#8a93ad", uiDim: "#566079", tabText: "#e6ebf5", accent: "#38bdf8", added: "#3fb950",
    warn: "#e3b341", ok: "#3fb950", status: "#0b0f1c", panel: "#0b0e1a", prompt: "#3fb950", term: "#c8cfdf", termDim: "#6b7491",
  },
  light: {
    name: "Paper", chrome: "#e9edf2", bg: "#fbfcfd", border: "#d3d9e2", gutter: "#b3bac7",
    text: "#2b3240", strong: "#11151d", punc: "#8a92a3", mark: "#0369a1", link: "#4f46e5", url: "#a8570b", quote: "#6b7385",
    ui: "#5c6474", uiDim: "#8e95a3", tabText: "#1f2430", accent: "#0284c7", added: "#1f883d",
    warn: "#9a6700", ok: "#1a7f37", status: "#e3e8ee", panel: "#f3f5f8", prompt: "#1a7f37", term: "#2b3240", termDim: "#7a8292",
  },
};

// ---------------------------------------------------------------------------
// about.md -> highlighted runs, one list of [text, role] per line
// ---------------------------------------------------------------------------
const ABOUT = readFileSync(join(here, SETTINGS.file), "utf8").replace(/\r/g, "").replace(/\n+$/, "");
function inline(text, base) {
  const runs = [], re = /(\*\*[^*]+\*\*)|(!?\[[^\]]+\]\([^)]*\))|(`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push([text.slice(last, m.index), base]);
    if (m[1]) runs.push(["**", "punc"], [m[1].slice(2, -2), "b"], ["**", "punc"]);
    else if (m[2]) {
      const [, bang, label, url] = m[2].match(/^(!?)\[([^\]]+)\]\(([^)]*)\)$/);
      if (bang) runs.push(["!", "punc"]);
      runs.push(["[", "punc"], [label, "lt"], ["](", "punc"], [url, "url"], [")", "punc"]);
    } else runs.push(["`", "punc"], [m[3].slice(1, -1), "url"], ["`", "punc"]);
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push([text.slice(last), base]);
  return runs;
}
function tokenize(line) {
  if (!line.trim()) return [];
  let m;
  if ((m = line.match(/^(#{1,6} )(.*)$/))) return [[m[1], "mark"], [m[2], "h"]];
  if ((m = line.match(/^(\s*[-*] )(.*)$/))) return [[m[1], "mark"], ...inline(m[2], "t")];
  if ((m = line.match(/^(> ?)(.*)$/))) return [[m[1], "punc"], ...inline(m[2], "q")];
  return inline(line, "t");
}
const SOURCE = ABOUT.split("\n").map(tokenize);
const SECTIONS = ABOUT.split(/\n\s*\n/).filter((b) => b.trim()).length;   // what the HUD scans

// Lint: the first empty link becomes the build's one warning (MD042)
const isEmptyUrl = (runs, i) => runs[i][1] === "url" && (runs[i][0] === "#" || runs[i][0] === "") && runs[i - 1]?.[0] === "](";
const warnIdx = SOURCE.findIndex((runs) => runs.some((_, i) => isEmptyUrl(runs, i)));
const WARN_LINE = warnIdx + 1;   // 0 when there is none
const WARN_TEXT = warnIdx < 0 ? "" : (() => { const runs = SOURCE[warnIdx], i = runs.findIndex((_, k) => isEmptyUrl(runs, k)); return `[${runs[i - 2][0]}](${runs[i][0]})`; })();

// Boot timeline, seconds. One log line every 0.32 s, like the website's boot.
const HOLD = 0.32;
const TL = { type: 0.3, typeDur: 0.8, firstLog: 1.25 };
const LOG = [
  { text: `${SETTINGS.os} 1.0.0 (tty1)`, kind: "head" },
  { text: "[ 0.04 ] Initializing kernel", status: "OK" },
  { text: `[ 0.21 ] Mounting /${SETTINGS.file}`, status: "OK" },
  { text: `[ 0.55 ] Scanning ${SECTIONS} sections`, status: "OK", scan: true },
  WARN_LINE ? { text: "[ 0.88 ] Linting links", status: "WARN", note: `MD042 ${WARN_TEXT} on line ${WARN_LINE}: site under construction` } : { text: "[ 0.88 ] Linting links", status: "OK" },
  { text: "[ 1.12 ] Writing README.md", status: "OK" },
  { text: "boot complete — README.md is live below", kind: "done" },
];
LOG.forEach((l, i) => { l.t = TL.firstLog + i * HOLD; });
const SCAN = LOG.find((l) => l.scan);
const T_DONE = LOG[LOG.length - 1].t;
const T_TOAST = T_DONE + 0.25, TOAST_LEN = 3.0;

// The pet GIF, plus its first frame alone: a still for people who ask for
// reduced motion. A GIF's frames follow each other, so the still is the file
// cut after the first image, without the looping extension.
function firstFrame(gif) {
  const gct = gif[10] & 0x80 ? 3 * (1 << ((gif[10] & 7) + 1)) : 0;
  const parts = [gif.subarray(0, 13 + gct)];
  const blocks = (p) => { while (gif[p]) p += gif[p] + 1; return p + 1; };   // skip data sub-blocks
  let p = 13 + gct;
  while (p < gif.length) {
    if (gif[p] === 0x21) {
      const end = blocks(p + 2);
      if (gif[p + 1] !== 0xff) parts.push(gif.subarray(p, end));   // keep all but app (loop) extensions
      p = end;
    } else if (gif[p] === 0x2c) {
      const lct = gif[p + 9] & 0x80 ? 3 * (1 << ((gif[p + 9] & 7) + 1)) : 0;
      const end = blocks(p + 10 + lct + 1);
      parts.push(gif.subarray(p, end), Buffer.from([0x3b]));
      return Buffer.concat(parts);
    } else break;
  }
  throw new Error("no image in GIF");
}
const PET = SETTINGS.pet && (() => {
  const gif = readFileSync(join(out, SETTINGS.pet.file));
  const uri = (b) => "data:image/gif;base64," + b.toString("base64");
  return { ...SETTINGS.pet, w: gif.readUInt16LE(6), h: gif.readUInt16LE(8), anim: uri(gif), still: uri(firstFrame(gif)) };
})();

function scene(mode) {
  const C = THEMES[mode];
  const L = lettering();
  const W = 1200;
  const MENU = 30, WX = 34, WY = 56, WW = W - WX * 2;      // window frame
  const TITLE = 40, TABS = 34;
  const SIZE = 16.5, LH = 25, CODE_X = WX + 80, TOP = WY + TITLE + TABS + 54;
  const charW = L.width("a", SIZE, F.mono);
  const base = SOURCE.map((_, i) => TOP + i * LH);
  const PANEL = TOP + (SOURCE.length - 1) * LH + 26;
  const TS = 13.5, TLH = 21, PANEL_H = 44 + (LOG.length + 2) * TLH;
  const STATUS = PANEL + PANEL_H;
  const WH = STATUS + 28 - WY;
  const H = WY + WH + 30;
  let b = "";

  // ---- Desktop: the website's starfield ----
  b += `<rect width="${W}" height="${H}" rx="14" fill="${BRAND.bg}"/>`;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let stars = "";
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W, y = MENU + rnd() * (H - MENU), r = rnd() < 0.08 ? 1.5 : 0.5 + rnd() * 0.7;
    const c = rnd() < 0.15 ? BRAND.sky : rnd() < 0.25 ? BRAND.indigo : "#ffffff";
    const tw = rnd() < 0.18 ? ` class="tw" style="animation-delay:${(-rnd() * 4).toFixed(2)}s"` : "";
    stars += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${c}" fill-opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"${tw}/>`;
  }
  b += `<g clip-path="url(#desk)">${stars}</g>`;

  // ---- Menu bar ----
  b += `<path d="M0 14 A14 14 0 0 1 14 0 H${W - 14} A14 14 0 0 1 ${W} 14 V${MENU} H0 Z" fill="${BRAND.bg2}" fill-opacity="0.92"/><path d="M0 ${MENU - 0.5} H${W}" stroke="#ffffff" stroke-opacity="0.07"/>`;
  b += `<rect x="18" y="7" width="16" height="16" rx="4" fill="none" stroke="${BRAND.sky}" stroke-width="1.5"/>` + L.text("M", 26, 19.5, 11, { font: F.monoBold, anchor: "middle", fill: BRAND.sky });
  b += L.text(SETTINGS.os, 46, 20, 13.5, { font: F.uiBold, fill: BRAND.ink });
  let mx = 46 + L.width(SETTINGS.os, 13.5, F.uiBold) + 22;
  for (const item of ["File", "Edit", "View", "Go", "Run", "Terminal", "Help"]) { b += L.text(item, mx, 20, 13.5, { fill: BRAND.mut }); mx += L.width(item, 13.5) + 20; }
  // Scan HUD, as on the website: count up while the build scans
  const hx = W - 214, hw = 132;
  b += `<rect x="${hx}" y="5" width="${hw}" height="20" rx="4" fill="${BRAND.bg2}" stroke="${BRAND.sky}" stroke-opacity="0.4"/>`;
  for (let k = 0; k <= SECTIONS; k++) b += `<g class="hud${k}">${L.text(`${k}/${SECTIONS} scanned`, hx + 9, 18.5, 10.5, { font: F.mono, fill: BRAND.sky })}</g>`;
  b += `<rect x="${hx + 86}" y="13" width="36" height="4" rx="2" fill="#ffffff" fill-opacity="0.1"/><rect class="hudbar" x="${hx + 86}" y="13" width="36" height="4" rx="2" fill="${BRAND.sky}"/>`;
  // Wi-fi and battery, drawn
  const ix = W - 66;
  b += `<g fill="none" stroke="${BRAND.mut}" stroke-width="1.4" stroke-linecap="round"><path d="M${ix - 8} 13 q8 -7 16 0 M${ix - 5} 16 q5 -4.5 10 0"/><circle cx="${ix}" cy="19.5" r="1" fill="${BRAND.mut}"/></g>`;
  b += `<rect x="${ix + 18}" y="10" width="22" height="11" rx="2.5" fill="none" stroke="${BRAND.mut}" stroke-width="1.2"/><rect x="${ix + 20}" y="12" width="15" height="7" rx="1" fill="${BRAND.mut}"/><path d="M${ix + 41.5} 13.5 v4" stroke="${BRAND.mut}" stroke-width="1.6" stroke-linecap="round"/>`;

  // ---- Window ----
  b += `<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="11" fill="${C.bg}" filter="url(#winShadow)"/>`;
  b += `<path d="M${WX} ${WY + TITLE + TABS} V${WY + 11} A11 11 0 0 1 ${WX + 11} ${WY} H${WX + WW - 11} A11 11 0 0 1 ${WX + WW} ${WY + 11} V${WY + TITLE + TABS} Z" fill="${C.chrome}"/>`;
  // Traffic lights
  [["#ff5f57", "#e0443e"], ["#febc2e", "#dea123"], ["#28c840", "#1aab29"]].forEach(([f, s], i) => { b += `<circle cx="${WX + 22 + i * 21}" cy="${WY + 20}" r="6.5" fill="${f}" stroke="${s}" stroke-width="0.8"/>`; });
  b += L.text(`${SETTINGS.file} — Monish25`, W / 2, WY + 25, 13.5, { font: F.uiBold, anchor: "middle", fill: C.ui });
  // Tab row
  const tabY = WY + TITLE;
  b += `<path d="M${WX} ${tabY + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  b += `<rect x="${WX + 12}" y="${tabY}" width="158" height="${TABS}" fill="${C.bg}"/><path d="M${WX + 12} ${tabY + 1} H${WX + 170}" stroke="${C.accent}" stroke-width="2"/>`;
  b += `<rect x="${WX + 26}" y="${tabY + 10}" width="21" height="14" rx="3" fill="none" stroke="${C.ui}" stroke-width="1.2"/><path d="M${WX + 30} ${tabY + 20.5} V${tabY + 14.5} L${WX + 33} ${tabY + 17.5} L${WX + 36} ${tabY + 14.5} V${tabY + 20.5} M${WX + 41} ${tabY + 14} V${tabY + 20.5} M${WX + 38.8} ${tabY + 18.3} L${WX + 41} ${tabY + 20.5} L${WX + 43.2} ${tabY + 18.3}" fill="none" stroke="${C.ui}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  b += L.text(SETTINGS.file, WX + 55, tabY + 22, 13.5, { fill: C.tabText });
  b += `<path d="M${WX} ${tabY + TABS + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  b += L.text(`Monish25  ›  ${SETTINGS.file}`, CODE_X, tabY + TABS + 24, 12, { fill: C.uiDim });

  // ---- Source ----
  const style = {
    mark: [C.mark, F.monoBold], h: [C.strong, F.monoBold], t: [C.text, F.mono], b: [C.strong, F.monoBold], punc: [C.punc, F.mono],
    q: [C.quote, F.monoItalic], lt: [C.link, F.mono], url: [C.url, F.mono],
  };
  let src = "", wx1 = 0, wx2 = 0;
  SOURCE.forEach((line, i) => {
    const n = i + 1, yy = base[i];
    src += L.text(String(n), CODE_X - 32, yy, 12.5, { font: F.mono, anchor: "end", fill: C.gutter });
    if (n === WARN_LINE) src += `<rect x="${CODE_X - 22}" y="${yy - 18}" width="3" height="${LH}" fill="${C.added}"/>`;
    let col = 0;
    line.forEach(([t, role], k) => {
      const x = CODE_X + col * charW, [fill, font] = style[role];
      if (t.trim()) src += L.text(t, x, yy, SIZE, { font, fill });
      if (n === WARN_LINE && isEmptyUrl(line, k)) { wx1 = x - charW * 0.2; wx2 = x + Math.max(1, t.length) * charW + charW * 0.2; }
      col += t.length;
    });
  });
  if (WARN_LINE) {
    const wy = base[WARN_LINE - 1];
    let sq = `M${r1(wx1)} ${wy + 6}`;
    for (let x = wx1, k = 0; x < wx2; x += 3, k++) sq += ` L${r1(x + 3)} ${wy + 6 + (k % 2 ? 0 : 2.6)}`;
    src += `<path d="${sq}" fill="none" stroke="${C.warn}" stroke-width="1.4"/>`;
  }
  b += `<clipPath id="code"><rect x="${WX}" y="${tabY + TABS}" width="${WW - 16}" height="${PANEL - tabY - TABS}"/></clipPath><g clip-path="url(#code)">${src}</g>`;

  // ---- Terminal: the boot log ----
  b += `<rect x="${WX}" y="${PANEL}" width="${WW}" height="${PANEL_H}" fill="${C.panel}"/><path d="M${WX} ${PANEL + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  ["PROBLEMS", "OUTPUT", "TERMINAL"].forEach((t, i) => {
    const x = WX + 22 + i * 104;
    b += L.text(t, x, PANEL + 23, 11, { font: F.uiBold, ls: 1, fill: t === "TERMINAL" ? C.tabText : C.uiDim });
    if (t === "TERMINAL") b += `<path d="M${x} ${PANEL + 31} H${x + L.width(t, 11, F.uiBold, 1)}" stroke="${C.accent}" stroke-width="1.6"/>`;
  });
  const TX = WX + 22, tw = L.width("a", TS, F.mono), ty = (i) => PANEL + 56 + i * TLH;
  const prompt = (y) => L.text("~/Monish25", TX, y, TS, { font: F.monoBold, fill: C.prompt }) + L.text("$", TX + tw * 11, y, TS, { font: F.mono, fill: C.term });
  const cmd = `monishos build ${SETTINGS.file}`, cmdX = TX + tw * 13;
  b += prompt(ty(0)) + `<g class="typed">${L.text(cmd, cmdX, ty(0), TS, { font: F.mono, fill: C.term })}</g>`;
  const STATUS_COL = 40;
  LOG.forEach((l, i) => {
    const y = ty(i + 1);
    let g = "";
    if (l.kind === "head") g = L.text(l.text, TX, y, TS, { font: F.monoBold, fill: C.term });
    else if (l.kind === "done") g = L.text(l.text, TX, y, TS, { font: F.mono, fill: C.ok });
    else {
      const dots = " " + ".".repeat(Math.max(2, STATUS_COL - l.text.length - 1));
      g = L.text(l.text, TX, y, TS, { font: F.mono, fill: C.term }) + L.text(dots, TX + tw * l.text.length, y, TS, { font: F.mono, fill: C.termDim });
      const sx = TX + tw * (STATUS_COL + 1);
      g += L.text(l.status, sx, y, TS, { font: F.monoBold, fill: l.status === "OK" ? C.ok : C.warn });
      if (l.note) g += L.text(l.note, sx + tw * (l.status.length + 2), y, TS, { font: F.mono, fill: C.warn });
    }
    b += `<g class="log" style="animation-delay:${l.t.toFixed(2)}s">${g}</g>`;
  });
  b += `<g class="log" style="animation-delay:${(T_DONE + 0.12).toFixed(2)}s">${prompt(ty(LOG.length + 1))}<rect class="caret" x="${r1(cmdX)}" y="${ty(LOG.length + 1) - 13}" width="8" height="16" fill="${C.term}" fill-opacity="0.85"/></g>`;

  // ---- Status bar ----
  b += `<path d="M${WX} ${STATUS} H${WX + WW} V${STATUS + 28 - 11} A11 11 0 0 1 ${WX + WW - 11} ${STATUS + 28} H${WX + 11} A11 11 0 0 1 ${WX} ${STATUS + 28 - 11} Z" fill="${C.status}"/><path d="M${WX} ${STATUS + 0.5} H${WX + WW}" stroke="${C.border}"/>`;
  b += `<rect x="${WX + 14}" y="${STATUS + 7}" width="14" height="14" rx="3.5" fill="none" stroke="${C.accent}" stroke-width="1.3"/>` + L.text("M", WX + 21, STATUS + 17.5, 9.5, { font: F.monoBold, anchor: "middle", fill: C.accent });
  b += L.text(`${SETTINGS.os}  ·  mtech`, WX + 36, STATUS + 18.5, 12, { fill: C.ui });
  if (WARN_LINE) b += `<g class="log" style="animation-delay:${LOG.find((l) => l.status === "WARN").t.toFixed(2)}s"><path d="M${WX + 168} ${STATUS + 8} l6.5 11.5 h-13 z" fill="none" stroke="${C.warn}" stroke-width="1.3" stroke-linejoin="round"/>${L.text("1 warning", WX + 180, STATUS + 18.5, 12, { fill: C.ui })}</g>`;
  b += L.text(`UTF-8     Markdown     Theme: ${C.name}`, WX + WW - 16, STATUS + 18.5, 12, { anchor: "end", fill: C.ui });

  // ---- The pet: its own small window over the terminal, typing the build ----
  if (PET) {
    const cw = 196, ch = Math.round((cw * PET.h) / PET.w), pw = cw + 16, ph = 26 + ch + 10;
    const px = WX + WW - pw - 24, py = PANEL + 46;
    let pet = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="9" fill="#fbfaff" stroke="#000" stroke-opacity="0.18" filter="url(#petShadow)"/>`;
    pet += `<path d="M${px} ${py + 26} V${py + 9} A9 9 0 0 1 ${px + 9} ${py} H${px + pw - 9} A9 9 0 0 1 ${px + pw} ${py + 9} V${py + 26} Z" fill="#ecebf3"/><path d="M${px} ${py + 26.5} H${px + pw}" stroke="#d9d7e4"/>`;
    ["#ff5f57", "#febc2e", "#28c840"].forEach((f, i) => { pet += `<circle cx="${px + 14 + i * 15}" cy="${py + 13}" r="4.5" fill="${f}"/>`; });
    pet += L.text(PET.title, px + pw / 2, py + 17.5, 11.5, { font: F.uiBold, anchor: "middle", fill: "#5c6474" });
    const ix = px + 8, iy = py + 30;
    pet += `<image class="pet-anim" href="${PET.anim}" x="${ix}" y="${iy}" width="${cw}" height="${ch}"/><image class="pet-still" href="${PET.still}" x="${ix}" y="${iy}" width="${cw}" height="${ch}"/>`;
    b += `<g>${pet}</g>`;
  }

  // ---- Achievement toast, in the website's HUD style ----
  const aw = 384, ah = 86, ax = WX + WW - aw - 22, ay = PANEL - ah - 18;
  let toast = `<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="8" fill="${BRAND.bg2}" fill-opacity="0.96" stroke="${BRAND.sky}" stroke-opacity="0.45" filter="url(#hudGlow)"/>`;
  toast += `<circle cx="${ax + 38}" cy="${ay + ah / 2}" r="17" fill="none" stroke="${BRAND.sky}" stroke-opacity="0.25" stroke-width="3"/><circle cx="${ax + 38}" cy="${ay + ah / 2}" r="17" fill="none" stroke="${BRAND.sky}" stroke-width="3" stroke-dasharray="80 107" stroke-linecap="round" transform="rotate(-90 ${ax + 38} ${ay + ah / 2})"/>`;
  toast += `<path d="M${ax + 31} ${ay + ah / 2} l5 5 l9 -10" fill="none" stroke="${BRAND.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  toast += L.text("ACHIEVEMENT UNLOCKED", ax + 70, ay + 27, 10.5, { font: F.mono, ls: 1.6, fill: BRAND.sky });
  toast += L.text("README compiled", ax + 70, ay + 50, 17, { font: F.uiBold, fill: BRAND.ink });
  toast += L.text(`${SECTIONS}/${SECTIONS} sections scanned. Continue below.`, ax + 70, ay + 71, 12.5, { fill: BRAND.mut });
  b += `<g class="toast">${toast}</g>`;

  // ---- Timing ----
  const s = (n) => `${n.toFixed(2)}s`;
  const total = T_TOAST + TOAST_LEN + 0.5;
  const pct = (t) => ((t / total) * 100).toFixed(2);
  let hud = "";
  const scanStep = HOLD / SECTIONS;
  for (let k = 0; k <= SECTIONS; k++) {
    const from = k === 0 ? 0 : SCAN.t + (k - 1) * scanStep, to = k === SECTIONS ? total : SCAN.t + k * scanStep;
    hud += `\n  .hud${k} { opacity: ${k === SECTIONS ? 1 : 0}; animation: hud${k} ${s(total)} linear both; }
  @keyframes hud${k} { 0%, ${pct(Math.max(0, from - 0.001))}% { opacity: ${k === 0 ? 1 : 0}; } ${pct(from)}%, ${pct(Math.min(total, to - 0.001))}% { opacity: 1; } ${pct(to)}%, 100% { opacity: ${k === SECTIONS ? 1 : 0}; } }`;
  }
  const css = `
  .pet-still { display: none; }
  .tw { animation: tw 3.2s ease-in-out infinite; }
  @keyframes tw { 50% { fill-opacity: .95; } }
  .typed { animation: type ${s(TL.typeDur)} steps(${cmd.length}, end) ${s(TL.type)} both; }
  @keyframes type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  .log { animation: show .01s linear both; }
  @keyframes show { from { opacity: 0; } to { opacity: 1; } }
  .caret { animation: blink 1.06s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .hudbar { transform-box: fill-box; transform-origin: left center; animation: fill ${s(HOLD)} linear ${s(SCAN.t)} both; }
  @keyframes fill { from { transform: scaleX(0); } to { transform: none; } }${hud}
  .toast { opacity: 0; animation: toast ${s(TOAST_LEN)} cubic-bezier(.2,.7,.2,1) ${s(T_TOAST)} both; }
  @keyframes toast { 0% { opacity: 0; transform: translateY(14px) scale(.98); } 10% { opacity: 1; transform: none; } 84% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-6px); } }`;
  const defs = `<clipPath id="desk"><rect width="${W}" height="${H}" rx="14"/></clipPath>
<filter id="winShadow" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/></filter>
<filter id="hudGlow" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="${BRAND.sky}" flood-opacity="0.22"/></filter>
<filter id="petShadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity="0.45"/></filter>`;
  const label = `A ${SETTINGS.os} desktop with a starfield. In an editor window, ${SETTINGS.file} is open while the terminal boots ${SETTINGS.os}, scans ${SECTIONS} sections${WARN_LINE ? ", warns that the website link is empty because the site is under construction" : ""}, and writes README.md.${PET ? " In a small window, a black cat in a lavender shirt types away on a laptop." : ""} An achievement pops up: README compiled. The text follows below this image.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
<defs>${defs}${L.defsSvg()}</defs>
<style>${css}
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } .toast { opacity: 0; } .pet-anim { display: none; } .pet-still { display: inline; } }
</style>
${b}
</svg>
`;
}

for (const mode of ["dark", "light"]) {
  const s = scene(mode);
  writeFileSync(join(out, `readme-${mode}.svg`), s);
  console.log(`readme-${mode}.svg ${(s.length / 1024).toFixed(1)}KB`);
  const m = monitor(mode, { C: THEMES[mode], BRAND, os: SETTINGS.os });
  writeFileSync(join(out, `monitor-${mode}.svg`), m);
  console.log(`monitor-${mode}.svg ${(m.length / 1024).toFixed(1)}KB`);
  const f = fetchCard(mode, { C: THEMES[mode], BRAND, os: SETTINGS.os, stack: SETTINGS.stack });
  writeFileSync(join(out, `stack-${mode}.svg`), f);
  console.log(`stack-${mode}.svg ${(f.length / 1024).toFixed(1)}KB`);
}

// ---------------------------------------------------------------------------
// Contact chips: the website's HUD chip, icon and label drawn together so
// they line up exactly on every platform. Solid sky icons, knocked out in
// the chip colour so both read as one set.
// ---------------------------------------------------------------------------
const CHIP_ICONS = {
  linkedin: (x, y, s, ink, hole) => {
    const k = s / 24;
    return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="${ink}"/><circle cx="7.3" cy="7.3" r="1.8" fill="${hole}"/><rect x="5.8" y="10.1" width="3" height="8.4" rx="0.5" fill="${hole}"/><path d="M10.9 10.1h2.9v1.25c.62-1 1.72-1.55 3.05-1.55 2.25 0 3.45 1.45 3.45 4.15v4.55h-3V14.4c0-1.3-.52-2.05-1.62-2.05-1.12 0-1.83.82-1.83 2.05v4.1h-2.95z" fill="${hole}"/></g>`;
  },
  mail: (x, y, s, ink, hole) => {
    const k = s / 24;
    return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="1.5" y="4" width="21" height="16" rx="3" fill="${ink}"/><path d="M4.2 7.2l7.8 5.8 7.8-5.8" fill="none" stroke="${hole}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  },
};
function chip(label, icon) {
  if (!CHIP_ICONS[icon]) throw new Error(`no icon called "${icon}" (have: ${Object.keys(CHIP_ICONS).join(", ")})`);
  const L = lettering();
  const H = 34, PAD = 13, IS = 15, GAP = 9, SIZE = 12.5, LS = 1.4;
  const text = label.toUpperCase();
  const tw = L.width(text, SIZE, F.monoBold, LS);
  const W = Math.ceil(PAD + IS + GAP + tw + PAD + 1);
  const body = `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="7" fill="${BRAND.bg2}" stroke="${BRAND.sky}" stroke-opacity="0.5" stroke-width="1.5"/>` +
    CHIP_ICONS[icon](PAD, (H - IS) / 2, IS, BRAND.sky, BRAND.bg2) +
    L.text(text, PAD + IS + GAP, H / 2 + 4.4, SIZE, { font: F.monoBold, ls: LS, fill: BRAND.ink });
  return { W, H, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}"><defs>${L.defsSvg()}</defs>${body}</svg>\n` };
}

// README.md: name and contact chips centred, the image, then about.md rendered
const links = SETTINGS.links.map(([label, url, icon]) => {
  const c = chip(label, icon);
  const file = `chip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`;
  writeFileSync(join(out, file), c.svg);
  const alt = url.startsWith("mailto:") ? `${label}: ${url.slice(7)}` : label;
  return `<a href="${url}"><img src="assets/${file}" height="${c.H}" alt="${alt}"></a>`;
}).join("&nbsp;&nbsp;");
const readmeMd = `<h1 align="center">${SETTINGS.name}</h1>
<p align="center">${links}</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme-dark.svg">
  <img src="assets/readme-light.svg" width="100%" alt="${SETTINGS.os} desktop: ${SETTINGS.file} open in an editor while the terminal boots and compiles it into this README${PET ? ", and a cat types away in a small window" : ""}. The text follows below.">
</picture>

${ABOUT.replace(/^!\[([^\]]*)\]\(assets\/([\w-]+)\.svg\)$/gm, (line, alt, name) =>
  existsSync(join(out, `${name}-dark.svg`)) && existsSync(join(out, `${name}-light.svg`))
    ? `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/${name}-dark.svg">
  <img src="assets/${name}-light.svg" width="100%" alt="${esc(name === "stack" ? fetchAlt({ os: SETTINGS.os, stack: SETTINGS.stack }) : alt)}">
</picture>`
    : line)}
`;
writeFileSync(join(here, "README.md"), readmeMd);
console.log(`README.md written (${SOURCE.length} lines, ${SECTIONS} sections${WARN_LINE ? `, warning on line ${WARN_LINE}` : ""})`);
