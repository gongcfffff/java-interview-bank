"use strict";
(() => {
  const { h } = App;
  const box = document.getElementById("search");
  const input = document.getElementById("searchInput");
  const panel = document.getElementById("searchPanel");
  const status = document.getElementById("searchStatus");
  const list = document.getElementById("searchResults");
  const LIMIT = 60;
  let items = [], cursor = -1;

  function score(q, words) {
    let s = 0;
    for (const w of words) {
      if (q.tTitle.includes(w)) s += 10;
      else if (q.tNode.includes(w)) s += 4;
      else if (q.text.includes(w)) s += 1;
      else return 0;
    }
    return s;
  }

  function open(show) {
    panel.hidden = !show;
    input.setAttribute("aria-expanded", String(show));
  }

  function render() {
    const words = App.words(input.value);
    list.replaceChildren();
    items = []; cursor = -1;
    input.removeAttribute("aria-activedescendant");
    if (!words.length) {
      status.textContent = "可搜索题目、答案要点、示例和知识点。多个关键词用空格分隔。";
      return;
    }
    const hits = App.all.map(q => ({ q, s: score(q, words) })).filter(x => x.s).sort((a, b) => b.s - a.s);
    status.textContent = hits.length ? `找到 ${hits.length} 道题` + (hits.length > LIMIT ? `，显示前 ${LIMIT} 道` : "") + " · ↑↓ 选择，Enter 打开" : "";
    if (!hits.length) {
      list.append(h("li", { class: "sr-empty" }, "没有匹配的题目，换个关键词试试"));
      return;
    }
    const shown = hits.slice(0, LIMIT);
    for (const c of App.chapters) {
      const group = shown.filter(x => x.q.c === c);
      if (!group.length) continue;
      list.append(h("li", { class: "sr-group", role: "presentation" }, c.name + " · " + group.length));
      for (const { q } of group) {
        const inTitle = words.every(w => q.tTitle.includes(w));
        const body = inTitle ? q.s : [q.s, q.interview, ...q.d, q.ex, q.pit].find(t => words.some(w => App.norm(t).includes(w))) || q.s;
        const el = h("li", { id: "sr-" + items.length, class: "sr-item", role: "option", "aria-selected": "false" },
          h("span", { class: "t" }, h("span", { class: "no" }, String(q.no).padStart(2, "0")), h("span", null, App.hl(q.t, words))),
          h("span", { class: "s" }, App.hl(App.snippet(body, words), words)));
        el.addEventListener("mousedown", e => e.preventDefault());
        el.addEventListener("click", () => go(q));
        items.push({ el, q });
        list.append(el);
      }
    }
  }

  function move(d) {
    if (!items.length) return;
    if (cursor >= 0) items[cursor].el.setAttribute("aria-selected", "false");
    cursor = (cursor + d + items.length) % items.length;
    const { el } = items[cursor];
    el.setAttribute("aria-selected", "true");
    el.scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", el.id);
  }

  function go(q) {
    open(false);
    input.blur();
    location.hash = App.qUrl(q);
  }

  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 80); open(true); });
  input.addEventListener("focus", () => { render(); open(true); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { const it = items[Math.max(cursor, 0)]; if (it) go(it.q); }
    else if (e.key === "Escape") { if (input.value) { input.value = ""; render(); } else { open(false); input.blur(); } }
  });
  document.addEventListener("pointerdown", e => { if (!box.contains(e.target)) open(false); });

  App.focusSearch = () => { input.focus(); input.select(); render(); open(true); };
})();
