"use strict";
(() => {
  const { h, icon, store } = App;
  const TABS = [["star", "我的收藏"], ["fuzzy", "待巩固"], ["ok", "已掌握"]];
  const pick = {
    star: q => store.starred(q.key),
    fuzzy: q => store.status(q.key) === "fuzzy",
    ok: q => store.status(q.key) === "ok"
  };

  App.views.saved = function saved(main, tab = "star") {
    if (!pick[tab]) tab = "star";
    const page = h("div", { class: "page" });
    const content = h("div");

    function render() {
      const qs = App.all.filter(pick[tab]);
      const groups = App.chapters.map(c => [c, qs.filter(q => q.c === c)]).filter(([, g]) => g.length);
      content.replaceChildren();
      App.append(content, [
        h("div", { class: "saved-bar" },
          h("div", { class: "seg", role: "tablist" }, TABS.map(([id, label]) =>
            h("a", { href: "#/saved/" + id, role: "tab", "aria-selected": String(id === tab) },
              label, h("span", { class: "n" }, App.all.filter(pick[id]).length)))),
          qs.length && tab !== "ok" ? h("a", { class: "btn sm primary", href: "#/review/" + tab, style: { "margin-left": "auto" } }, icon("flash"), "复习这 " + qs.length + " 道") : null),
        groups.length ? groups.map(([c, g]) => h("section", { class: "saved-group" },
          h("h3", null, App.tile(c, "sm"), c.name, h("span", { class: "muted" }, g.length + " 题")),
          h("div", { class: "card saved-list" }, g.map(q => {
            const s = store.status(q.key);
            return h("a", { class: "qitem", href: App.qUrl(q) },
              h("span", { class: "no" }, String(q.no).padStart(2, "0")),
              h("span", { class: "tt" }, q.t, h("small", null, c.sections[q.sec] + " · " + q.n.title)),
              h("span", { class: "ic" }, store.starred(q.key) ? App.icon("star", "star-mini") : null, h("span", { class: "sdot " + s })));
          }))))
          : h("div", { class: "card empty", style: { "margin-top": "20px" } }, icon(tab === "star" ? "star" : "inbox"),
            h("p", null, { star: "还没有收藏题目", fuzzy: "没有待巩固的题目", ok: "还没有标记为掌握的题目" }[tab]),
            h("p", null, { star: "在题目详情页点击“收藏”或按 S 键。", fuzzy: "在题目详情页标记“模糊”，或刷题时选择“没想起来 / 有点模糊”。", ok: "在题目详情页标记“掌握”，或刷题时选择“已掌握”。" }[tab]))]);
    }

    page.append(h("h1", { class: "page-title" }, "收藏与错题"), h("p", { class: "page-sub" }, "按章节整理你收藏、标记为模糊和已掌握的题目。"), content);
    main.append(page);
    render();
    return { key: "saved/" + tab, refresh: render };
  };
})();
