/**
 * What a failed call or decision is logged as (Engine and models, "Logging and replay"): its kind and code, never its raw
 * message. A provider's, the bridge's or the file system's message may carry a key, an address, a request or account id
 * or a local path, and there is always another way to spell one, so nothing sensitive is recorded in the first place.
 */

/** The kinds a failure is logged as; one with a code reads "rate limited (429)". */
export const FailureKinds = [
  "timed out",
  "unreachable",
  "refused",
  "rate limited",
  "overloaded",
  "provider error",
  "rejected",
  "refused by the model",
  "cut off",
  "did not fit",
  "failed",
] as const;

export type FailureKind = (typeof FailureKinds)[number];

/** An error that names its own kind (the game's and the model layer's own errors), or a provider's with a status. */
export interface Failing {
  failure?: FailureKind;
  status?: number;
}

/** A failure of the given kind, to throw where the cause is known (a reply that never came, an answer that did not fit). */
export function failing(kind: FailureKind, message: string = kind): Error & Failing {
  return Object.assign(new Error(message), { failure: kind });
}

/** The kind and code of a failure, from what the error is, never from what it says. */
export function failureOf(ex: unknown): string {
  const e = (ex ?? {}) as Failing & { name?: string };
  // An answer that did not fit says why in the game's own words (the schema's account of the reply), never a provider's.
  if (e.failure === "did not fit" && ex instanceof Error && ex.message.length > 0 && ex.message !== e.failure) return `did not fit: ${ex.message}`;
  if (e.failure !== undefined) return e.failure;
  if (e.name === "AbortError" || e.name === "TimeoutError") return "timed out";
  const status = e.status;
  if (typeof status !== "number") return "failed";
  const kind: FailureKind =
    status === 0
      ? "unreachable"
      : status === 401 || status === 403
        ? "refused"
        : status === 408
          ? "timed out"
          : status === 429
            ? "rate limited"
            : status === 503 || status === 529
              ? "overloaded"
              : status >= 500
                ? "provider error"
                : "rejected";
  return status === 0 ? kind : `${kind} (${status})`;
}

/**
 * Whether a logged text is a failure as this build writes it: a kind, a kind with its code, or "did not fit" with the
 * schema's own account of what did not ("did not fit: letters[0].to"). A log written before kinds were kept may hold a
 * raw message: an export gives that as "failed".
 */
export function isFailure(text: string): boolean {
  return FailureKinds.some((k) => text.startsWith(k) && (text === k || /^ \(\d{3}\)$/.test(text.slice(k.length)) || (k === "did not fit" && text.startsWith(": ", k.length))));
}
