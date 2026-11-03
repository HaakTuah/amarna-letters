import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { patchChildren, patchParts, type Parts } from "../src/map/morph.ts";

// Item 17+++, part G: a map layer is patched, not written whole, so a season restyles only what changed. A stand-in for the
// few DOM calls the patch makes (the suite runs without a browser), counting the writes.
class FakeNode {
  parentNode: FakeNode | null = null;
  kids: FakeNode[] = [];
  attrs = new Map<string, string>();
  readonly nodeType: number;
  readonly nodeName: string;
  nodeValue: string | null;
  constructor(nodeType: number, nodeName: string, nodeValue: string | null = null) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.nodeValue = nodeValue;
  }
  get firstChild(): FakeNode | null {
    return this.kids[0] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const k = this.parentNode?.kids ?? [];
    return k[k.indexOf(this) + 1] ?? null;
  }
  get attributes(): { name: string; value: string }[] {
    return [...this.attrs].map(([name, value]) => ({ name, value }));
  }
  getAttribute(n: string): string | null {
    return this.attrs.get(n) ?? null;
  }
  hasAttribute(n: string): boolean {
    return this.attrs.has(n);
  }
  setAttribute(n: string, v: string): void {
    writes.push(`set ${n}`);
    this.attrs.set(n, v);
  }
  removeAttribute(n: string): void {
    writes.push(`remove ${n}`);
    this.attrs.delete(n);
  }
  private detach(c: FakeNode): void {
    if (c.parentNode !== null) c.parentNode.kids.splice(c.parentNode.kids.indexOf(c), 1);
  }
  appendChild(c: FakeNode): void {
    writes.push(`append ${c.nodeName}`);
    this.detach(c);
    c.parentNode = this;
    this.kids.push(c);
  }
  replaceChild(c: FakeNode, old: FakeNode): void {
    writes.push(`replace ${old.nodeName} by ${c.nodeName}`);
    this.detach(c);
    this.kids[this.kids.indexOf(old)] = c;
    c.parentNode = this;
    old.parentNode = null;
  }
  removeChild(c: FakeNode): void {
    writes.push(`remove ${c.nodeName}`);
    this.detach(c);
    c.parentNode = null;
  }
  // What patchParts uses besides: a part's markup is parsed here as one element named by it (empty: none).
  cloneNode(): FakeNode {
    return new FakeNode(this.nodeType, this.nodeName);
  }
  set innerHTML(markup: string) {
    writes.push(`parse ${markup}`);
    this.kids = markup === "" ? [] : [new FakeNode(1, markup)];
    for (const k of this.kids) k.parentNode = this;
  }
  set textContent(_: string) {
    this.kids = [];
  }
  get firstElementChild(): FakeNode | null {
    return this.kids[0] ?? null;
  }
  remove(): void {
    writes.push(`remove ${this.nodeName}`);
    this.parentNode?.detach(this);
    this.parentNode = null;
  }
  insertBefore(c: FakeNode, before: FakeNode | null): void {
    writes.push(`insert ${c.nodeName}`);
    this.detach(c);
    c.parentNode = this;
    if (before === null) this.kids.push(c);
    else this.kids.splice(this.kids.indexOf(before), 0, c);
  }
}
let writes: string[] = [];

/** A tree from a nested description: [name, attributes, ...children], or a string for a text node. */
type Spec = string | [string, Record<string, string>, ...Spec[]];
function build(spec: Spec): FakeNode {
  if (typeof spec === "string") return new FakeNode(3, "#text", spec);
  const [name, attrs, ...kids] = spec;
  const n = new FakeNode(1, name);
  for (const [k, v] of Object.entries(attrs)) n.attrs.set(k, v);
  for (const k of kids) {
    const c = build(k);
    c.parentNode = n;
    n.kids.push(c);
  }
  return n;
}
const show = (n: FakeNode): string =>
  n.nodeType === 3 ? n.nodeValue ?? "" : `<${n.nodeName}${[...n.attrs].map(([k, v]) => ` ${k}="${v}"`).join("")}>${n.kids.map(show).join("")}</${n.nodeName}>`;
const patched = (live: FakeNode, next: FakeNode): void => patchChildren(live as unknown as Node, next as unknown as Node);

describe("A layer patched", () => {
  test("only what differs is written, and the layer ends as the new markup", () => {
    const tint = (id: string, cls: string, text: string): Spec => ["path", { class: cls, d: `M${id}`, "data-province": id }, ["title", {}, text]];
    const live = build(["g", {}, ["g", { class: "politics" }, tint("a", "tint t-eg", "A: held by Egypt"), tint("b", "tint free", "B: held by no one"), tint("c", "tint t-ha", "C: held by Hatti")]]);
    const next = build(["g", {}, ["g", { class: "politics" }, tint("a", "tint t-eg", "A: held by Egypt"), tint("b", "tint t-ha", "B: held by Hatti"), tint("c", "tint t-ha", "C: held by Hatti")]]);
    const kept = live.kids[0].kids[0];
    writes = [];
    patched(live, next);
    Assert.equal(show(next), show(live));
    // One class and one tooltip changed: nothing else is touched, and the unchanged province is the same element.
    Assert.equal("set class", writes.join(", "));
    Assert.true(live.kids[0].kids[0] === kept, "the unchanged path is kept");
  });

  test("elements added, removed, of another kind, and attributes dropped", () => {
    const live = build(["g", {}, ["path", { class: "veil-1", fill: "url(#fog)" }], ["path", { class: "veil-2" }], ["text", {}, "as of"]]);
    const next = build(["g", {}, ["path", { class: "veil-1" }], ["g", { class: "fogdates" }, "x"], ["text", {}, "as of"], ["path", { class: "veil-3" }]]);
    writes = [];
    patched(live, next);
    Assert.equal(show(build(["g", {}, ["path", { class: "veil-1" }], ["g", { class: "fogdates" }, "x"], ["text", {}, "as of"], ["path", { class: "veil-3" }]])), show(live));
    Assert.equal("remove fill, replace path by g, append path", writes.join(", "));
    // Emptied.
    writes = [];
    patched(live, build(["g", {}]));
    Assert.equal("<g></g>", show(live));
    Assert.equal(4, writes.length);
  });

  test("a layer in parts parses only the parts that changed, each in its place", () => {
    const live = new FakeNode(1, "g");
    const was: Parts = { markup: [], nodes: [] };
    const write = (parts: string[]): boolean => patchParts(live as unknown as Element, was, parts);
    Assert.true(write(["a", "", "c"]), "first written");
    Assert.equal("a,c", live.kids.map((k) => k.nodeName).join(","));
    writes = [];
    Assert.true(!write(["a", "", "c"]), "nothing changed, nothing written");
    Assert.equal(0, writes.length);
    // A part appears between two standing ones, and another changes: only those two are parsed.
    Assert.true(write(["a", "b", "c2"]), "written");
    Assert.equal("a,b,c2", live.kids.map((k) => k.nodeName).join(","));
    Assert.equal("parse c2, remove c, insert c2, parse b, insert b", writes.join(", "));
    // A part emptied; then a different number of parts writes the layer anew.
    write(["a", "", "c2"]);
    Assert.equal("a,c2", live.kids.map((k) => k.nodeName).join(","));
    write(["x"]);
    Assert.equal("x", live.kids.map((k) => k.nodeName).join(","));
    write([]);
    Assert.equal(0, live.kids.length);
  });
});
