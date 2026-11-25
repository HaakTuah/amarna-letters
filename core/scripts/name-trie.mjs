// The files whose names a text holds, in one pass over the text whatever the count of names (select.mjs, "links"; #881):
// a trie of the names, walked from each place in the text a name could start at. It answers what a regular expression of
// each name did, `(^|[^\w-])name(?![\w-])`, one for each name tried on each text, which took time in step with the count
// of names times the count of texts. Node's own modules: none.

/** The trie of `entries`, [name, file] pairs, a name that stands for several files holding all of them. */
export function nameTrie(entries) {
  const root = { next: new Map(), files: null };
  for (const [name, file] of entries) {
    if (!name) continue;
    let node = root;
    for (let i = 0; i < name.length; i++) {
      let next = node.next.get(name[i]);
      if (!next) node.next.set(name[i], (next = { next: new Map(), files: null }));
      node = next;
    }
    (node.files ??= []).push(file);
  }
  return root;
}

/** Whether a character may stand next to a name that is a word: `before` the one a name may not follow, `after` the one
 *  that may not follow it, as the regular expressions' `[\w-]` (a name) and `[\w.]`, `\w` (a Python module's dotted name). */
export const WORDS = {
  name: { before: c => /[\w-]/u.test(c), after: c => /[\w-]/u.test(c) },
  dotted: { before: c => /[\w.]/u.test(c), after: c => /\w/u.test(c) },
};

/** The files whose name `trie` holds that `text` holds as a word: starting at its start or after a character that is no
 *  part of one (`words.before`), and followed by its end or by one that is none (`words.after`). The walk from each start
 *  goes as deep as the names it follows, so `pace` is asked every 4096 starts, to stop a text of many starts over long
 *  names (it throws where it must stop). */
export function mentioned(trie, text, words, pace = () => {}) {
  const found = new Set();
  for (let at = 0; at < text.length; at++) {
    if ((at & 4095) === 0) pace();
    if (at > 0 && words.before(text[at - 1])) continue;
    let node = trie;
    for (let i = at; i < text.length; i++) {
      node = node.next.get(text[i]);
      if (!node) break;
      if (node.files && (i + 1 === text.length || !words.after(text[i + 1]))) for (const f of node.files) found.add(f);
    }
  }
  return found;
}
