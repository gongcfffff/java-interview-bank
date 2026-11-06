"use strict";
(() => {
  const { h, store } = App;
  const main = document.getElementById("main");
  const root = document.documentElement;
  const bankTitle = `Java 面试题库 · ${App.all.length} 题`;
  document.getElementById("bankSummary").textContent = `${App.chapters.length} 章 · ${App.all.length} 题 · 离线可用`;
  let cur = {};

  function render() {
    const r = App.route = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    App.setDrawer(false);
    let make, title = bankTitle;
    if (r[0] === "c" && App.byId.has(r[1])) {
      const c = App.byId.get(r[1]);
      const tab = r[2] === "map" || r[2] === "routes" ? r[2] : "q";
      const arg = tab === "q" ? (r[2] === "q" ? r[3] : null) : r[3];
      document.title = c.name + " · Java 面试题库";
      if (cur.chapter === c) {
        if (cur.tab === tab) cur.update(arg); else cur.show(tab, arg);
        App.renderSidebar();
        return;
      }
      make = m => App.views.chapter(m, c, tab, arg);
    } else if (r[0] === "review") {
      title = "刷题复习 · Java 面试题库";
      make = m => App.views.review(m, r[1] ? decodeURIComponent(r[1]) : undefined);
    } else if (r[0] === "saved") {
      title = "收藏与错题 · Java 面试题库";
      make = m => App.views.saved(m, r[1]);
    } else {
      make = m => App.views.home(m);
    }
    document.title = title;
    cur = {};
    main.className = "main";
    main.replaceChildren();
    main.scrollTop = 0;
    cur = make(main) || {};
    cur.refresh?.();
    App.current = cur;
    App.renderSidebar();
  }

  store.on(type => {
    if (type === "pref") return;
    if (type === "reset") { cur = {}; render(); return; }
    App.renderSidebar();
    cur.refresh?.();
  });

  const reciteBtn = document.getElementById("reciteBtn");
  const syncRecite = () => reciteBtn.setAttribute("aria-pressed", String(!!store.get("recite")));
  function toggleRecite() {
    const on = !store.get("recite");
    store.set("recite", on);
    syncRecite();
    App.toast(on ? "背诵模式：先回忆，按空格显示答案" : "背诵模式已关闭", on ? "eyeoff" : "eye");
    if (cur.tab === "q") cur.inner?.detail?.()?.setVeil(on);
  }
  reciteBtn.addEventListener("click", toggleRecite);

  function setTheme(next, x, y) {
    const apply = () => { root.dataset.theme = next; };
    if (!document.startViewTransition || App.reduced()) { apply(); return; }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-vt");
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" });
    });
    vt.finished.finally(() => root.classList.remove("theme-vt"));
  }
  const themeBtn = document.getElementById("themeBtn");
  themeBtn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const b = themeBtn.getBoundingClientRect();
    setTheme(next, b.left + b.width / 2, b.top + b.height / 2);
    store.set("theme", next);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!store.get("theme")) root.dataset.theme = e.matches ? "dark" : "light";
  });

  const FONTS = { m: ["l", "大"], l: ["s", "小"], s: ["m", "中"] };
  const fontLabel = document.getElementById("fontLabel");
  const syncFont = () => { fontLabel.textContent = { s: "小", m: "中", l: "大" }[root.dataset.font] || "中"; };
  document.getElementById("fontBtn").addEventListener("click", () => {
    const next = (FONTS[root.dataset.font] || FONTS.m)[0];
    root.dataset.font = next;
    store.set("font", next);
    syncFont();
    App.toast("字号：" + { s: "小", m: "中", l: "大" }[next]);
  });

  const KEYS = [
    ["全局", [[["/"], "搜索全部题目"], [["Ctrl", "K"], "搜索（输入框内也可用）"], [["["], "收起 / 展开侧边栏"], [["F"], "专注模式（Esc 退出）"], [["R"], "开关背诵模式"], [["?"], "显示快捷键"]]],
    ["题目页", [[["J"], "下一题"], [["K"], "上一题"], [["1"], "标记为未学"], [["2"], "标记为模糊"], [["3"], "标记为掌握"], [["S"], "收藏 / 取消收藏"], [["L"], "收起 / 展开题目列表"], [["空格"], "显示答案 / 向下翻页"], [["↑", "↓"], "滚动正文"]]],
    ["刷题复习", [[["空格"], "显示答案"], [["1"], "没想起来"], [["2"], "有点模糊"], [["3"], "已掌握"]]]
  ];
  App.KEYS = KEYS;
  let dlg;
  function closeDialog() {
    if (!dlg?.open || dlg.classList.contains("closing")) return;
    dlg.classList.add("closing");
    setTimeout(() => { dlg.classList.remove("closing"); dlg.close(); }, App.reduced() ? 0 : 160);
  }
  function openHelp() {
    if (!dlg) {
      dlg = h("dialog", { class: "dialog", "aria-labelledby": "help-title" },
        h("div", { class: "dialog-h" },
          h("h2", { id: "help-title" }, "键盘快捷键"),
          h("button", { type: "button", class: "icon-btn", "aria-label": "关闭", onclick: closeDialog }, App.icon("x"))),
        h("div", { class: "dialog-body keys-grid" }, KEYS.map(([group, rows]) =>
          h("section", null, h("h3", null, group), rows.map(([ks, label]) =>
            h("div", { class: "krow" }, h("span", null, label), h("span", null, ks.map(k => h("kbd", null, k)))))))));
      dlg.addEventListener("cancel", e => { e.preventDefault(); closeDialog(); });
      dlg.addEventListener("click", e => { if (e.target === dlg) closeDialog(); });
      document.body.append(dlg);
    }
    if (!dlg.open) dlg.showModal();
  }
  App.openHelp = openHelp;
  document.getElementById("helpBtn").addEventListener("click", openHelp);

  document.addEventListener("keydown", e => {
    if (e.defaultPrevented || e.altKey || e.isComposing) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); if (dlg?.open) closeDialog(); App.focusSearch(); return; }
    if (e.ctrlKey || e.metaKey) return;
    if (document.querySelector("dialog[open]")) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (k === "Escape") {
      if (App.drawerOpen()) App.setDrawer(false);
      else if (App.panes.wide() && App.panes.focused()) App.panes.focus();
      return;
    }
    if (k === "?") { e.preventDefault(); openHelp(); return; }
    if (k === "/") { e.preventDefault(); App.focusSearch(); return; }
    if (e.repeat && k !== "j" && k !== "k" && k !== "ArrowRight" && k !== "ArrowLeft") return;
    if (k === "[") { App.panes.wide() ? App.panes.toggle("nav") : App.setDrawer(!App.drawerOpen()); return; }
    if (App.drawerOpen()) return;
    if (k === " " && e.target.closest?.("button, a, [role=link]") && !cur.keys) return;
    if (k === "f" && App.panes.wide()) { App.panes.focus(); return; }
    if (k === "l" && App.panes.wide() && cur.tab === "q") { App.panes.toggle("list"); return; }
    if (cur.keys?.(e)) return;
    if (k === "r") { toggleRecite(); return; }
    const inner = cur.tab === "q" ? cur.inner : null;
    if (!inner) return;
    if (k === "j" || k === "ArrowRight") { e.preventDefault(); inner.step(1); return; }
    if (k === "k" || k === "ArrowLeft") { e.preventDefault(); inner.step(-1); return; }
    const d = inner.current() && inner.detail();
    if (!d) return;
    if (k === "s") d.toggleStar();
    else if (k === "1" || k === "2" || k === "3") d.setStatus(["new", "fuzzy", "ok"][k - 1]);
    else if (k === " " && d.reveal()) e.preventDefault();
  });

  syncRecite();
  syncFont();
  window.addEventListener("hashchange", render);
  render();
  requestAnimationFrame(() => root.classList.add("ready"));
})();
