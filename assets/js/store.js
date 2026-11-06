"use strict";
(() => {
  const KEY = "jq.v1";
  const DEFAULT = { status: {}, star: [], seen: [], last: null, theme: null, font: "m", recite: false, review: { scope: "all", skipOk: true }, days: {}, today: null, hideNav: false, hideList: false };
  let state;
  try { state = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { state = { ...DEFAULT }; }
  const star = new Set(state.star);
  const seen = new Set(state.seen);
  const listeners = new Set();

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      state.star = [...star];
      state.seen = [...seen];
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }, 120);
  }
  function emit(type, key) { for (const fn of listeners) fn(type, key); }
  const dayKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function touch(key) {
    const d = dayKey();
    if (!state.today || state.today.d !== d) state.today = { d, keys: [] };
    if (state.today.keys.includes(key)) return;
    state.today.keys.push(key);
    state.days = { ...state.days, [d]: (state.days[d] || 0) + 1 };
  }

  App.store = {
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    status: key => state.status[key] || (seen.has(key) ? "seen" : "new"),
    setStatus(key, value) {
      if (value === "new") { delete state.status[key]; seen.delete(key); }
      else if (value === "seen") delete state.status[key];
      else state.status[key] = value;
      if (value !== "new") touch(key);
      save(); emit("status", key);
    },
    markSeen(key) {
      touch(key);
      if (seen.has(key)) { save(); return; }
      seen.add(key); save(); emit("seen", key);
    },
    dayKey,
    days: () => state.days || {},
    starred: key => star.has(key),
    toggleStar(key) {
      star.has(key) ? star.delete(key) : star.add(key);
      save(); emit("star", key);
      return star.has(key);
    },
    get: name => state[name],
    set(name, value) { state[name] = value; save(); emit("pref", name); },
    stats(questions) {
      const r = { total: questions.length, seen: 0, fuzzy: 0, ok: 0, star: 0 };
      for (const q of questions) {
        const s = App.store.status(q.key);
        if (s === "fuzzy") r.fuzzy++;
        else if (s === "ok") r.ok++;
        if (s !== "new") r.seen++;
        if (star.has(q.key)) r.star++;
      }
      return r;
    },
    reset() {
      state.status = {}; state.last = null; state.days = {}; state.today = null;
      star.clear(); seen.clear();
      save(); emit("reset");
    }
  };

  App.bar = function bar(st, thick, from) {
    const ok = App.h("span", { class: "ok" }), fz = App.h("span", { class: "fz" });
    const el = App.h("div", { class: "bar" + (thick ? " thick" : ""), role: "img" }, ok, fz);
    el.set = s => {
      const pct = n => (s.total ? n / s.total * 100 : 0) + "%";
      ok.style.width = pct(s.ok); fz.style.width = pct(s.fuzzy);
      el.setAttribute("aria-label", `已掌握 ${s.ok}，待巩固 ${s.fuzzy}，共 ${s.total}`);
    };
    el.set(from || { total: st.total, ok: 0, fuzzy: 0 });
    App.later(() => el.set(st));
    return el;
  };
})();
