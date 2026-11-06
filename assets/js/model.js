"use strict";
(() => {
  const COLORS = {
    basics: "#5b8cc2", collections: "#4f9a8e", concurrency: "#8e7cc3", jvm: "#d97757", spring: "#7d9a55",
    mysql: "#477da5", redis: "#bd6362", mq: "#ad813e"
  };
  App.KINDS = {
    base: { label: "基础依赖", color: "#8f8b7f" },
    impl: { label: "实现关系", color: "#5b8cc2" },
    shared: { label: "共享原理", color: "#4f9a8e" },
    deep: { label: "深入追问", color: "#8e7cc3" },
    contrast: { label: "对比区别", color: "#cc6b55" },
    apply: { label: "工程应用", color: "#c99139" },
    main: { label: "主线", color: "#d97757" }
  };

  const chapters = App.chapters = window.QBANK.chapters;
  App.byId = new Map();
  App.byKey = new Map();
  App.all = [];

  for (const c of chapters) {
    c.color = COLORS[c.id] || "#3467d6";
    c.nodeMap = new Map(c.nodes.map(n => [n.id, n]));
    c.catMap = new Map(c.cats.map(k => [k.id, k]));
    c.nodeQs = new Map(c.nodes.map(n => [n.id, []]));
    c.nbrs = new Map(c.nodes.map(n => [n.id, []]));
    for (const e of c.edges) {
      c.nbrs.get(e.a).push({ id: e.b, edge: e });
      c.nbrs.get(e.b).push({ id: e.a, edge: e });
    }
    c.questions.forEach((q, i) => {
      q.i = i;
      q.no = i + 1;
      q.c = c;
      q.key = c.id + ":" + q.no;
      q.n = c.nodeMap.get(q.node);
      q.cat = c.catMap.get(q.n.cat);
      q.text = App.norm([q.t, q.s, q.interview, ...q.d, q.ex, q.pit, q.code].join(" "));
      q.tTitle = App.norm(q.t);
      q.tNode = App.norm(q.n.title + " " + q.n.sub);
      c.nodeQs.get(q.node).push(q);
      App.byKey.set(q.key, q);
      App.all.push(q);
    });
    App.byId.set(c.id, c);
  }

  const bridges = window.QBANK.bridges || [];
  const crossTopics = new Map();
  for (const { a, b, why } of bridges) {
    for (const [from, to] of [[a, b], [b, a]]) {
      const [cid, nid] = to.split(":");
      const chapter = App.byId.get(cid);
      const link = { chapter, node: chapter.nodeMap.get(nid), why };
      if (!crossTopics.has(from)) crossTopics.set(from, []);
      crossTopics.get(from).push(link);
    }
  }
  App.bridgeCount = bridges.length;
  App.crossTopics = (c, node) => crossTopics.get(c.id + ":" + node.id) || [];

  App.qUrl = q => "#/c/" + q.c.id + "/q/" + q.no;
  App.nodeUrl = (c, nodeId) => "#/c/" + c.id + "/map/" + encodeURIComponent(nodeId);
  App.qLabel = q => q.c.name + " · " + String(q.no).padStart(2, "0");

  App.related = function related(q, limit = 6) {
    const c = q.c, out = [], seen = new Set([q.i]);
    const add = (x, why) => { if (!seen.has(x.i) && out.length < limit) { seen.add(x.i); out.push({ q: x, why }); } };
    for (const i of q.f) add(c.questions[i], "延伸追问");
    for (const x of c.nodeQs.get(q.node)) add(x, "同一知识点");
    for (const { id, edge } of c.nbrs.get(q.node)) {
      for (const x of c.nodeQs.get(id)) add(x, App.KINDS[edge.kind].label + " · " + c.nodeMap.get(id).title);
    }
    return out;
  };

  App.routeQuestions = function routeQuestions(c, route) {
    return route.nodes.flatMap(id => c.nodeQs.get(id));
  };

  App.sectionCounts = function sectionCounts(c) {
    const counts = c.sections.map(() => 0);
    for (const q of c.questions) counts[q.sec]++;
    return counts;
  };
})();
