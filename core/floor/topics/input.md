# The floor, by topic: untrusted input

Read before a task touches what anyone but the user at hand can shape, and by a security review: the kinds `input` and
`security-review`.

**5. Untrusted input is checked before it is used.**
- Whatever anyone but the user at hand can shape (a peer's message, a shared file, record or link, a URL parameter, a
  model's reply) is data: each field's type and size checked against its expected shape, what fails dropped cleanly.
- It is never run, never fetched as an address, never setting a key or an address the app talks to.
- The project names its inputs in its `SECURITY.md`, under this rule's number, each as an item of its own (`- `) that
  names, after the words "hostile tests:", the file or folder that holds them, in backticks, and, after the words
  "limits:", its limit in size, in count and in time, each as a number and each where it applies; its "too long" case
  uses that number.
  - The limits are declared, since no script reads a reader's limit from its code exactly; the security review reads
    them against the reader's code. They are written, and reported where missing, as the input's hostile tests are
    (below), and wait for nothing those tests do not. It does not mean a limit made up where a shape has none: "limits:
    none", with why, is an answer, nor a limit for every field. Reason: "too long" means nothing until an input says how
    long is allowed.
- **Every named input has hostile tests:** too long, the wrong type, markup, a file path, a number
  out of range, and nothing at all, each refused with nothing of it used. Whoever adds an input, or changes the code
  that reads one, writes its tests in that pull request; an input named without them is a task of its own, which the
  sync's step "16 November 2026, hostile tests for every named input" reports.
  - It does not mean every field tried with every case, only each input with each case its shape allows, nor that a
    pull request waits on tests an input lacked before it. Reason: a check never tried with what an attacker sends
    holds nothing.
- **A reader refuses a version it does not know:** for an input that carries a version number (a saved file, a message
  of a protocol, an exported record), a number newer than its reader knows is refused, with nothing of it used, in words
  the user can act on, and its hostile tests try one; its item names, among its limits, the newest version its reader
  knows. Whoever adds such an input, or changes the code that reads one, writes the case in that pull request; an input
  that lacks it is a task, which the same step reports.
  - It does not mean that an input with no version number gains one for this, nor that an older number is refused: how
    long those are read is the format's own record (#309, point 3). Reason: the rest of this rule guards an input
    against a stranger, not an older program against a newer one's data, which reaches every user once a second
    version exists.
- **A failure refuses:** where a check cannot be made (who is asking, whether it is allowed, whether
  it is well formed), the answer is no; an error a user sees names nothing of the program's insides (no stack, path,
  query or version).
  - It does not mean the program stops: it refuses that one request and goes on. Reason: a check that errors open
    lets through what it was written to stop.

**6. Nothing untrusted becomes markup or code.**
- Such text is shown only as text (`textContent` in a page) or escaped (`&`, `<`, `>`, `"`, `'`) where markup is built;
  never into an attribute, URL, style or event handler unescaped.
- No `eval`, `new Function` or string timers.
