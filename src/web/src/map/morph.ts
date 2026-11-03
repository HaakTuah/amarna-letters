/**
 * A layer written as a patch (item 17+++, part G): the new markup is parsed off the page, and only the elements and
 * attributes that differ from what stands are changed, so a season that changes a few provinces' colours restyles and
 * repaints those few, not the whole layer. On a slow phone a layer written whole cost its style recalculation, layerization
 * and repaint, 60 ms and more after the draw itself. What stands afterwards is the markup given, element for element.
 */

/** Patches `live`'s children to be `html`'s, parsed in `live`'s own namespace. */
export function patch(live: Element, html: string): void {
  const next = live.cloneNode(false) as Element;
  next.innerHTML = html;
  patchChildren(live, next);
}

/** Makes `live`'s attributes those of `next`. */
function attributes(live: Element, next: Element): void {
  const want = next.attributes;
  for (let i = 0; i < want.length; i++) {
    const a = want[i];
    if (live.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value);
  }
  const have = live.attributes;
  if (have.length === want.length) return;
  for (let i = have.length - 1; i >= 0; i--) if (!next.hasAttribute(have[i].name)) live.removeAttribute(have[i].name);
}

/** An element's `nodeType` (`Node.ELEMENT_NODE`). */
const Element_ = 1;

/** Makes `live`'s children `next`'s, in place where the same kind of node stands, moving `next`'s own nodes in elsewhere. */
export function patchChildren(live: Node, next: Node): void {
  let a = live.firstChild;
  let b = next.firstChild;
  while (b !== null) {
    const following = b.nextSibling;
    if (a === null) live.appendChild(b);
    else if (a.nodeType === b.nodeType && a.nodeName === b.nodeName) {
      if (a.nodeType === Element_) {
        attributes(a as Element, b as Element);
        patchChildren(a, b);
      } else if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
      a = a.nextSibling;
    } else {
      live.replaceChild(b, a);
      a = b.nextSibling;
    }
    b = following;
  }
  while (a !== null) {
    const following = a.nextSibling;
    live.removeChild(a);
    a = following;
  }
}

/** A layer written in parts: each part's markup as last written, and the element it made (null for an empty part). */
export interface Parts {
  markup: string[];
  nodes: (Element | null)[];
}

/**
 * Writes a layer whose children are parts (each one element, or nothing): only the parts whose markup changed are parsed
 * and put in place (part G: the works at the cities, a few of which change in a season). Gives whether anything was written.
 */
export function patchParts(live: Element, was: Parts, markup: readonly string[]): boolean {
  if (was.markup.length !== markup.length) {
    live.textContent = "";
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
    if (old !== null) old.remove();
    if (made !== null) {
      // Before the next part standing: the parts are walked from the last, so every later one is in place.
      let before: Element | null = null;
      for (let j = i + 1; j < was.nodes.length && before === null; j++) before = was.nodes[j];
      live.insertBefore(made, before);
    }
    was.markup[i] = markup[i];
    was.nodes[i] = made;
  }
  return wrote;
}
