#!/usr/bin/env python3
"""Cut the design document's markdown exports into the repository copy.

The design document (Claude Docs, doc 7f857750-39dc-464a-a739-c9f59dfe3dcd) is the source of intent. It has one
tab per system (TABS below, in the document's order). This script turns the tabs' markdown exports into
docs/intent/<tab>/ (one file per section) and .claude/rules/builder-rules.md (the "Rules for the builder" block in
the Build order tab, which every session loads). Every output file starts with one generated-header line; without
those lines the files of a tab, in manifest order, reproduce its export byte for byte, and the script checks that
before it exits.

File names come from headings, with no position numbers, so a path stays the same until its heading is renamed or
its section moves to another tab; the order lives in docs/intent/manifest.json. After writing, the script checks
that every docs/intent path named in the repository's own docs still exists, and fails if one does not.

Usage (run by whoever refreshes the copy after a design session, never by builders):
  python3 scripts/design-copy.py --exports DIR --rev overview=549 --rev build-order=2 ... --date YYYY-MM-DD
  python3 scripts/design-copy.py --verify DIR    # check an existing copy against the exports in DIR
DIR holds one export per tab, named <tab>.md (Claude Docs `export`, format markdown). Every tab needs a --rev.
A tab added to the document gets a line in TABS (its slug, name and body node id) in the same commit.
"""
import argparse, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'intent')
RULES = os.path.join(ROOT, '.claude', 'rules', 'builder-rules.md')
DOC = '7f857750-39dc-464a-a739-c9f59dfe3dcd'
TABS = [  # (folder, tab name, the tab's body node), in the document's order
    ('overview', 'Overview', '320f0886-6acf'),
    ('build-order', 'Build order', 'f6588701-e47a'),
    ('world-and-history', 'World and history', 'f2f7044b-c6fa'),
    ('engine-and-models', 'Engine and models', '23452eff-9a74'),
    ('diplomacy-and-intelligence', 'Diplomacy and intelligence', '83ac9cba-81ca'),
    ('characters', 'Characters', '0051b400-09bd'),
    ('work-money-and-lending', 'Work, money and lending', '016f3c32-0e2b'),
    ('land-people-and-economy', 'Land, people and economy', '3dedb02f-88dd'),
    ('war-travel-and-the-seas', 'War, travel and the seas', '98ebd607-ce90'),
    ('victory-and-the-ending', 'Victory and the ending', '58b70949-2c17'),
    ('interface-and-the-council', 'Interface and the council', 'ed35e82f-6e5a'),
    ('tests-risks-and-references', 'Tests, risks and references', 'e10064a1-1833'),
    ('ideas', 'Ideas', 'c1a09612-6320'),
]
SPLIT_ABOVE = 30000  # a section above this many bytes is cut into parts of about PART_BYTES, at entry boundaries
PART_BYTES = 22000
REF_GLOBS = ['CLAUDE.md', 'docs', '.claude']  # where references to docs/intent paths are checked


def slug(text, n=64):
    s = re.sub(r'[^a-z0-9]+', '-', text.lower().replace("'", '')).strip('-')
    return s[:n].rstrip('-') or 'section'


def sections(lines):
    """Split into the front matter (before the first '## ') and one chunk per '## ' heading."""
    starts = [i for i, l in enumerate(lines) if l.startswith('## ')]
    if not starts:
        return [('front', lines)]
    chunks = [('front', lines[:starts[0]])]
    for k, i in enumerate(starts):
        j = starts[k + 1] if k + 1 < len(starts) else len(lines)
        chunks.append((lines[i][3:].strip(), lines[i:j]))
    return chunks


