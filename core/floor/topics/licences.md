# The floor, by topic: licences

Read before a task adds or updates a package, a font, an image, a sound or a data set, and by a security review: the
kinds `licence`, `update`, `dependency` and `security-review`.

**10. Licences: free to use, kept that way.**
- What ships, or is built into it (every package, the ones it pulls in included, and every font, image, sound and data
  set), is under MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, Unlicense, Zlib,
  BlueOak-1.0.0, Python-2.0, PostgreSQL, BSL-1.0, ICU, Unicode-3.0, Unicode-DFS-2016, CC-BY-3.0 and CC-BY-4.0 (for data
  and assets), OFL-1.1 (for fonts), or the public domain; never copyleft (GPL, LGPL, AGPL, MPL, MS-PL, EPL, CDDL,
  CC-BY-SA).
  - What a project already shipped under MS-PL when it took this rule is reported, not failed.
- Its notices are kept in a third-party notices file that ships.
- Tools that only run, nothing of which ships, may carry any licence the Open Source Initiative approves; a tool's code
  never moves into what ships without passing the first list.
- Never, in either: non-commercial or no-derivatives terms, source-available terms (BSL, SSPL, Elastic, Commons
  Clause), or no licence.
- A check on every PR fails one that adds or updates a package to a licence off its list.
  - One the owner wants anyway waits for the owner's yes, and so does a package that ships under a licence only a
    reading by hand gives.
- The owner's own work carries no licence but the terms the owner gives it, all rights reserved: never add or change
  them unasked.
  - It does not mean that a product its owner sells may hold no file of the owner's own terms: such a file, asked for
    by the owner, is those terms. Reason: one reading took this line as standing against a licence file for a product
    that is sold.
