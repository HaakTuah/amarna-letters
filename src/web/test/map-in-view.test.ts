import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { InView, type Area } from "../src/map/in-view.ts";

// #666: the marks and pieces far off the view are left out of the drawing. A stand-in for the few DOM calls the marking
// makes (the suite runs without a browser).
class Mark {
  readonly attrs = new Map<string, string>();
  readonly kids: Mark[] = [];
  parent: Mark | null = null;
  readonly tagName: string;
  readonly classes: Set<string>;
  constructor(tagName: string, attrs: Record<string, string> = {}, ...kids: Mark[]) {
    this.tagName = tagName;
    for (const [k, v] of Object.entries(attrs)) this.attrs.set(k, v);
    this.classes = new Set((attrs.class ?? "").split(" ").filter((c) => c !== ""));
    for (const k of kids) {
      k.parent = this;
      this.kids.push(k);
    }
  }
  get firstElementChild(): Mark | null {
    return this.kids[0] ?? null;
  }
  get nextElementSibling(): Mark | null {
    const k = this.parent?.kids ?? [];
    return k[k.indexOf(this) + 1] ?? null;
  }
  getAttribute(n: string): string | null {
    return this.attrs.get(n) ?? null;
  }
  hasAttribute(n: string): boolean {
    return this.attrs.has(n);
  }
  toggleAttribute(n: string, on: boolean): void {
    if (on) this.attrs.set(n, "");
    else this.attrs.delete(n);
  }
  contains(other: Mark): boolean {
    for (let n: Mark | null = other; n !== null; n = n.parent) if (n === this) return true;
    return false;
  }
  get classList(): { contains: (c: string) => boolean } {
    return { contains: (c) => this.classes.has(c) };
  }
}
const at = (x: number, y: number, cls = "city"): Mark => new Mark("g", { class: cls, transform: `translate(${x},${y})` });
const piece = (x: number, y: number): Mark => new Mark("g", { class: "unit", style: `transform:translate(${x}px,${y}px);--ring:3` });
const out = (m: Mark): boolean => m.hasAttribute("data-out");
// A view 100 units square at 2 screen pixels a unit: its margin is 10 units a side, a name's reach 100 (200 px), a city's 25
// (50 px), a path's stroke 10 (20 px).
const view = (x0: number, y0: number, k = 2): Area => ({ x0, y0, x1: x0 + 100, y1: y0 + 100, k });