def build_order_parts(chunk, done_through):
    """Cut the Build order section: intro, builder rules (to .claude/rules), done items, one file per item, not yet."""
    rules_at = next(i for i, l in enumerate(chunk) if l.startswith('**Rules for the builder.**'))
    order_at = next(i for i, l in enumerate(chunk) if l.startswith('**The order.**'))
    notyet_at = next(i for i, l in enumerate(chunk) if l.startswith('**Not yet in the order,**'))
    item_re = re.compile(r'^\s*(?:(\d+)\.\s+\*\*|\*\*(\d+\+)\.)')
    starts = []
    for i in range(order_at + 1, notyet_at):
        m = item_re.match(chunk[i])
        if m:
            starts.append((i, m.group(1) or m.group(2)))
    parts = [('intro', 'Build order: introduction', chunk[:rules_at]),
             ('RULES', 'Rules for the builder', chunk[rules_at:order_at])]
    first_open = next(k for k, (i, num) in enumerate(starts) if not (num.isdigit() and int(num) <= done_through))
    parts.append((f'items-1-to-{done_through}-done', f'The order: items 1 to {done_through} (built)',
                  chunk[order_at:starts[first_open][0]]))
    for k in range(first_open, len(starts)):
        i, num = starts[k]
        j = starts[k + 1][0] if k + 1 < len(starts) else notyet_at
        title = re.sub(r'\*\*', '', chunk[i].strip()).split('(')[0].strip().rstrip('.')
        parts.append(('item-' + num.replace('+', 'plus'), title[:80], chunk[i:j]))
    parts.append(('not-yet-in-the-order', 'Not yet in the order', chunk[notyet_at:]))
    return parts


def entry_parts(chunk):
    """Cut a long section into parts at entry boundaries (a paragraph that starts with bold text)."""
    size = lambda ls: sum(len(x.encode()) + 1 for x in ls)
    if size(chunk) <= SPLIT_ABOVE:
        return [chunk]
    bounds = [i for i in range(1, len(chunk)) if chunk[i].startswith('**') and chunk[i - 1] == '']
    parts, start = [], 0
    for b in bounds:
        if size(chunk[start:b]) >= PART_BYTES:
            parts.append(chunk[start:b])
            start = b
    parts.append(chunk[start:])
    return parts


def plan(tab, text, done_through):
    lines = text.split('\n')
    out = []  # (relative name, description, lines)
    for title, chunk in sections(lines):
        if title == 'front':
            desc = 'Title, status, how the document relates to the code' if tab == 'overview' else 'Title and what the tab holds'
            out.append((f'{tab}/front', desc, chunk))
        elif tab == 'build-order' and title == 'Build order':
            for name, desc, ls in build_order_parts(chunk, done_through):
                out.append((name if name == 'RULES' else f'{tab}/{name}', desc, ls))
        else:
            ps = entry_parts(chunk)
            for p, ls in enumerate(ps):
                suffix = f'-part{p + 1}' if len(ps) > 1 else ''
                out.append((f'{tab}/{slug(title)}{suffix}', title + (f' (part {p + 1})' if suffix else ''), ls))
    names = [o[0] for o in out]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        sys.exit(f'two sections would share a file name: {sorted(dup)}; rename a heading')
    return out


def header(name, rev, date):
    return (f'<!-- Generated from the design document, {name} tab, revision {rev} ({date}). '
            f'Do not edit: see docs/intent/INDEX.md. -->')


def path_of(name):
    return RULES if name == 'RULES' else os.path.join(OUT, name + '.md')


def read_exports(d):
    texts = {}
    for tab, name, node in TABS:
        p = os.path.join(d, tab + '.md')
        if not os.path.exists(p):
            sys.exit(f'missing export for the {name} tab: {p}')
        texts[tab] = open(p, encoding='utf-8').read()
    extra = sorted(set(f[:-3] for f in os.listdir(d) if f.endswith('.md')) - {t for t, _, _ in TABS})
    if extra:
        print('note: exports not in TABS, ignored:', ', '.join(extra))
    return texts


def write(args):
    texts = read_exports(args.exports)
    revs = dict(r.split('=', 1) for r in args.rev)
    missing = [t for t, _, _ in TABS if t not in revs]
    if missing:
        sys.exit('a --rev is needed for every tab; missing: ' + ', '.join(missing))
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.dirname(RULES), exist_ok=True)
    manifest = {'doc': DOC, 'date': args.date, 'tabs': {}}
    index_rows = []
    for tab, name, node in TABS:
        rev = int(revs[tab])
        items = plan(tab, texts[tab], args.done_through)
        manifest['tabs'][tab] = {'name': name, 'node': node, 'rev': rev, 'files': []}
        for i, (fname, desc, ls) in enumerate(items):
            body = '\n'.join(ls)
            # every chunk but the last ended at a line break that split() consumed
            if i < len(items) - 1:
                body += '\n'
            p = path_of(fname)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w', encoding='utf-8', newline='') as f:
                f.write(header(name, rev, args.date) + '\n' + body)
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            manifest['tabs'][tab]['files'].append(rel)
            index_rows.append((tab, rel, desc, len(body.encode())))
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=1)
        f.write('\n')
    write_index(manifest, index_rows)
    verify(manifest, texts)
    check_references()


