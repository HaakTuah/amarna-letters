/**
 * The keys page (item 17+++a, "keys for everything"): every action with its key, after Crusader Kings III's own, each
 * changeable and remembered in this browser (ui/keys.ts). A key given to one action is refused for a second, so no key
 * does two things. The phone has no keys; the page says so.
 */
import { useEffect, useState } from "react";
import { KeyDefaults, actionWithCode, bindingOf, keyLabel, resetKeys, setKey, type KeyAction, type KeyGroup } from "../ui/keys.ts";

const Groups: readonly KeyGroup[] = ["Time", "Turns and windows", "The map"];
/** Keys the browser keeps for itself, never given to an action. */
const Kept = new Set(["Tab", "F11", "F12", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "CapsLock"]);

export function Keys() {
  const [, bump] = useState(0);
  // The action waiting for its new key, and a word on the last change that was refused.
  const [waiting, setWaiting] = useState<KeyAction | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (waiting === null) return;
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopImmediatePropagation();
      setWaiting(null);
      if (e.code === "Escape") {
        setNote("");
        return;
      }
      if (Kept.has(e.code) || e.code === "") {
        setNote(`${e.key} belongs to the browser; choose another key.`);
        return;
      }
      const taken = actionWithCode(e.code);
      if (taken !== null && taken !== waiting) {
        setNote(`${keyLabel(e.code)} is already “${KeyDefaults[taken].what}”: change or clear that one first.`);
        return;
      }
      setKey(waiting, e.code);
      setNote("");
      bump((x) => x + 1);
    };
    // Capture, so no other key handler on the page acts on the key being chosen.
    addEventListener("keydown", onKey, true);
    return () => removeEventListener("keydown", onKey, true);
  }, [waiting]);

  return (
    <div className="page keys" style={{ maxWidth: "48rem" }}>
      <h1>Keys</h1>
      <p>
        On a computer every action has a key, after Crusader Kings III&apos;s own, so players of the genre find them where they
        expect. Choose <b>Change</b> and press the key you want; Escape keeps the old one. Your keys are kept in this browser.
        No key acts while you type a letter or a name. On a phone, play by touch as before.
      </p>
      {note !== "" && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
      {Groups.map((g) => (
        <section key={g}>
          <h2>{g}</h2>
          <table className="keys-table">
            <tbody>
              {(Object.keys(KeyDefaults) as KeyAction[])
                .filter((a) => KeyDefaults[a].group === g)
                .map((a) => {
                  const label = bindingOf(a).label;
                  return (
                    <tr key={a}>
                      <td>{KeyDefaults[a].what}</td>
                      <td>
                        <kbd>{waiting === a ? "press a key…" : label === "" ? "none" : label}</kbd>
                      </td>
                      <td>
                        <button className="small" onClick={() => setWaiting(waiting === a ? null : a)}>
                          {waiting === a ? "Cancel" : "Change"}
                        </button>{" "}
                        <button
                          className="small"
                          onClick={() => {
                            setKey(a, "");
                            bump((x) => x + 1);
                          }}
                          disabled={label === ""}
                        >
                          Clear
                        </button>{" "}
                        <button
                          className="small"
                          onClick={() => {
                            const taken = KeyDefaults[a].key.codes.map(actionWithCode).find((x) => x !== null && x !== a);
                            if (taken !== undefined && taken !== null) {
                              setNote(`Its default key is now “${KeyDefaults[taken].what}”: change or clear that one first.`);
                              return;
                            }
                            setKey(a, null);
                            setNote("");
                            bump((x) => x + 1);
                          }}
                        >
                          Default
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
      ))}
      <p>
        <button
          onClick={() => {
            resetKeys();
            setNote("");
            bump((x) => x + 1);
          }}
        >
          Every key back to its default
        </button>
      </p>
    </div>
  );
}
