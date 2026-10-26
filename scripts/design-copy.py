#!/usr/bin/env python3
"""Cut the design document's markdown exports into the repository copy.

The design document (Claude Docs, doc 7f857750-39dc-464a-a739-c9f59dfe3dcd) is the source of intent.
This script turns its two tab exports into docs/intent/ (one file per section) and
.claude/rules/builder-rules.md (the "Rules for the builder" block, which every session loads).
Every output file starts with one generated-header line; without those lines the files, in
manifest order, reproduce each export byte for byte, and the script checks that before it exits.

File names come from headings, with no position numbers, so a path stays the same until its heading is renamed;
the order lives in docs/intent/manifest.json. After writing, the script checks that every docs/intent path named in
the repository's own docs still exists, and fails if one does not.

Usage (run by whoever refreshes the copy after a design session, never by builders):
  python3 scripts/design-copy.py --main main.md --main-rev N --ideas ideas.md --ideas-rev M --date YYYY-MM-DD
  python3 scripts/design-copy.py --verify main.md ideas.md   # check an existing copy against exports
"""
import argparse, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'intent')
RULES = os.path.join(ROOT, '.claude', 'rules', 'builder-rules.md')
DOC = '7f857750-39dc-464a-a739-c9f59dfe3dcd'
NODES = {'main': '320f0886-6acf', 'ideas': '4fd20c8e-f5d2'}
PART_BYTES = 22000  # Ideas sections above ~30 KB are cut into parts of about this size, at entry boundaries
REF_GLOBS = ['CLAUDE.md', 'docs', '.claude']  # where references to docs/intent paths are checked


def slug(text, n=64):
    s = re.sub(r'[^a-z0-9]+', '-', text.lower().replace("'", '')).strip('-')
    return s[:n].rstrip('-') or 'section'


def sections(lines):
    """Split into the front matter (before the first '## ') and one chunk per '## ' heading."""
    starts = [i for i, l in enumerate(lines) if l.startswith('## ')]
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
    parts = [('build-order/intro', 'Build order: introduction', chunk[:rules_at]),
             ('RULES', 'Rules for the builder', chunk[rules_at:order_at])]
    first_open = next(k for k, (i, num) in enumerate(starts) if not (num.isdigit() and int(num) <= done_through))
    parts.append((f'build-order/items-1-to-{done_through}-done', f'The order: items 1 to {done_through} (built)',
                  chunk[order_at:starts[first_open][0]]))
    for k in range(first_open, len(starts)):
        i, num = starts[k]
        j = starts[k + 1][0] if k + 1 < len(starts) else notyet_at
        title = re.sub(r'\*\*', '', chunk[i].strip()).split('(')[0].strip().rstrip('.')
        name = 'item-' + num.replace('+', 'plus')
        parts.append((f'build-order/{name}', title[:80], chunk[i:j]))
    parts.append(('build-order/not-yet-in-the-order', 'Not yet in the order', chunk[notyet_at:]))
    return parts


def entry_parts(chunk):
    """Cut a long Ideas section into parts at entry boundaries (a paragraph that starts with bold text)."""
    size = lambda ls: sum(len(x.encode()) + 1 for x in ls)
    if size(chunk) <= 30000:
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
    out = []  # (relative path, description, lines)
    for title, chunk in sections(lines):
        if title == 'front':
            out.append((f'{tab}/front', 'Title, status, how the document relates to the code', chunk))
        elif tab == 'main' and title == 'Build order':
            for name, desc, ls in build_order_parts(chunk, done_through):
                out.append((name if name == 'RULES' else f'{tab}/{name}', desc, ls))
        else:
            ps = entry_parts(chunk) if tab == 'ideas' else [chunk]
            for p, ls in enumerate(ps):
                suffix = f'-part{p + 1}' if len(ps) > 1 else ''
                out.append((f'{tab}/{slug(title)}{suffix}', title + (f' (part {p + 1})' if suffix else ''), ls))
    names = [o[0] for o in out]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        sys.exit(f'two sections would share a file name: {sorted(dup)}; rename a heading')
    return out