describe("What is drawn follows the view", () => {
  test("a mark is left out only past the view, its margin and a mark's reach; a group with no place of its own is looked into", () => {
    const near = at(205, 50, "lab"), far = at(215, 50, "lab"), inside = at(50, 50), shape = new Mark("path", { d: "M0,0a5,5 0 0 1 900,900" });
    const city = at(140, 50), closer = at(130, 50);
    const deep = at(-300, -300);
    const layer = new Mark("g", {}, near, far, inside, shape, city, closer, new Mark("g", { class: "xmarks" }, deep));
    const cull = new InView(() => [layer as unknown as Element], new Set());
    cull.look(view(0, 0));
    Assert.false(out(near), "within a name's reach of the margin");
    Assert.true(out(far), "past it");
    Assert.true(out(city), "a city reaches less far");
    Assert.false(out(closer), "within a city's reach");
    Assert.false(out(inside), "in view");
    Assert.false(out(shape), "a shape with no place of its own is kept whole");
    Assert.true(out(deep), "a mark inside a group");
    // The view moves towards it: in, in the same pass.
    cull.look(view(100, 0));
    Assert.false(out(far), "the view came to it");
    Assert.true(out(deep), "still far");
  });

  test("a path of points is placed by its bounds; a path with arcs or relative steps, or turned, is kept whole", () => {
    const road = new Mark("path", { class: "road-net", d: "M400,10L450,20Q470,30 480,60" });
    const long = new Mark("path", { class: "road-net", d: "M-500,50C0,50 300,50 800,50" });
    const arc = new Mark("path", { d: "M400,10a5,5 0 0 1 10,0" });
    const turned = new Mark("path", { d: "M400,10L450,20", transform: "rotate(5)" });
    const layer = new Mark("g", {}, road, long, arc, turned);
    const cull = new InView(() => [layer as unknown as Element], new Set());
    cull.look(view(0, 0));
    Assert.true(out(road), "all of it far off");
    Assert.false(out(long), "it crosses the view");
    Assert.false(out(arc), "arcs: no box read");
    Assert.false(out(turned), "turned: no box read");
  });

  test("a view inside what is drawn makes no pass until it leaves it, or settles", () => {
    const m = at(250, 50, "lab");
    const layer = new Mark("g", {}, m);
    const cull = new InView(() => [layer as unknown as Element], new Set());
    cull.look(view(0, 0));
    Assert.true(out(m), "far");
    // Drawn: -10 to 110. A view at 5 lies inside it: no pass, so a mark moved near is not looked at until a pass.
    m.attrs.set("transform", "translate(60,50)");
    cull.look(view(5, 0));
    Assert.true(out(m), "no pass while the view is inside what is drawn");
    cull.look(view(5, 0), true);
    Assert.false(out(m), "the view settled: drawn for it exactly");
  });

  test("a piece sliding from where it stood stays drawn until it arrives; a marching one always", () => {
    const u = piece(50, 50), m = piece(400, 400);
    m.classes.add("marching");
    const layer = new Mark("g", {}, u, m);
    const cull = new InView(() => [layer as unknown as Element], new Set());
    cull.look(view(0, 0));
    Assert.false(out(u), "in view");
    Assert.false(out(m), "marching");
    u.attrs.set("style", "transform:translate(500px,500px);--ring:3");
    cull.pass([layer as unknown as Element]);
    Assert.false(out(u), "slides from where it stood in view");
    cull.arrived(u as unknown as Element);
    Assert.true(out(u), "arrived far off the view");
    // From one side of the view to the other, both ends far off it: its slide crosses the view.
    const across = piece(-400, 50);
    layer.kids.push(Object.assign(across, { parent: layer }));
    cull.pass([layer as unknown as Element]);
    Assert.true(out(across), "standing far off");
    across.attrs.set("style", "transform:translate(500px,50px);--ring:3");
    cull.pass([layer as unknown as Element]);
    Assert.false(out(across), "its slide crosses the view");
    // Moved again before it arrived, to another place far off: it stands somewhere along its first slide still.
    across.attrs.set("style", "transform:translate(600px,50px);--ring:3");
    cull.pass([layer as unknown as Element]);
    Assert.false(out(across), "still on its way across the view");
    cull.arrived(across as unknown as Element);
    Assert.true(out(across), "arrived far off");
  });

  test("a layer written outside the drawings that follow the view is never looked into", () => {
    const ground = new Mark("g", {}, new Mark("path", { d: "M900,900L950,950" }));
    const cull = new InView(() => [new Mark("svg") as unknown as Element], new Set());
    cull.look(view(0, 0));
    cull.pass([ground as unknown as Element]);
    Assert.false(out(ground.kids[0]), "nothing would bring it back");
  });

  test("with reduced motion no piece slides: it is placed where it stands", () => {
    const u = piece(50, 50);
    const layer = new Mark("g", {}, u);
    const cull = new InView(() => [layer as unknown as Element], new Set(), () => false);
    cull.look(view(0, 0));
    u.attrs.set("style", "transform:translate(500px,500px);--ring:3");
    cull.pass([layer as unknown as Element]);
    Assert.true(out(u), "far off at once");
  });

  test("layers kept whole are never looked into, as a root or within one", () => {
    const arrow = at(900, 900, "capture");
    const moves = new Mark("g", {}, arrow);
    const sheet = new Mark("svg", {}, moves);
    const cull = new InView(() => [sheet as unknown as Element], new Set([moves as unknown as Element]));
    cull.look(view(0, 0));
    cull.pass([moves as unknown as Element]);
    Assert.false(out(arrow), "kept");
  });
});
