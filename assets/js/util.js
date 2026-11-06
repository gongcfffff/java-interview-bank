"use strict";
const App = window.App = { views: {} };

App.h = function h(tag, attrs, ...children) {
  const el = document.createElementNS(tag === "svg" || attrs?.svg ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1999/xhtml", tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false || k === "svg") continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
    else el.setAttribute(k === "className" ? "class" : k, v === true ? "" : v);
  }
  App.append(el, children);
  return el;
};
App.append = function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
};

const ICONS = {
  mysql: '<ellipse cx="10" cy="5" rx="6.5" ry="2.5"/><path d="M3.5 5v10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V5M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5"/>',
  redis: '<path d="m10 3 7 3.5-7 3.5-7-3.5ZM3 10l7 3.5 7-3.5M3 13.5l7 3.5 7-3.5"/><path d="M10 6.5h.01"/>',
  mq: '<rect x="3" y="4" width="10" height="3" rx="1"/><rect x="3" y="9" width="10" height="3" rx="1"/><rect x="3" y="14" width="10" height="3" rx="1"/><path d="m15 8 2 2.5-2 2.5"/>',
  home: '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1Z"/>',
  star: '<path d="m10 2.8 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7Z"/>',
  flash: '<rect x="3" y="5" width="11" height="12" rx="2"/><path d="M6.5 3H15a2 2 0 0 1 2 2v9.5"/>',
  alert: '<circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.5M10 13.5v.2"/>',
  list: '<path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01"/>',
  map: '<circle cx="5" cy="5" r="2"/><circle cx="15" cy="7" r="2"/><circle cx="7" cy="15" r="2"/><path d="m6.8 5.6 6.4 1M14 8.8l-5.6 4.8M5.3 7l1.3 6"/>',
  route: '<circle cx="5" cy="15" r="2"/><circle cx="15" cy="5" r="2"/><path d="M7 15h5.5a2.5 2.5 0 0 0 0-5h-5a2.5 2.5 0 0 1 0-5H13"/>',
  bulb: '<path d="M7.5 14.5h5M8 17h4M10 3a5 5 0 0 0-3 9c.6.5 1 1.3 1 2h4c0-.7.4-1.5 1-2a5 5 0 0 0-3-9Z"/>',
  check: '<path d="m4 10.5 4 4 8-9"/>',
  copy: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>',
  code: '<path d="m7 6-4 4 4 4M13 6l4 4-4 4"/>',
  ext: '<path d="M11 3h6v6M17 3l-8 8M14 12v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  left: '<path d="m12 4-6 6 6 6"/>',
  right: '<path d="m8 4 6 6-6 6"/>',
  eye: '<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z"/><circle cx="10" cy="10" r="2.5"/>',
  shuffle: '<path d="M3 6h3l8 8h3M3 14h3l2.5-2.5M11.5 8.5 14 6h3M15 4l2 2-2 2M15 12l2 2-2 2"/>',
  link: '<path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1"/>',
  inbox: '<path d="M3 11h4l1 2h4l1-2h4M3 11l2-6h10l2 6v5H3Z"/>',
  search: '<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',
  cup: '<path d="M4 8h10v4a5 5 0 0 1-10 0Z"/><path d="M14 9h1.5a2 2 0 0 1 0 4H14M7 2.5c-.6.8-.6 1.7 0 2.5M10 2.5c-.6.8-.6 1.7 0 2.5"/>',
  basics: '<path d="M7 4C5 4 5 5.5 5 7s-1.5 3-1.5 3S5 11.5 5 13s0 3 2 3M13 4c2 0 2 1.5 2 3s1.5 3 1.5 3-1.5 1.5-1.5 3 0 3-2 3"/>',
  collections: '<path d="m10 3 7 3.5-7 3.5-7-3.5Z"/><path d="m3 10 7 3.5 7-3.5M3 13.5 10 17l7-3.5"/>',
  concurrency: '<path d="M4 6h8M4 10h12M4 14h6"/><circle cx="15" cy="6" r="1.4"/><circle cx="13" cy="14" r="1.4"/>',
  jvm: '<rect x="5" y="5" width="10" height="10" rx="2"/><path d="M8 2.5V5M12 2.5V5M8 15v2.5M12 15v2.5M2.5 8H5M2.5 12H5M15 8h2.5M15 12h2.5"/>',
  spring: '<path d="M16 4C8 4 4 8 4 13c0 1.2.3 2.2.8 3C7 11 10 9 13 8c-3 2-5.5 4.5-7 8 1 .6 2 .8 3 .8 5 0 7-5 7-12.8Z"/>',
  eyeoff: '<path d="m3 3 14 14M8.3 4.7A8 8 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.4 3.1M5.4 6.3A14 14 0 0 0 2 10s3 5.5 8 5.5a8 8 0 0 0 3.6-.9M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5"/>',
  flame: '<path d="M10 17.5c3 0 5.5-2 5.5-5.2 0-3.3-2.8-5.3-3.6-8.3-1.9 1.4-2.6 3.3-2.4 5-1-.6-1.7-1.6-1.9-2.7C6 7.8 4.5 9.8 4.5 12.3c0 3.2 2.5 5.2 5.5 5.2Z"/>',
  keyboard: '<rect x="2.5" y="5" width="15" height="10" rx="2"/><path d="M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01M6.5 12h7"/>',
  x: '<path d="m5 5 10 10M15 5 5 15"/>',
  panel: '<rect x="2.5" y="3.5" width="15" height="13" rx="2.5"/><path d="M8 3.5v13M4.6 7h1.3M4.6 10h1.3M4.6 13h1.3"/>',
  focus: '<path d="M3 7.5v-3A1.5 1.5 0 0 1 4.5 3h3M12.5 3h3A1.5 1.5 0 0 1 17 4.5v3M17 12.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M7.5 17h-3A1.5 1.5 0 0 1 3 15.5v-3"/>',
  trophy: '<path d="M6 3.5h8v4a4 4 0 0 1-8 0ZM6 5H3.5a2.5 2.5 0 0 0 2.6 3M14 5h2.5a2.5 2.5 0 0 1-2.6 3M10 11.5V14M7 16.5h6M8 14h4v2.5H8Z"/>'
};
App.swapIcon = (a, b) => App.h("span", { class: "swap", "aria-hidden": "true" }, App.icon(a), App.icon(b));
App.reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
App.later = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
App.countUp = function countUp(el, to, ms = 900) {
  if (App.reduced() || !to) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = t => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  el.textContent = 0;
  requestAnimationFrame(tick);
};
App.slideSeg = function slideSeg(seg) {
  const thumb = App.h("span", { class: "seg-thumb", "aria-hidden": "true" });
  seg.classList.add("slide");
  seg.prepend(thumb);
  seg.place = () => {
    const on = seg.querySelector('[aria-pressed="true"], [aria-selected="true"]');
    thumb.style.opacity = on ? 1 : 0;
    if (on) { thumb.style.width = on.offsetWidth + "px"; thumb.style.transform = `translateX(${on.offsetLeft}px)`; }
  };
  new ResizeObserver(() => { seg.place(); requestAnimationFrame(() => seg.classList.add("ready")); }).observe(seg);
  return seg;
};
App.tile = (c, size) => {
  const el = App.h("span", { class: "ctile" + (size ? " " + size : ""), style: { "--c": c.color }, "aria-hidden": "true" });
  el.append(App.icon(c.id));
  return el;
};
App.icon = function icon(name, cls) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 20 20");
  s.setAttribute("aria-hidden", "true");
  if (cls) s.setAttribute("class", cls);
  s.innerHTML = ICONS[name];
  return s;
};

