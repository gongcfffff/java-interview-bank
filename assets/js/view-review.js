"use strict";
(() => {
  const { h, icon, store } = App;

  function scopes() {
    const out = [["all", `全部 ${App.all.length} 题`], ["star", "我的收藏"], ["fuzzy", "待巩固（模糊）"]];
    for (const c of App.chapters) out.push([c.id, c.name]);
    return out;
  }

  function resolve(scope) {
    if (scope === "star") return { title: "我的收藏", qs: App.all.filter(q => store.starred(q.key)) };
    if (scope === "fuzzy") return { title: "待巩固", qs: App.all.filter(q => store.status(q.key) === "fuzzy") };
    if (scope.startsWith("route:")) {
      const [, cid, rid] = scope.split(":");
      const c = App.byId.get(cid), r = c?.routes.find(x => x.id === rid);
      if (r) return { title: c.name + " · " + r.title, qs: App.routeQuestions(c, r), route: true };
    }
    const c = App.byId.get(scope);
    if (c) return { title: c.name, qs: c.questions };
    return { title: "全部题目", qs: App.all };
  }

  App.views.review = function review(main, scope = store.get("review").scope || "all") {
    const pref = store.get("review");
    let skipOk = pref.skipOk !== false, order = pref.order || "shuffle";
    const wrap = h("div", { class: "review" });
    const stage = h("div");
    let deck = [], idx = 0, revealed = false, tally = { again: 0, fuzzy: 0, ok: 0 }, info;

    const scopeSel = h("select", { "aria-label": "复习范围" });
    for (const [v, label] of scopes()) scopeSel.append(h("option", { value: v }, label));
    if (scope.startsWith("route:")) scopeSel.prepend(h("option", { value: scope }, resolve(scope).title));
    scopeSel.value = scope;
    scopeSel.addEventListener("change", () => { location.hash = "#/review/" + scopeSel.value; });
    const skipBox = h("input", { type: "checkbox" });
    skipBox.checked = skipOk;
    skipBox.addEventListener("change", () => { skipOk = skipBox.checked; save(); start(); });
    const orderSel = h("select", { "aria-label": "顺序" }, h("option", { value: "shuffle" }, "随机顺序"), h("option", { value: "seq" }, "按题号"));
    orderSel.value = order;
    orderSel.addEventListener("change", () => { order = orderSel.value; save(); start(); });
    const save = () => store.set("review", { scope: scope.startsWith("route:") ? "all" : scope, skipOk, order });

    function start() {
      info = resolve(scope);
      const pool = skipOk ? info.qs.filter(q => store.status(q.key) !== "ok") : info.qs;
      deck = order === "shuffle" ? App.shuffle(pool) : pool.slice();
      idx = 0; tally = { again: 0, fuzzy: 0, ok: 0 };
      render();
    }

    let busy = false, bar = null;
    function grade(v) {
      const q = deck[idx];
      if (!q || !revealed || busy) return;
      busy = true;
      tally[v]++;
      const card = stage.querySelector(".flash");
      stage.querySelector(".grade")?.classList.add("chosen-" + v);
      card?.classList.add("leave", v === "ok" ? "to-right" : "to-left");
      store.setStatus(q.key, v === "again" ? "fuzzy" : v);
      setTimeout(() => { busy = false; idx++; render(); }, App.reduced() ? 0 : 240);
    }

    function render() {
      revealed = false;
      const q = deck[idx];
      if (!q) bar = null;
      if (!info.qs.length || (!deck.length && !idx)) {
        stage.replaceChildren(h("div", { class: "card empty", style: { "margin-top": "22px" } }, icon("inbox"),
          h("p", null, info.qs.length ? "这个范围内的题都已掌握" : "这个范围还没有题目"),
          h("p", null, info.qs.length ? "取消勾选“跳过已掌握”可以再过一遍。" : "在题目页点击“收藏”或标记“模糊”后，这里就会出现。")));
        return;
      }
      if (!q) {
        stage.replaceChildren(h("div", { class: "card done", style: { "margin-top": "22px" } },
          h("div", { class: "done-mark" }, h("svg", { viewBox: "0 0 52 52", "aria-hidden": "true" },
            h("circle", { svg: true, cx: 26, cy: 26, r: 23 }), h("path", { svg: true, d: "m15 27 7.5 7.5L37 19" }))),
          h("h2", null, "本轮完成"),
          h("p", { class: "muted" }, `共 ${deck.length} 道题`),
          h("div", { class: "nums" },
            h("div", null, h("b", { style: { color: "var(--ok)" } }, tally.ok), h("span", null, "掌握")),
            h("div", null, h("b", { style: { color: "var(--warn)" } }, tally.fuzzy), h("span", null, "模糊")),
            h("div", null, h("b", { style: { color: "var(--danger)" } }, tally.again), h("span", null, "没想起来"))),
          h("div", { style: { display: "flex", gap: "10px", "justify-content": "center", "flex-wrap": "wrap" } },
            h("button", { type: "button", class: "btn primary", onclick: start }, icon("shuffle"), "再来一轮"),
            tally.again + tally.fuzzy ? h("a", { class: "btn", href: "#/review/fuzzy" }, icon("alert"), "只练待巩固") : null,
            h("a", { class: "btn", href: "#/" }, "回到总览"))));
        return;
      }
      const ans = h("div", { class: "ans" });
      const foot = h("div", { class: "grade-dock" });
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        store.markSeen(q.key);
        ans.replaceChildren(App.answerBody(q));
        ans.classList.add("revealed");
        foot.replaceChildren(h("div", { class: "grade" },
          h("button", { type: "button", class: "btn again", onclick: () => grade("again") }, h("span", null, "没想起来"), h("small", null, h("kbd", null, "1"), "记为模糊")),
          h("button", { type: "button", class: "btn fuzzy", onclick: () => grade("fuzzy") }, h("span", null, "有点模糊"), h("small", null, h("kbd", null, "2"), "待巩固")),
          h("button", { type: "button", class: "btn ok", onclick: () => grade("ok") }, h("span", null, "已掌握"), h("small", null, h("kbd", null, "3"), "跳过此题"))));
      };
      const prog = { total: deck.length, ok: idx, fuzzy: 0 };
      if (bar) bar.set(prog); else bar = App.bar(prog, false, { total: deck.length, ok: Math.max(0, idx - 1), fuzzy: 0 });
      stage.replaceChildren(
        h("div", { class: "review-prog" }, h("span", null, `${idx + 1} / ${deck.length}`), bar, h("span", null, info.title)),
        h("article", { class: "card flash" },
          h("div", { class: "meta" },
            App.tile(q.c, "sm"), h("span", null, App.qLabel(q)),
            h("span", { class: "tag cat", style: { "--c": q.cat.color } }, q.cat.label + " · " + q.n.title),
            store.starred(q.key) ? h("span", { class: "tag", style: { color: "var(--star)" } }, "★ 已收藏") : null,
            h("a", { href: App.qUrl(q) }, "打开详情 →")),
          h("h2", null, q.t),
          h("p", { class: "hint" }, "先在心里或出声回答，再显示答案自评。"),
          ans,
          h("div", { class: "reveal" }, h("button", { type: "button", class: "btn primary", onclick: () => stage.reveal() }, icon("eye"), "显示答案（空格）"))),
        foot);
      stage.reveal = () => { reveal(); stage.querySelector(".reveal")?.remove(); };
    }

    wrap.append(
      h("h1", { class: "page-title" }, "刷题复习"),
      h("p", { class: "page-sub" }, "先回忆答案，再显示答案并自评。没想起来或有点模糊的题会进入“待巩固”。"),
      h("div", { class: "card review-setup" },
        h("label", null, "范围", scopeSel),
        h("label", null, "顺序", orderSel),
        h("label", null, skipBox, "跳过已掌握"),
        h("button", { type: "button", class: "btn sm", onclick: start }, icon("shuffle"), "重新开始")),
      stage);
    main.append(wrap);
    start();
    return {
      key: "review/" + scope,
      keys(e) {
        if (e.key === " " && !revealed && deck[idx]) { e.preventDefault(); stage.reveal(); return true; }
        const g = { 1: "again", 2: "fuzzy", 3: "ok" }[e.key];
        if (g && revealed) { grade(g); return true; }
        return false;
      }
    };
  };
})();
