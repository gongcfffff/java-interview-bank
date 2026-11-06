"use strict";
(() => {
  const { h, icon } = App;
  const MAX = 14;

  function ego(c, node) {
    const nbrs = c.nbrs.get(node.id);
    const shown = nbrs.slice(0, MAX);
    const rows = Math.max(1, Math.ceil(shown.length / 2));
    const hint = !shown.length ? "暂无关联。" :
      (nbrs.length > MAX ? `共 ${nbrs.length} 个关联，图中显示前 ${MAX} 个。` : "") + "悬停连线或聚焦节点查看关系说明，选择节点可切换。";
    const whyEl = h("p", { class: "edge-why" }, hint);
    const svg = h("svg", { viewBox: `0 0 100 ${rows}`, preserveAspectRatio: "none", "aria-hidden": "true" });
    const graph = h("div", { class: "ego-graph", role: "group", "aria-label": node.title + " 的关联知识点",
      style: { "--rows": rows } }, svg);
    const cat = c.catMap.get(node.cat);
    graph.append(h("div", { class: "center", style: { "--c": cat.color } },
      h("b", null, node.title), h("small", null, node.sub)));
    const showWhy = edge => {
      const k = App.KINDS[edge.kind];
      whyEl.replaceChildren(h("b", { style: { color: k.color } }, k.label + "："), edge.why);
    };
    shown.forEach(({ id, edge }, i) => {
      const m = c.nodeMap.get(id), cat = c.catMap.get(m.cat), k = App.KINDS[edge.kind];
      const left = i % 2 === 0, row = Math.floor(i / 2) + 1;
      const line = h("line", { svg: true, class: "e", x1: left ? 31 : 69, y1: row - .5,
        x2: 50, y2: rows / 2, "vector-effect": "non-scaling-stroke",
        style: { stroke: k.color, "--i": i }, "stroke-dasharray": edge.kind === "contrast" ? "6 5" : null });
      line.addEventListener("mouseenter", () => showWhy(edge));
      svg.append(line);
      const link = h("a", { class: "n", href: App.nodeUrl(c, id), "aria-label": m.title + "，" + k.label,
        style: { "grid-column": left ? 1 : 3, "grid-row": row, "--c": cat.color, "--i": i },
        onkeydown(e) { if (e.key === " ") { e.preventDefault(); e.currentTarget.click(); } },
        onmouseenter() { showWhy(edge); line.classList.add("highlight"); },
        onmouseleave() { line.classList.remove("highlight"); },
        onfocus() { showWhy(edge); }
      }, m.title);
      graph.append(link);
    });
    const kinds = [...new Set(shown.map(x => x.edge.kind))];
    graph.addEventListener("mouseleave", () => whyEl.replaceChildren(hint));
    return h("div", { class: "card ego" }, graph, whyEl,
      h("div", { class: "legend" }, kinds.map(k => h("span", { style: { "--k": App.KINDS[k].color } }, h("i"), App.KINDS[k].label))));
  }

  App.mapTab = function mapTab(body, c) {
    const scroll = h("div", { class: "chap-scroll" });
    const side = h("aside", { class: "map-side", "aria-label": "知识点详情" });
    const filter = h("input", { type: "search", placeholder: "筛选知识点", "aria-label": "筛选知识点" });
    const chips = new Map();
    let active = null;

    const left = h("div", null, h("label", { class: "field map-filter" }, icon("search"), filter), c.cats.map(cat => {
      const ns = c.nodes.filter(n => n.cat === cat.id);
      return h("section", { class: "cat-block", style: { "--c": cat.color } },
        h("div", { class: "cat-h" }, h("i"), h("h3", null, cat.label), h("small", null, cat.desc + " · " + ns.length + " 个")),
        h("div", { class: "node-grid" }, ns.map(n => {
          const chip = h("button", { type: "button", class: "node-chip", style: { "--c": cat.color }, onclick: () => { location.hash = App.nodeUrl(c, n.id); } },
            h("b", null, n.title, n.core ? h("span", { class: "core" }, "★") : null),
            h("small", null, n.sub),
            h("span", { class: "qn" }, c.nodeQs.get(n.id).length + " 题"));
          chips.set(n.id, chip);
          return chip;
        })));
    }));
    filter.addEventListener("input", () => {
      const ws = App.words(filter.value);
      for (const n of c.nodes) {
        const t = App.norm(n.title + n.sub + n.what);
        chips.get(n.id).classList.toggle("dim", !ws.every(w => t.includes(w)));
      }
    });

    function select(id, fromLink) {
      const node = c.nodeMap.get(id) || c.nodes.reduce((a, b) => c.nbrs.get(b.id).length > c.nbrs.get(a.id).length ? b : a);
      active = node;
      const near = new Set(c.nbrs.get(node.id).map(x => x.id));
      for (const [nid, chip] of chips) {
        chip.classList.toggle("active", nid === node.id);
        chip.classList.toggle("near", near.has(nid));
      }
      const cat = c.catMap.get(node.cat);
      const qs = c.nodeQs.get(node.id);
      const nearQs = qs.length ? [] : [...near].flatMap(n => c.nodeQs.get(n)).slice(0, 6);
      const cross = App.crossTopics(c, node);
      side.replaceChildren(ego(c, node), h("section", { class: "card panel node-info" },
        h("div", { class: "tags" },
          h("span", { class: "tag cat", style: { "--c": cat.color } }, cat.label), node.core ? h("span", { class: "tag core" }, "核心") : null),
        h("h3", { class: "t" }, node.title), h("div", { class: "sub" }, node.sub),
        node.what ? h("p", null, node.what) : null,
        node.take ? h("p", { class: "take" }, h("b", null, "面试抓手"), node.take) : null,
        h("h4", null, qs.length ? `对应题目 · ${qs.length}` : "相邻知识点的题目"),
        h("div", { class: "mini-list" }, (qs.length ? qs : nearQs).map(q =>
          h("a", { class: "mini-item", href: App.qUrl(q) }, h("small", null, "第 " + q.no + " 题"), h("span", null, q.t)))),
        cross.length ? h("div", null, h("h4", null, "跨章关联"),
          h("div", { class: "mini-list" }, cross.map(({ chapter, node, why }) =>
            h("a", { class: "mini-item", href: App.nodeUrl(chapter, node.id) }, h("small", null, chapter.name),
              h("span", null, h("b", null, node.title), h("br"), why))))) : null));
      if (fromLink) chips.get(node.id).scrollIntoView({ block: "nearest" });
      if (matchMedia("(max-width: 1100px)").matches) scroll.scrollTo({ top: 0, behavior: "smooth" });
    }

    scroll.append(h("div", { class: "map-wrap" }, left, side));
    body.append(scroll);
    let first = true;
    return {
      update(arg) { select(arg ? decodeURIComponent(arg) : null, first && !!arg); first = false; },
      current: () => active
    };
  };
})();
