// The walk over a parsed file's tree that the shape check's readers on the parser share (csharp-tree.mjs,
// javascript-functions.mjs and python-tree.mjs, beside this file): each function found with its name, its body's line
// and lines, the depth its control blocks reach and its branch points, by the reader's own parts; and the limits they
// give the parser, a file's size, its time and its tree's nodes. Node's own modules only: none.

/** The largest file each reader gives its grammar, in characters, by its language: one past it has no functions told,
 *  as a file the grammar cannot read whole has none. SECURITY.md, rule 5, asks a pull request's file read within 5 s,
 *  process and parser started; at these sizes the densest text found (C#'s `f(a,a,…)`, after a chain of casts that
 *  parses just inside the budget, Python's `def f(): x = a,a,…`) takes up to about 3 s through the whole selection on a
 *  4-core 2.1 GHz Xeon, most of C#'s in the walk after the parse, which no budget stops: C#'s `f(a,a,…)` took 2.9 s in
 *  the reader alone at 250,000. A file of code past them is most often data a script wrote, not code someone reads. */
export const LARGEST = { javascript: 500_000, python: 500_000, csharp: 200_000 };

/** How long the grammar may take on `src`, in milliseconds: a second and 4 more for each thousand characters, as
 *  ordinary code is read in time in step with its size, about 1 ms for each thousand characters, and 2 s at most, so
 *  that text the grammar recovers from slowly (C#'s `x;` repeated, past 50 s a megabyte; JavaScript's `/[`, past two
 *  minutes at 600 KB) leaves room in rule 5's 5 s for
 *  the walk after it. A file it cannot read within it has no functions told. */
export const budgetOf = src => Math.min(1000 + src.length / 250, 2000);

/** The most nodes a tree may hold for a reader to walk it, whatever the file's size: one past it has no functions told,
 *  as a file past LARGEST has. The memory a tree takes and the walks after the parse, which no budget stops, grow with
 *  its nodes, not its characters: C#'s braces nested as deep as the grammar goes, or `f(a,a,…)`, hold one to one and a
 *  half nodes for each character, ordinary code (this core's own scripts) about a quarter to a third, so that 500,000
 *  characters of it hold about 150,000 nodes, and a file of data (strings in an array) about half, so that 375,000
 *  characters of it hold 210,000. SECURITY.md, rule 5, names this number; the reader on a tree that holds it, the
 *  densest text found (C#'s `f(a,a,…)`), took about 1.5 s in all on a 4-core 2.1 GHz Xeon, 2 s at 300,000 nodes. */
export const MOST_NODES = 250_000;

/** The tree of `text` in `language` read with the parser's `parse` within `budget` milliseconds, as `parse` gives it;
 *  null, its memory freed, where the parse ran past the budget or the tree holds more than MOST_NODES. The caller frees
 *  a tree it is given with tree.delete(). */
export function parseWithin(parse, language, text, budget) {
  const tree = parse(language, text, budget);
  if (tree && tree.rootNode.descendantCount > MOST_NODES) { tree.delete(); return null; }
  return tree;
}

/** The functions under `root`, in the order their bodies open, as a baseline numbers functions of one name. `parts`
 *  are the reader's: `functionBody(node)`, the body of a node that is a function, else null; `nameOf(node, parent)`;
 *  `branches(node)`, the branch points a node adds; `isControl(node, parent)`, whether it opens a control block; and,
 *  where a function's lines are not its body's, `rowsOf(node, body)`, its first and last rows (from 0); and, where only
 *  some nodes can hold a function, `outside(node)`, whether one outside every function can.
 *  The walk keeps a stack of its own so that no nesting runs out of the call stack: each item a node, its parent, the
 *  function it counts toward (null outside any) and the level of control blocks it stands at. (The parent is carried,
 *  not asked of the node: the parser finds it from the file's root, at a cost that grows with how deep it lies.) */
const bodyRows = (node, body) => [body.startPosition.row, body.endPosition.row];
export function walkFunctions(root, { functionBody, nameOf, branches, isControl, rowsOf = bodyRows, outside = null }) {
  const found = [], stack = [{ node: root, parent: null, fn: null, level: 0 }];
  while (stack.length) {
    const { node, parent, fn, level } = stack.pop();
    const body = functionBody(node);
    if (body) {
      const [first, last] = rowsOf(node, body);
      const own = { name: nameOf(node, parent), line: first + 1, lines: last - first + 1, depth: 0, branches: 0 };
      found.push([body.startIndex, own]);
      // (what stands outside its body, a parameter's default or a lambda passed to C#'s : base(...), counts where the
      // function itself stands, as the lexer read it)
      for (const c of [...node.children].reverse()) push(stack, c.id === body.id ? null : c, node, fn, level);
      push(stack, body, node, own, 0);
      continue;
    }
    // (outside every function, a node no function can lie under, where the reader names them, is passed over whole)
    if (!fn && outside && !outside(node)) continue;
    if (fn) fn.branches += branches(node);
    const inner = isControl(node, parent) ? level + 1 : level;
    if (fn && inner > level) fn.depth = Math.max(fn.depth, inner);
    // (all of a node's children at once: one by one, each costs as many steps as the children before it)
    const children = node.children;
    for (let k = children.length - 1; k >= 0; k--) push(stack, children[k], node, fn, inner);
  }
  // (a lambda passed to C#'s : base(...) opens before its constructor's body)
  return found.sort((a, b) => a[0] - b[0]).map(([, fn]) => fn);
}
const push = (stack, node, parent, fn, level) => { if (node) stack.push({ node, parent, fn, level }); };