def check_references():
    """Fail if a doc in the repository names a docs/intent file that no longer exists."""
    bad = []
    for top in REF_GLOBS:
        base = os.path.join(ROOT, top)
        files = [base] if os.path.isfile(base) else [os.path.join(d, f) for d, _, fs in os.walk(base) for f in fs if f.endswith('.md')]
        for f in files:
            if f.startswith(OUT + os.sep):
                continue
            for n, line in enumerate(open(f, encoding='utf-8'), 1):
                for ref in re.findall(r'docs/intent/[A-Za-z0-9_./+-]+\.md', line):
                    if not os.path.exists(os.path.join(ROOT, ref)):
                        bad.append(f'{os.path.relpath(f, ROOT)}:{n}: {ref}')
    if bad:
        print('References to docs/intent files that no longer exist (fix them):')
        print('\n'.join('  ' + b for b in bad))
        sys.exit(1)
    print('references: all docs/intent paths named in the docs exist')


def write_index(m, rows):
    t = m['tabs']
    L = ['# The design document, copied by section',
         '',
         'Generated by `scripts/design-copy.py`. Do not edit these files: the design document is the source',
         f"(Claude Docs, doc `{m['doc']}`), and the copy is refreshed after each design session.",
         'The document has one tab per system, and the copy one folder per tab.',
         '',
         f"**Cut on {m['date']}.** Each tab's revision is in the table below.",
         '',
         '**Before relying on it,** ask the live document what changed since then in the Build order tab and in the',
         "tabs your item's sections are in (Claude Docs `read`, container",
         f"`{{\"kind\":\"project\",\"id\":\"{m['doc']}\"}}`, engine `prose`, ref `{{\"object\":\"node\",\"id\":\"<node>\"}}`,",
         'payload `{"kind":"view","sinceRev":<rev>}`). Only changed blocks come back. Where they differ from the copy,',
         'the live document wins. If the docs connector is not available (a session on another account, say), go on',
         'with the copy and say so in the report, and before opening the pull request read the copy on `develop` again:',
         '`git fetch origin develop`, then `git diff <the commit the item started from>..origin/develop -- docs/intent .claude/rules`.',
         '',
         '| Tab | Folder | Node | Revision |',
         '| --- | --- | --- | --- |']
    for tab, info in t.items():
        L.append(f"| {info['name']} | `docs/intent/{tab}/` | `{info['node']}` | {info['rev']} |")
    L += ['',
          'Find a section or entry by its title, whichever tab it is in: `grep -rn "Title words" docs/intent .claude/rules`.',
          'Entries start with a bold title. The builder rules are in `.claude/rules/builder-rules.md`, which every',
          'session loads.',
          '',
          '| File | Holds | KB |',
          '| --- | --- | --- |']
    for tab, rel, desc, size in rows:
        L.append(f'| `{rel}` | {desc} | {size / 1000:.1f} |')
    with open(os.path.join(OUT, 'INDEX.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


def verify(m, texts):
    ok = True
    for tab, info in m['tabs'].items():
        got = ''
        for rel in info['files']:
            s = open(os.path.join(ROOT, rel), encoding='utf-8', newline='').read()
            first, _, rest = s.partition('\n')
            if not first.startswith('<!-- Generated from the design document'):
                print('missing header:', rel); ok = False
            got += rest
        same = got == texts.get(tab)
        print(f'{tab}: {len(info["files"])} files, {len(got.encode())} bytes, identical to export: {same}')
        ok &= same
    if not ok:
        sys.exit('VERIFY FAILED')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--exports', metavar='DIR')
    ap.add_argument('--rev', action='append', default=[], metavar='TAB=N')
    ap.add_argument('--date')
    ap.add_argument('--done-through', type=int, default=5, help='the last built item whose text goes in the "done" file')
    ap.add_argument('--verify', metavar='DIR')
    a = ap.parse_args()
    if a.verify:
        m = json.load(open(os.path.join(OUT, 'manifest.json')))
        verify(m, read_exports(a.verify))
    else:
        if not all([a.exports, a.date]):
            ap.error('--exports, a --rev for every tab and --date are needed (or --verify)')
        write(a)
