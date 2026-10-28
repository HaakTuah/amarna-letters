import { newGame, AllPowers, Dict, type Power } from "@amarna/engine";
import { GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, pressFor, type ISeat } from "@amarna/game";
const seed = Number(process.argv[2] ?? 1);
const turns = Number(process.argv[3] ?? 3);
const s = newGame(seed);
const leader = new ScriptLeader(seed);
const seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, leader] as const));
const r = new GameRunner(pressFor(s, new ScriptMind()), seats, new ScriptMind(), new TemplateNarrator());
await r.prepare();
for (let t = 0; t < turns; t++) {
  const before = new Map(s.owner.entries());
  await r.playTurn();
  for (const [k, v] of s.owner.entries()) if (before.get(k) !== v) console.log(`turn ${s.turn - 1}: ${k} ${before.get(k)} -> ${v}`);
  for (const p of ["Egypt", "Mitanni", "Byblos", "Arrapha", "Assyria"] as Power[]) {
    const br = leader.brainOf(p);
    if (br) console.log(`  ${p}: war ${br.warTarget} serving [${[...br.serving]}] due ${br.tributeDue} paid ${[...br.tributePaid]} in ${[...br.tributeIn]}`);
  }
}
