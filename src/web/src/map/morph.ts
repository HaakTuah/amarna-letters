/**
 * A layer written as a patch (item 17+++, part G): the new markup is parsed off the page, and only the elements and
 * attributes that differ from what stands are changed, so a season that changes a few provinces' colours restyles and
 * repaints those few, not the whole layer. On a slow phone a layer written whole cost its style recalculation, layerization
 * and repaint, 60 ms and more after the draw itself. What stands afterwards is the markup given, element for element.
 *
 * A patch is found now and written later (#666): what differs is looked for against the page as it stands, and each change
 * is put on a list of writes, which the renderer makes together in one frame. Every frame that changes the page's markup
 * costs a slow phone its style, layerization and paint, 30 to 50 ms, however small the change, so a season's layers written
 * one a frame made six or seven long frames a season. Nothing here changes the page until the list is run, in order.
 */

/** Changes to the page found now and made later, in the order found. */
export type Writes = (() => void)[];

/** Finds what makes `live`'s children `html`'s, parsed in `live`'s own namespace, and lists the writes on `later`. */
export function patch(live: Element, html: string, later: Writes): void {
  const next = live.cloneNode(false) as Element;
  next.innerHTML = html;
  patchChildren(live, next, later);
}

/** Lists what makes `live`'s attributes those of `next`. */
function attributes(live: Element, next: Element, later: Writes): void {
  const want = next.attributes;
  for (let i = 0; i < want.length; i++) {
    const { name, value } = want[i];
    if (live.getAttribute(name) !== value) later.push(() => live.setAttribute(name, value));
  }
  const have = live.attributes;
  if (have.length === want.length) return;
  for (let i = have.length - 1; i >= 0; i--) {
    const { name } = have[i];
    if (!next.hasAttribute(name)) later.push(() => live.removeAttribute(name));
  }
}

/** An element's `nodeType` (`Node.ELEMENT_NODE`). */
const Element_ = 1;

/**
 * Lists what makes `live`'s children `next`'s: in place where the same kind of node stands, `next`'s own nodes moved in
 * elsewhere. `live` must stand as it is until the writes are made.
 */
export function patchChildren(live: Node, next: Node, later: Writes): void {
  let a = live.firstChild;
  let b = next.firstChild;
  while (b !== null) {
    const made = b;
    const following = b.nextSibling;
    if (a === null) later.push(() => live.appendChild(made));
    else {
      const old = a;
      if (a.nodeType === b.nodeType && a.nodeName === b.nodeName) {
        if (a.nodeType === Element_) {
          attributes(a as Element, b as Element, later);
          patchChildren(a, b, later);
        } else if (a.nodeValue !== b.nodeValue) {
          const text = b.nodeValue;
          later.push(() => (old.nodeValue = text));
        }
      } else later.push(() => live.replaceChild(made, old));
      a = a.nextSibling;
    }
    b = following;
  }
  while (a !== null) {
    const old = a;
    later.push(() => live.removeChild(old));
    a = a.nextSibling;
  }
}

/** A layer written in parts: each part's markup as last written, and the element it made (null for an empty part). */
export interface Parts {
  markup: string[];
  nodes: (Element | null)[];
}

/**
 * Lists the writes of a layer whose children are parts (each one element, or nothing): only the parts whose markup changed
 * are parsed and put in place (part G: the works at the cities, a few of which change in a season). Gives whether anything
 * is to be written. `was` holds the parts as they will stand once the writes are made, so it may be patched again before.
 */
export function patchParts(live: Element, was: Parts, markup: readonly string[], later: Writes): boolean {
  if (was.markup.length !== markup.length) {
    later.push(() => (live.textContent = ""));
    was.markup = markup.map(() => "");
    was.nodes = markup.map(() => null);
  }
  let wrote = false;
  const scratch = live.cloneNode(false) as Element;
  for (let i = markup.length - 1; i >= 0; i--) {
    if (was.markup[i] === markup[i]) continue;
    wrote = true;
    scratch.innerHTML = markup[i];
    const made = scratch.firstElementChild;
    const old = was.nodes[i];
    if (old !== null) later.push(() => old.remove());
    if (made !== null) {
      // Before the next part standing: the parts are walked from the last, so every later one is in place.
      let before: Element | null = null;
      for (let j = i + 1; j < was.nodes.length && before === null; j++) before = was.nodes[j];
      const next = before;
      later.push(() => live.insertBefore(made, next));
    }
    was.markup[i] = markup[i];
    was.nodes[i] = made;
  }
  return wrote;
}
