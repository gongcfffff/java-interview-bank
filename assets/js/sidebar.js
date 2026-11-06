"use strict";
(() => {
  const { h, icon, store } = App;
  const root = document.getElementById("sidebar");
  let ui = null;

  function link(href, ic, label, withCount) {
    const count = withCount ? h("span", { class: "count" }) : null;
    const a = h("a", { class: "side-link", href }, icon(ic), h("span", { class: "name" }, label), count);
    a.count = count;
    return a;
  }

  function build() {
    const main = {
      home: link("#/", "home", "总览"),
      review: link("#/review", "flash", "刷题复习"),
      star: link("#/saved/star", "star", "我的收藏", true),
      fuzzy: link("#/saved/fuzzy", "alert", "待巩固", true)
    };
    const chapters = App.chapters.map(c => {
      const ring = h("span", { class: "mring" });
      const a = h("a", { class: "side-link side-chapter", href: "#/c/" + c.id },
        App.tile(c), h("span", { class: "name" }, c.name), h("span", { class: "count" }, c.questions.length), ring);
      return { c, a, ring };
    });
    const pct = h("strong");
    const bar = App.bar(store.stats(App.all), true);
    const legend = h("div", { class: "legend" });
    root.replaceChildren(
      h("nav", { class: "side-group", "aria-label": "主导航" }, Object.values(main)),
      h("nav", { class: "side-group", "aria-label": "章节" }, h("p", { class: "side-cap" }, "章节"), chapters.map(x => x.a)),
      h("div", { class: "side-total" },
        h("div", { class: "nums" }, h("span", null, "总进度"), h("span", null, pct)),
        bar, legend,
        h("button", {
          type: "button", class: "link-btn",
          onclick() { if (confirm("清空所有学习进度、收藏和学习记录？此操作无法撤销。")) { store.reset(); App.toast("进度已清空", "check"); } }
        }, "清空进度")));
    return { main, chapters, pct, bar, legend };
  }

  function setActive(a, on) {
    a.classList.toggle("active", on);
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  }

  App.renderSidebar = function renderSidebar() {
    ui ||= build();
    const r = App.route || [];
    const view = r[0] || "";
    const all = store.stats(App.all);
    setActive(ui.main.home, view === "");
    setActive(ui.main.review, view === "review");
    setActive(ui.main.star, view === "saved" && r[1] === "star");
    setActive(ui.main.fuzzy, view === "saved" && r[1] === "fuzzy");
    ui.main.star.count.textContent = all.star || "";
    ui.main.fuzzy.count.textContent = all.fuzzy || "";
    for (const { c, a, ring } of ui.chapters) {
      const st = store.stats(c.questions);
      setActive(a, view === "c" && r[1] === c.id);
      ring.style.setProperty("--p", st.ok / st.total * 100 + "%");
      ring.style.setProperty("--f", (st.ok + st.fuzzy) / st.total * 100 + "%");
      ring.title = `掌握 ${st.ok}，模糊 ${st.fuzzy}，共 ${st.total}`;
    }
    ui.pct.textContent = (all.total ? Math.round(all.ok / all.total * 100) : 0) + "%";
    ui.bar.set(all);
    ui.legend.replaceChildren(
      h("span", null, h("i", { style: { background: "var(--ok-fill)" } }), "掌握 " + all.ok),
      h("span", null, h("i", { style: { background: "var(--warn-fill)" } }), "模糊 " + all.fuzzy),
      h("span", null, h("i", { style: { background: "var(--accent-blue)" } }), "看过 " + all.seen));
  };

  const menuBtn = document.getElementById("menuBtn");
  const scrim = document.getElementById("scrim");
  const html = document.documentElement;
  const wideMq = matchMedia("(min-width: 861px)");

  // 宽屏：侧栏与题目列表可收起（data-nav / data-list）；窄屏：侧栏是抽屉
  const PANES = { nav: ["nav", "hideNav"], list: ["list", "hideList"] };
  App.panes = {
    wide: () => wideMq.matches,
    shown: p => html.dataset[PANES[p][0]] !== "off",
    set(p, on) {
      const [attr, pref] = PANES[p];
      if (on) delete html.dataset[attr]; else html.dataset[attr] = "off";
      store.set(pref, !on);
      sync();
    },
    toggle(p) { App.panes.set(p, !App.panes.shown(p)); },
    focus() {
      const enter = App.panes.shown("nav") || App.panes.shown("list");
      App.panes.set("nav", !enter);
      App.panes.set("list", !enter);
      App.toast(enter ? "专注模式：按 F 或 Esc 退出" : "已退出专注模式", "focus");
    },
    focused: () => !App.panes.shown("nav") && !App.panes.shown("list")
  };
  function sync() {
    menuBtn.setAttribute("aria-expanded", String(wideMq.matches ? App.panes.shown("nav") : App.drawerOpen()));
    for (const b of document.querySelectorAll("[data-pane]")) b.setAttribute("aria-expanded", String(App.panes.shown(b.dataset.pane)));
  }
  App.panes.sync = sync;

  App.setDrawer = function setDrawer(open) {
    if (root.classList.contains("open") === open) return;
    root.classList.toggle("open", open);
    scrim.hidden = !open;
    sync();
  };
  App.drawerOpen = () => root.classList.contains("open");
  // 鼠标点开关后把焦点还给阅读区，避免之后按键时按钮出现焦点环、空格误触发
  App.panes.refocus = e => { if (e?.detail) (document.querySelector(".qdetail-pane") || document.getElementById("main")).focus({ preventScroll: true }); };
  menuBtn.addEventListener("click", e => {
    if (wideMq.matches) { App.panes.toggle("nav"); App.panes.refocus(e); }
    else App.setDrawer(!App.drawerOpen());
  });
  scrim.addEventListener("click", () => App.setDrawer(false));
  wideMq.addEventListener("change", () => { App.setDrawer(false); sync(); });
  sync();
})();
