/**
 * A layer written as a patch (item 17+++, part G): the new markup is parsed off the page, and only the elements and
 * attributes that differ from what stands are changed, so a season that changes a few provinces' colours restyles and
 * repaints those few, not the whole layer. On a slow phone a layer written whole cost its style recalculation, layerization
 * and repaint, 60 ms and more after the draw itself. What stands afterwards is the markup given, element for element
 * (and whether each is drawn, `data-out`, as the renderer last set it).
 */

/** Patches `live`'s children to be `html`'s, parsed in `live`'s own namespace. */
export function patch(live: Element, html: string): void {
  const next = live.cloneNode(false) as Element;
  next.innerHTML = html;
  patchChildren(live, next);
}

/**
 * The same patch in slices (#666): it stops after the markup is parsed and after each of the layer's own children, for the
 * caller to go on in a later frame. What stands, if it is never gone on with, is the markup patched in part.
 */
export function* patchSteps(live: Element, html: string): Generator<void> {
  const next = live.cloneNode(false) as Element;
  next.innerHTML = html;
  yield;
  yield* patchChildrenSteps(live, next);
}

/** Makes `live`'s attributes those of `next`, keeping whether it is drawn (`data-out`, set by the renderer: map/in-view.ts). */
function attributes(live: Element, next: Element): void {
  const want = next.attributes;
  for (let i = 0; i < want.length; i++) {
    const a = want[i];
    if (live.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value);
  }
  const have = live.attributes;
  if (have.length === want.length) return;
  for (let i = have.length - 1; i >= 0; i--) {
    const name = have[i].name;
    if (name !== "data-out" && !next.hasAttribute(name)) live.removeAttribute(name);
  }
}

/** An element's `nodeType` (`Node.ELEMENT_NODE`). */
const Element_ = 1;

/**
 * Makes one of `next`'s children (`b`) what stands in its place under `live` (`a`, null past the last): patched in place where
 * the same kind of node stands, `b` itself moved in elsewhere. Gives the child of `live` after it.
 */
function patchOne(live: Node, a: Node | null, b: Node): Node | null {
  if (a === null) {
    live.appendChild(b);
    return null;
  }
  if (a.nodeType === b.nodeType && a.nodeName === b.nodeName) {
    if (a.nodeType === Element_) {
      attributes(a as Element, b as Element);
      patchChildren(a, b);
    } else if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return a.nextSibling;
  }
  live.replaceChild(b, a);
  return b.nextSibling;
}

/** Takes away what stands from `a` on. */
function removeFrom(live: Node, a: Node | null): void {
  while (a !== null) {
    const following = a.nextSibling;
    live.removeChild(a);
    a = following;
  }
}

/** Makes `live`'s children `next`'s, in place where the same kind of node stands, moving `next`'s own nodes in elsewhere. */
export function patchChildren(live: Node, next: Node): void {
  let a: Node | null = live.firstChild;
  let b: Node | null = next.firstChild;
  while (b !== null) {
    const following = b.nextSibling;
    a = patchOne(live, a, b);
    b = following;
  }
  removeFrom(live, a);
}

/** `patchChildren`, stopping after each child of `next` written (only: what stands within a child is patched whole). */
export function* patchChildrenSteps(live: Node, next: Node): Generator<void> {
  let a: Node | null = live.firstChild;
  let b: Node | null = next.firstChild;
  while (b !== null) {
    const following = b.nextSibling;
    a = patchOne(live, a, b);
    b = following;
    yield;
  }
  removeFrom(live, a);
}

/** A layer written in parts: each part's markup and tooltips as last written, and the element it made (null for an empty part). */
export interface Parts {
  markup: string[];
  nodes: (Element | null)[];
  tips: (readonly string[])[];
}

/** A part of a layer: its markup, its tooltips (`<title>`) left empty, and their texts in the order they stand. */
export interface Part {
  markup: string;
  tips: readonly string[];
}

const sameTips = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Writes a layer whose children are parts (each one element, or nothing): only the parts whose markup changed are parsed,
 * and each is patched onto the element standing (put in place where none stands) (part G: the works at the cities, a few
 * of which change in a season); the tooltips are written into the elements standing, never parsed (#666: a granary's
 * tooltip changes every season). It stops after each part written anew, for the caller to go on in a later frame, and gives
 * whether a part was written anew when it ends; a tooltip moves nothing on the map.
 */
export function* patchParts(live: Element, was: Parts, parts: readonly Part[]): Generator<void, boolean> {
  const scratch = resetParts(live, was, parts);
  let wrote = false;
  for (let i = parts.length - 1; i >= 0; i--)
    if (patchPart(live, was, parts[i], i, scratch)) {
      wrote = true;
      yield;
    }
  return wrote;
}

/** A layer whose parts are not those it was written with is emptied; gives the scratch element parts are parsed under. */
function resetParts(live: Element, was: Parts, parts: readonly Part[]): Element {
  if (was.markup.length !== parts.length) {
    live.textContent = "";
    was.markup = parts.map(() => "");
    was.nodes = parts.map(() => null);
    was.tips = parts.map(() => []);
  }
  return live.cloneNode(false) as Element;
}

/** Writes part `i`: gives whether its markup was written anew. */
function patchPart(live: Element, was: Parts, { markup, tips }: Part, i: number, scratch: Element): boolean {
  let wrote = false;
  if (was.markup[i] !== markup) {
    wrote = true;
    scratch.innerHTML = markup;
    let made = scratch.firstElementChild;
    const old = was.nodes[i];
    if (old !== null && made !== null && old.nodeName === made.nodeName) {
      // Patched where it stands (#666: put in anew, a city's marks were restyled and laid out whole when one changed).
      attributes(old, made);
      patchChildren(old, made);
      made = old;
    } else if (old !== null) old.remove();
    if (made !== null && made !== old) {
      // Before the next part standing: the parts are walked from the last, so every later one is in place.
      let before: Element | null = null;
      for (let j = i + 1; j < was.nodes.length && before === null; j++) before = was.nodes[j];
      live.insertBefore(made, before);
    }
    was.markup[i] = markup;
    was.nodes[i] = made;
    was.tips[i] = [];
  }
  const node = was.nodes[i];
  if (node === null || sameTips(was.tips[i], tips)) return wrote;
  const slots = node.querySelectorAll("title");
  tips.forEach((text, k) => {
    const slot = slots[k];
    if (slot !== undefined && slot.textContent !== text) slot.textContent = text;
  });
  was.tips[i] = tips;
  return wrote;
}
