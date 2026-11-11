import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { KeyDefaults, actionOf, actionWithCode, bindingOf, resetKeys, setKey, withKey, type KeyAction } from "../src/ui/keys.ts";

// Item 17+++a, "keys for everything": one table, no key doing two things, and each key changeable.
describe("Keys for everything", () => {
  /** A key press as the listener sees it; `on` is what it was pressed on (the page, a button, a text field). */
  const press = (code: string, key = "", opts: { repeat?: boolean; on?: string | null; ctrl?: boolean } = {}): KeyboardEvent =>
    ({
      code,
      key,
      repeat: opts.repeat ?? false,
      ctrlKey: opts.ctrl ?? false,
      metaKey: false,
      altKey: false,
      target: { isContentEditable: false, closest: (sel: string) => (opts.on != null && sel.split(", ").some((s) => s.startsWith(opts.on!)) ? {} : null) },
    }) as unknown as KeyboardEvent;

  test("No key does two things by default", () => {
    const seen = new Map<string, KeyAction>();
    for (const a of Object.keys(KeyDefaults) as KeyAction[])
      for (const c of KeyDefaults[a].key.codes) {
        Assert.true(!seen.has(c), `${c} is both ${seen.get(c)} and ${a}`);
        seen.set(c, a);
      }
  });

  test("Paradox's keys: Space pauses, F1 the seat, E the realms, W moves the map, Enter seals; + by what it types", () => {
    Assert.equal("pause", actionOf(press("Space", " ")));
    Assert.equal("winSeat", actionOf(press("F1", "F1")));
    Assert.equal("viewRealms", actionOf(press("KeyE", "e")));
    Assert.equal("panUp", actionOf(press("KeyW", "w")));
    Assert.equal("panUp", actionOf(press("ArrowUp", "ArrowUp")));
    Assert.equal("endSeason", actionOf(press("Enter", "Enter")));
    // "+" where a Nordic keyboard has it (the key US keyboards call Minus) speeds up.
    Assert.equal("faster", actionOf(press("Minus", "+")));
  });

  test("No key acts while typing, with Ctrl held, or as a held repeat (but the map moves while held)", () => {
    Assert.equal(null, actionOf(press("Space", " ", { on: "input" })));
    Assert.equal(null, actionOf(press("KeyE", "e", { ctrl: true })));
    Assert.equal(null, actionOf(press("Space", " ", { repeat: true })));
    Assert.equal("panLeft", actionOf(press("KeyA", "a", { repeat: true })));
    // Enter on a button is the button's own.
    Assert.equal(null, actionOf(press("Enter", "Enter", { on: "button" })));
  });

  test("A key changed is the action's from then on; cleared, it has none; and back to its default", () => {
    setKey("winPeople", "KeyP");
    Assert.equal("winPeople", actionOf(press("KeyP", "p")));
    Assert.equal(null, actionOf(press("F5", "F5")));
    Assert.equal("winPeople", actionWithCode("KeyP"));
    Assert.equal("People (P)", withKey("People", "winPeople"));
    setKey("winPeople", "");
    Assert.equal(0, bindingOf("winPeople").codes.length);
    Assert.equal("People", withKey("People", "winPeople"));
    resetKeys();
    Assert.equal("winPeople", actionOf(press("F5", "F5")));
  });
});