def header(tab, rev, date):
    return (f'<!-- Generated from the design document, {tab} tab, revision {rev} ({date}). '
            f'Do not edit: see docs/intent/INDEX.md. -->')


def path_of(name):
    return RULES if name == 'RULES' else os.path.join(OUT, name + '.md')


def write(args):
    tabs = {'main': (open(args.main, encoding='utf-8').read(), args.main_rev),
            'ideas': (open(args.ideas, encoding='utf-8').read(), args.ideas_rev)}
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.dirname(RULES), exist_ok=True)
    manifest = {'doc': DOC, 'date': args.date, 'tabs': {}}
    index_rows = []
    for tab, (text, rev) in tabs.items():
        items = plan(tab, text, args.done_through)
        manifest['tabs'][tab] = {'node': NODES[tab], 'rev': rev, 'files': []}
        for i, (name, desc, ls) in enumerate(items):
            body = '\n'.join(ls)
            # every chunk but the last ended at a line break that split() consumed
            if i < len(items) - 1:
                body += '\n'
            p = path_of(name)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w', encoding='utf-8', newline='') as f:
                f.write(header(tab, rev, args.date) + '\n' + body)
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            manifest['tabs'][tab]['files'].append(rel)
            index_rows.append((tab, rel, desc, len(body.encode())))
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=1)
        f.write('\n')
    write_index(manifest, index_rows)
    verify(manifest, {t: v[0] for t, v in tabs.items()})
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
         '',
         f"**Cut from:** main tab revision {t['main']['rev']}, Ideas tab revision {t['ideas']['rev']}, on {m['date']}.",
         '',
         '**Before relying on it,** ask the live document what changed since then (Claude Docs `read`, container',
         f"`{{\"kind\":\"project\",\"id\":\"{m['doc']}\"}}`, engine `prose`):",
         '',
         f"- main tab: ref `{{\"object\":\"node\",\"id\":\"{t['main']['node']}\"}}`, payload `{{\"kind\":\"view\",\"sinceRev\":{t['main']['rev']}}}`",
         f"- Ideas tab: ref `{{\"object\":\"node\",\"id\":\"{t['ideas']['node']}\"}}`, payload `{{\"kind\":\"view\",\"sinceRev\":{t['ideas']['rev']}}}`",
         '',
         'Only changed blocks come back. Where they differ from the copy, the live document wins. If the docs',
         'connector is not available, go on with the copy and say so in the report.',
         '',
         'Find a section or entry by its title: `grep -rn "Title words" docs/intent .claude/rules`. Entries in the',
         'Ideas tab start with a bold title. The builder rules are in `.claude/rules/builder-rules.md`, which every',
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
        same = got == texts[tab]
        print(f'{tab}: {len(info["files"])} files, {len(got.encode())} bytes, identical to export: {same}')
        ok &= same
    if not ok:
        sys.exit('VERIFY FAILED')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--main'); ap.add_argument('--main-rev', type=int)
    ap.add_argument('--ideas'); ap.add_argument('--ideas-rev', type=int)
    ap.add_argument('--date')
    ap.add_argument('--done-through', type=int, default=5, help='the last built item whose text goes in the "done" file')
    ap.add_argument('--verify', nargs=2, metavar=('MAIN', 'IDEAS'))
    a = ap.parse_args()
    if a.verify:
        m = json.load(open(os.path.join(OUT, 'manifest.json')))
        verify(m, {'main': open(a.verify[0], encoding='utf-8').read(), 'ideas': open(a.verify[1], encoding='utf-8').read()})
    else:
        if not all([a.main, a.main_rev, a.ideas, a.ideas_rev, a.date]):
            ap.error('--main, --main-rev, --ideas, --ideas-rev and --date are all needed (or --verify)')
        write(a)