App.norm = s => String(s).toLowerCase();
App.words = q => App.norm(q).trim().split(/\s+/).filter(Boolean);

App.hl = function hl(text, words) {
  const frag = document.createDocumentFragment();
  if (!words || !words.length) { frag.append(text); return frag; }
  const lower = App.norm(text);
  const ranges = [];
  for (const w of words) {
    let i = 0;
    while ((i = lower.indexOf(w, i)) !== -1) { ranges.push([i, i + w.length]); i += w.length; }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [a, b] of ranges) {
    if (a < pos) continue;
    frag.append(text.slice(pos, a), App.h("mark", null, text.slice(a, b)));
    pos = b;
  }
  frag.append(text.slice(pos));
  return frag;
};

App.snippet = function snippet(text, words, len = 70) {
  const lower = App.norm(text);
  const i = Math.min(...words.map(w => lower.indexOf(w)).filter(i => i >= 0));
  if (!isFinite(i) || i < 30) return text.length > len ? text.slice(0, len) + "…" : text;
  const start = Math.max(0, i - 24);
  return "…" + text.slice(start, start + len) + (start + len < text.length ? "…" : "");
};

const KW = "abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|record|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield|sealed|permits|null|true|false|SELECT|FROM|WHERE|UPDATE|INSERT|INTO|VALUES|SET|AND|OR";
const TOKEN = new RegExp("(//.*|/\\*[\\s\\S]*?\\*/)|(\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')|\\b(" + KW + ")\\b|(@\\w+|\\b\\d[\\d_]*[lLfFdD]?\\b)|\\b([A-Z][A-Za-z0-9_]*)\\b", "gm");
App.codeFrag = function codeFrag(src) {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    frag.append(src.slice(last, m.index));
    const cls = m[1] ? "tok-c" : m[2] ? "tok-s" : m[3] ? "tok-k" : m[4] ? "tok-n" : "tok-t";
    frag.append(App.h("span", { class: cls }, m[0]));
    last = m.index + m[0].length;
  }
  frag.append(src.slice(last));
  return frag;
};

let toastTimer;
App.toast = function toast(msg, ic) {
  const el = document.getElementById("toast");
  el.replaceChildren(...(ic ? [App.icon(ic)] : []), msg);
  el.hidden = false;
  el.classList.remove("out");
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add("out");
    toastTimer = setTimeout(() => { el.hidden = true; el.classList.remove("out"); }, 220);
  }, 1800);
};
App.copy = async function copy(text, msg = "已复制", btn) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = App.h("textarea", { style: { position: "fixed", opacity: "0" } }, text);
    document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  App.toast(msg, "check");
  if (btn) {
    btn.classList.add("copied");
    clearTimeout(btn.copiedTimer);
    btn.copiedTimer = setTimeout(() => btn.classList.remove("copied"), 1600);
  }
};
App.copyBtn = (label, get, msg, cls = "btn sm ghost") => {
  const b = App.h("button", { type: "button", class: cls, onclick: () => App.copy(get(), msg, b) }, App.swapIcon("copy", "check"), label);
  return b;
};
App.shuffle = function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
