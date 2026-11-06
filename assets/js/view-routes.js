"use strict";
(() => {
  const { h, icon } = App;

  App.routesTab = function routesTab(body, c) {
    const scroll = h("div", { class: "chap-scroll" });
    const right = h("section", { "aria-live": "polite" });
    const cards = new Map();
    const list = h("nav", { class: "card route-list", "aria-label": "学习路线" }, c.routes.map((r, i) => {
      const card = h("button", { type: "button", class: "route-card", "aria-pressed": "false", onclick: () => { location.hash = "#/c/" + c.id + "/routes/" + r.id; } },
        h("span", { class: "rn" }, i + 1),
        h("span", null, h("b", null, r.title), h("small", null, r.desc + " · " + r.nodes.length + " 步")));
      cards.set(r.id, card);
      return card;
    }));

    function select(id) {
      const r = c.routes.find(x => x.id === id) || c.routes[0];
      for (const [rid, card] of cards) card.setAttribute("aria-pressed", String(rid === r.id));
      const qs = App.routeQuestions(c, r);
      right.replaceChildren(
        h("div", { class: "route-head" },
          h("h2", null, r.title),
          h("span", { class: "tag" }, r.nodes.length + " 个知识点 · " + qs.length + " 道题"),
          qs.length ? h("a", { class: "btn sm primary", href: "#/review/route:" + c.id + ":" + r.id, style: { "margin-left": "auto" } }, icon("flash"), "按路线刷题") : null,
          h("p", null, r.desc)),
        h("ol", { class: "steps" }, r.nodes.map((id, i) => {
          const n = c.nodeMap.get(id), cat = c.catMap.get(n.cat), nq = c.nodeQs.get(id);
          return h("li", { class: "step", style: { "--c": cat.color, "--i": Math.min(i, 12) } },
            h("span", { class: "step-no" }, i + 1),
            h("div", { class: "card step-body" },
              h("div", { class: "h" },
                h("b", null, n.title),
                h("span", { class: "tag cat" }, cat.label),
                n.core ? h("span", { class: "tag core" }, "核心") : null,
                h("a", { class: "btn sm ghost", href: App.nodeUrl(c, id), style: { "margin-left": "auto" } }, "图谱", icon("right"))),
              h("p", null, n.what || n.sub),
              n.take ? h("p", { class: "take", style: { color: "var(--text)" } }, h("b", null, "抓手"), n.take) : null,
              nq.length ? h("div", { class: "qs" }, nq.map(q => h("a", { href: App.qUrl(q) }, q.t))) : null));
        })));
    }

    scroll.append(h("div", { class: "routes-wrap" }, list, right));
    body.append(scroll);
    return { update(arg) { select(arg); scroll.scrollTop = 0; } };
  };
})();
