// Outlined lettering for SVGs: each glyph is defined once and reused,
// so the art looks the same on every machine without loading fonts.
import opentype from "opentype.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (pkg, file) => {
  const b = readFileSync(join(here, "node_modules/@fontsource", pkg, "files", file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

export const F = {
  ui: load("hanken-grotesk", "hanken-grotesk-latin-400-normal.woff"),
  uiItalic: load("hanken-grotesk", "hanken-grotesk-latin-400-italic.woff"),
  uiBold: load("hanken-grotesk", "hanken-grotesk-latin-600-normal.woff"),
  mono: load("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
  monoItalic: load("jetbrains-mono", "jetbrains-mono-latin-400-italic.woff"),
  monoBold: load("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff"),
};


export const r1 = (n) => Math.round(n * 10) / 10;
export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function lettering() {
  const defs = new Map();
  const keyOf = new Map(Object.entries(F).map(([k, f]) => [f, k]));
  const glyphId = (font, g) => {
    const id = keyOf.get(font) + g.index;
    if (!defs.has(id)) defs.set(id, g.getPath(0, 0, font.unitsPerEm).toPathData(0));
    return id;
  };
  const visible = (font, g) => g.getPath(0, 0, font.unitsPerEm).commands.length > 0;

  function measure(font, str, size, ls = 0) {
    const glyphs = font.stringToGlyphs(str), k = size / font.unitsPerEm, pos = [], adv = [];
    let x = 0;
    glyphs.forEach((g, i) => {
      pos.push(x);
      adv.push(g.advanceWidth * k);
      x += g.advanceWidth * k;
      if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * k + ls;
    });
    return { glyphs, pos, adv, width: x };
  }

  function text(str, x, y, size, { font = F.ui, ls = 0, anchor = "start", fill = "currentColor", cls = "", style = "" } = {}) {
    const m = measure(font, str, size, ls);
    const x0 = anchor === "middle" ? x - m.width / 2 : anchor === "end" ? x - m.width : x;
    const k = (size / font.unitsPerEm).toFixed(5);
    let uses = "";
    m.glyphs.forEach((g, i) => {
      if (!visible(font, g)) return;
      uses += `<use href="#${glyphId(font, g)}" transform="translate(${r1(x0 + m.pos[i])} ${r1(y)}) scale(${k})"/>`;
    });
    return `<g${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""} fill="${fill}">${uses}</g>`;
  }

  // Text set around a circle, reading clockwise, centred on `centerDeg`
  function arc(str, cx, cy, r, size, { font = F.ui, ls = 0, fill = "currentColor", centerDeg = -90 } = {}) {
    const m = measure(font, str, size, ls);
    const k = (size / font.unitsPerEm).toFixed(5);
    const start = (centerDeg * Math.PI) / 180 - m.width / 2 / r;
    let uses = "";
    m.glyphs.forEach((g, i) => {
      if (!visible(font, g)) return;
      const t = start + (m.pos[i] + m.adv[i] / 2) / r;
      const deg = (t * 180) / Math.PI + 90;
      uses += `<use href="#${glyphId(font, g)}" transform="translate(${r1(cx + r * Math.cos(t))} ${r1(cy + r * Math.sin(t))}) rotate(${r1(deg)}) translate(${r1(-m.adv[i] / 2)} 0) scale(${k})"/>`;
    });
    return `<g fill="${fill}">${uses}</g>`;
  }

  // Greedy line wrap by measured width
  function wrap(str, size, maxW, font = F.ui, ls = 0) {
    const words = str.split(" "), lines = [];
    let line = "";
    for (const w of words) {
      const next = line ? line + " " + w : w;
      if (measure(font, next, size, ls).width > maxW && line) { lines.push(line); line = w; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  const width = (str, size, font = F.ui, ls = 0) => measure(font, str, size, ls).width;
  const defsSvg = () => [...defs].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join("");
  return { text, arc, wrap, width, defsSvg };
}
