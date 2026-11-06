"use strict";
(() => {
  const { h, icon, store } = App;
  const filters = new Map();
  const STATUS = [["all", "全部"], ["new", "未看"], ["fuzzy", "模糊"], ["ok", "掌握"], ["star", "收藏"]];
  const TABS = [["q", "list", "题目"], ["map", "map", "知识图谱"], ["routes", "route", "学习路线"]];
  const narrow = () => matchMedia("(max-width: 860px)").matches;

  function head(c, tab) {
    const label = h("span");
    const bar = App.bar(store.stats(c.questions));
    const prog = h("div", { class: "chap-progress" }, label, bar,
      h("a", { class: "chap-drill", href: "#/review/" + c.id, title: "按本章出题自测" }, icon("flash"), "刷本章"));
    const paneBtn = h("button", {
      type: "button", class: "icon-btn pane-btn", "data-pane": "list", "aria-label": "题目列表",
      "aria-expanded": String(App.panes.shown("list")), title: "收起 / 展开题目列表 (L)", onclick: e => { App.panes.toggle("list"); App.panes.refocus(e); }
    }, icon("panel"));
    const fill = () => {
      const st = store.stats(c.questions);
      label.textContent = `掌握 ${st.ok} · 模糊 ${st.fuzzy} · 看过 ${st.seen}/${st.total}`;
      bar.set(st);
    };
    fill();
    const el = h("header", { class: "chap-head" },
      h("div", { class: "chap-title" },
        paneBtn,
        App.tile(c, "md"),
        h("div", { style: { "min-width": "0" } },
          h("h1", null, c.name),
          h("p", { title: c.intro }, `${c.questions.length} 题 · ${c.nodes.length} 个知识点 · ${c.routes.length} 条路线　${c.intro}`))),
      h("div", { class: "chap-side" },
        App.slideSeg(h("nav", { class: "seg chap-tabs", role: "tablist", "aria-label": "章节视图" }, TABS.map(([id, ic, label]) =>
          h("a", { role: "tab", href: "#/c/" + c.id + (id === "q" ? "" : "/" + id), "aria-selected": String(tab === id) }, icon(ic), label)))),
        prog));
    el.refresh = fill;
    el.paneBtn = paneBtn;
    return el;
  }

  function matches(q, f, words) {
    if (f.sec !== -1 && q.sec !== f.sec) return false;
    const s = store.status(q.key);
    if (f.status === "star" ? !store.starred(q.key) : f.status === "new" ? s !== "new" : f.status !== "all" && s !== f.status) return false;
    return words.every(w => q.text.includes(w) || q.tNode.includes(w));
  }

  function questionsTab(body, c) {
    const f = filters.get(c.id) || { sec: -1, status: "all", text: "" };
    filters.set(c.id, f);
    // keep: 正在看的题因自评改变状态时，暂不从当前筛选结果里消失
    let current = null, shown = [], detail = null, keep = null;
    const counts = App.sectionCounts(c);
    const bySection = (a, b) => a.sec - b.sec || a.i - b.i;
    const ordered = c.questions.slice().sort(bySection);
    const list = h("nav", { class: "qlist", "aria-label": "本章题目" });
    // 详情区可聚焦：方向键 / 空格 / PageDown 直接滚动正文
    const detailPane = h("section", { class: "qdetail-pane", "aria-label": "题目详情", tabindex: "-1" });
    detailPane.addEventListener("click", e => {
      if (e.detail && e.target.closest("button")) detailPane.focus({ preventScroll: true });
    });
    const split = h("div", { class: "qsplit" });
    const input = h("input", { type: "search", placeholder: "在本章筛选", value: f.text, "aria-label": "筛选本章题目" });
    input.addEventListener("input", () => { f.text = input.value; keep = null; renderList(); });
    const secChips = h("div", { class: "chips", role: "group", "aria-label": "按小节筛选" },
      [[-1, "全部", c.questions.length], ...c.sections.map((s, i) => [i, s, counts[i]])].map(([i, s, n]) =>
        h("button", { type: "button", class: "chip", "data-i": i, onclick(e) { f.sec = i; renderFilters(); renderList(); e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); } }, s, h("span", { class: "n" }, n))));
    const statusSeg = App.slideSeg(h("div", { class: "seg", role: "group", "aria-label": "按状态筛选" },
      STATUS.map(([v, label]) => h("button", { type: "button", "data-v": v, onclick() { f.status = v; renderFilters(); renderList(); } }, label))));

    function renderFilters() {
      keep = null;
      for (const b of secChips.children) b.setAttribute("aria-pressed", String(f.sec === Number(b.dataset.i)));
      for (const b of statusSeg.querySelectorAll("button")) b.setAttribute("aria-pressed", String(f.status === b.dataset.v));
      statusSeg.place();
    }

    function renderList() {
      const words = App.words(f.text);
      shown = ordered.filter(q => q === keep || matches(q, f, words));
      const top = list.scrollTop;
      list.replaceChildren();
      if (!shown.length) list.append(h("div", { class: "empty" }, icon("inbox"), h("p", null, "没有符合条件的题目")));
      let sec = -1;
      for (const q of shown) {
        if (q.sec !== sec) {
          sec = q.sec;
          list.append(h("div", { class: "qsec" }, h("span", null, c.sections[sec]), h("span", null, shown.filter(x => x.sec === sec).length)));
        }
        const s = store.status(q.key);
        list.append(h("a", { class: "qitem" + (q === current ? " active" : ""), href: App.qUrl(q), "data-i": q.i, "aria-current": q === current ? "true" : null },
          h("span", { class: "no" }, String(q.no).padStart(2, "0")),
          h("span", { class: "tt" }, App.hl(q.t, words)),
          h("span", { class: "ic" },
            store.starred(q.key) ? App.icon("star", "star-mini") : null,
            h("span", { class: "sdot " + s, title: { new: "未看", seen: "看过", fuzzy: "模糊", ok: "掌握" }[s] }))));
      }
      list.scrollTop = top;
    }

    // 列表可能处于收起状态，不能用 scrollIntoView（会去滚动被裁剪的祖先）
    function reveal() {
      const a = list.querySelector(".qitem.active");
      if (!a) return;
      const lr = list.getBoundingClientRect(), ar = a.getBoundingClientRect(), pad = 40;
      if (ar.top < lr.top + pad) list.scrollTop += ar.top - lr.top - pad;
      else if (ar.bottom > lr.bottom - 8) list.scrollTop += ar.bottom - lr.bottom + 8;
    }

    function neighbor(q, d) {
      const seq = shown.length ? shown : ordered;
      if (!q) return seq[0];
      return d > 0 ? seq.find(x => bySection(x, q) > 0) : seq.findLast(x => bySection(x, q) < 0);
    }

    function step(d) {
      const next = neighbor(current, d);
      if (next) location.hash = App.qUrl(next);
      else {
        const filtered = shown.length < c.questions.length;
        App.toast(d > 0 ? (filtered ? "已是筛选结果的最后一题" : "本章最后一题，页面底部可进入下一章") : (filtered ? "已是筛选结果的第一题" : "已经是第一题"));
      }
    }

    function select(no) {
      const q = c.questions[no - 1];
      if (!q) {
        current = null;
        split.classList.remove("show-detail");
        const lastKey = store.get("last");
        const pick = (lastKey && lastKey.startsWith(c.id + ":") && App.byKey.get(lastKey)) || shown[0] || c.questions[0];
        if (!narrow()) {
          history.replaceState(null, "", App.qUrl(pick));
          App.route = ["c", c.id, "q", String(pick.no)];
          return select(pick.no);
        }
        detail = null;
        detailPane.replaceChildren();
        renderList();
        return;
      }
      if (current === q && detail) return;
      const dir = current && current !== q ? Math.sign(q.i - current.i) : 0;
      current = q;
      keep = matches(q, f, App.words(f.text)) ? q : null;
      renderList();
      store.set("last", q.key);
      detail = App.renderDetail(q, { prev: neighbor(q, -1), next: neighbor(q, 1), dir });
      detailPane.replaceChildren(
        h("a", { class: "btn sm ghost back-btn", href: "#/c/" + c.id }, icon("left"), c.name),
        detail);
      detailPane.scrollTop = 0;
      split.classList.add("show-detail");
      reveal();
      if (!document.activeElement?.closest("input, textarea, select, dialog")) detailPane.focus({ preventScroll: true });
      store.markSeen(q.key);
    }

    renderFilters();
    split.append(h("aside", { class: "qlist-pane", "aria-label": "题目列表" }, h("div", { class: "qfilters" }, h("label", { class: "field" }, icon("search"), input), secChips, statusSeg), list), detailPane);
    body.append(split);
    return {
      update: arg => select(Number(arg) || 0),
      refresh: () => { renderList(); detail?.sync(); statusSeg.place(); },
      step, current: () => current, detail: () => detail
    };
  }

  App.views.chapter = function chapter(main, c, tab, arg) {
    main.classList.add("fill");
    const hd = head(c, tab);
    const tabs = hd.querySelector(".chap-tabs");
    const view = { chapter: c, refresh: () => { hd.refresh(); view.inner.refresh?.(); } };
    const shell = h("div", { class: "chap" }, hd);
    main.append(shell);
    view.show = (t, a) => {
      view.tab = t;
      view.key = "c/" + c.id + "/" + t;
      for (const el of tabs.querySelectorAll("a")) el.setAttribute("aria-selected", String(el.getAttribute("href") === "#/c/" + c.id + (t === "q" ? "" : "/" + t)));
      tabs.place();
      hd.paneBtn.hidden = t !== "q";
      const body = h("div", { class: "chap-body" });
      shell.querySelector(".chap-body")?.remove();
      shell.append(body);
      view.inner = t === "map" ? App.mapTab(body, c) : t === "routes" ? App.routesTab(body, c) : questionsTab(body, c);
      view.update = view.inner.update;
      view.inner.update(a);
    };
    view.show(tab, arg);
    return view;
  };
})();
