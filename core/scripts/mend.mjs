// What a failure of a check of the core says (AGENTS.md, "A check that fails says the mend"; core archive 219; #254):
// each is a line of the check's output that starts "FAIL" (after the workflow command that opens it, "::error::" or
// one like it, where one does), or, of a check that marks a pull request with a status that waits, the status's
// description, which starts "Waiting: ". It says what is wrong and where, then "Mend: " and what a session does about
// it, in words it acts on with no rule file open. Lines after a failure that do not start so are its details (the
// files, the lines), read with it. Each check's own test reads its failures here (tests/mend-test.mjs holds that it
// does). Node's own modules only.
//
//   import { mended, unmended } from "./mend.mjs";
export const MEND = "Mend: ";
const FAILURE = /^(?:::[a-z]+(?: [^:\r\n]*)?::)?(?:FAIL\b|Waiting: )/u;
// a mend of at least two words after the marker, so that "Mend: " alone, or one word, is none
const SAID = /Mend: \S+\s+\S/u;

// The failures in a check's output (its stdout and stderr as one text), one line each.
export function failures(output) {
  return String(output ?? "").split(/\r?\n/u).filter(line => FAILURE.test(line));
}

// The failures that do not say their mend: an empty list where each does.
export function unmended(output) {
  return failures(output).filter(line => !SAID.test(line));
}

// Whether a check's output holds a failure and every failure in it says its mend: what a check's test asks of a run
// that fails.
export function mended(output) {
  return failures(output).length > 0 && unmended(output).length === 0;
}
