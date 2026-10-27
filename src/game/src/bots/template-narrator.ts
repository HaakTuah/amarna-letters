/** The offline narrator: template personas, plain check reports, and boastful annals. */
import { groupBy, king, land, personaTemplate, trim, trimEnd, year, type Character, type GameEvent, type Power } from "@amarna/engine";
import type { CheckContext, ChronicleContext, INarrator } from "../contracts.ts";

export class TemplateNarrator implements INarrator {
  readonly label: string = "Template narrator";

  persona(c: Character, _signal?: AbortSignal): Promise<string> {
    return Promise.resolve(personaTemplate(c));
  }

  checkReport(ctx: CheckContext, _signal?: AbortSignal): Promise<string> {
    if (ctx.facts.length === 0)
      return Promise.resolve(`Your inquiries into ${ctx.subject.name} turned up nothing of note. The markets know the name and little more.`);
    return Promise.resolve(`Inquiries in the markets and temples tell this of ${ctx.subject.name}: ${ctx.facts.join(" ")} More than this, no one would say.`);
  }

  chronicle(ctx: ChronicleContext, _signal?: AbortSignal): Promise<string> {
    const p = ctx.power;
    let sb = "";
    sb += `The Annals of ${king(p)}, Great King of ${land(p)}\n`;
    sb += "\n";
    for (const [y, events] of groupBy(
      ctx.known.filter((e) => e.kind !== "start"),
      (e) => year(e.turn),
    )) {
      const lines: string[] = [];
      for (const e of events) {
        const line = spin(p, e);
        if (line !== null && !lines.includes(line)) lines.push(line);
      }
      if (lines.length === 0) continue;
      sb += `Year ${y}.\n`;
      for (const l of lines.slice(0, 6)) sb += "  " + l + "\n";
    }
    const won = ctx.winners.includes(p);
    sb += "\n";
    sb +=
      (won
        ? `Of all the kings of the world, none grew as His Majesty did. The gods of ${land(p)} are pleased.`
        : `Though lesser kings boasted, the land of ${land(p)} endured, beloved of its gods, and its king lacked nothing.`) + "\n";
    return Promise.resolve(sb);
  }
}

function spin(p: Power, e: GameEvent): string | null {
  const me: string = p;
  const t = e.text;
  switch (e.kind) {
    case "conquest":
      if (t.startsWith("The walls of") && t.endsWith(`fell to ${me}.`))
        return `His Majesty broke the walls of ${t.slice("The walls of ".length, t.indexOf(" fell"))}, and its elders kissed his feet.`;
      if (t.startsWith(me)) return `His Majesty's armies ${trimEnd(trim(t.slice(me.length)), ".")}, and the enemies trembled.`;
      if (t.includes("from " + me)) return "Cowardly foes crept into a border town while His Majesty's back was turned; the gods will repay them.";
      return null;
    case "purchase":
      return t.startsWith(me) ? `A city came begging to be ruled by His Majesty, and he accepted its tribute: ${trim(t.slice(me.length))}` : null;
    case "tablet":
      return "A king came seeking peace, and His Majesty in his mercy sealed a tablet with him before Shamash.";
    case "catastrophe":
      return "The gods tested the land, and the piety of His Majesty restored it.";
    case "battle":
      return t.startsWith(me) ? "A detachment fell gloriously, selling its life dearly." : `His Majesty's foes were cut down: ${t}`;
    case "bribe":
      return "A foreign messenger was moved by His Majesty's generosity.";
    case "detention":
      return "A presumptuous messenger was taught the patience due to a Great King.";
    case "spy-caught":
      return "A spy was caught in the palace and learned the king's justice.";
    case "forgery-detected":
    case "forgery-exposed":
      return "His Majesty's scribes saw through a false tablet.";
    case "debasement-found":
      return "A foreign king was found to send false gold; His Majesty will remember it.";
    case "fall":
      return `${t} So perish those the gods abandon.`;
    default:
      return null;
  }
}
