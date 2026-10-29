import { AllPowers, WorldMap, clause, renderClause, type Clause, type ClauseKind, type Power } from "@amarna/engine";
import { useState } from "react";
import { powerName } from "../ui/format.ts";

/** The fields each kind of clause uses (item 8: the templates of structured press). */
const Uses: Record<ClauseKind, readonly ("king" | "province" | "into" | "season" | "gold" | "answers")[]> = {
  wellWishes: [],
  gift: ["gold"],
  peace: [],
  noAttack: [],
  alliance: [],
  against: ["king"],
  support: ["province", "into", "season"],
  tribute: ["gold"],
  cede: ["province"],
  passage: ["province", "season"],
  basing: ["province", "season"],
  tollFree: [],
  fugitives: [],
  protect: [],
  serve: [],
  askGold: ["gold"],
  askSupport: ["province", "into", "season"],
  askWithdraw: ["province"],
  askCede: ["province"],
  askTribute: ["gold"],
  askHelp: ["province", "king"],
  askOath: [],
  askPassage: ["province", "season"],
  askBasing: ["province", "season"],
  askTollFree: [],
  askProtect: [],
  askServe: [],
  threat: ["province"],
  grievance: ["province"],
  brokenOath: [],
  lightGift: ["gold"],
  envoyLied: [],
  habiru: ["king"],
  newsTroops: ["king", "province"],
  newsStrength: ["king", "gold"],
  newsTaken: ["king", "province"],
  newsSiege: ["king", "province"],
  accept: ["answers"],
  refuse: ["answers"],
  counter: ["answers", "gold", "province", "into", "season"],
};

/** The kinds in the order a king reaches for them, with a short name for the picker. */
const Groups: [string, [ClauseKind, string][]][] = [
  ["Courtesies and gifts", [["wellWishes", "may it be well with you"], ["gift", "a greeting-gift of gold"]]],
  [
    "Proposals",
    [["peace", "peace"], ["noAttack", "my troops will not enter your land"], ["alliance", "alliance"], ["against", "stand together against a king"], ["support", "I will support your move"], ["tribute", "I will pay tribute"], ["protect", "I will guard your land"], ["serve", "I will be your servant"], ["cede", "I give you a land"], ["passage", "your troops may pass through my land"], ["basing", "your troops may stand within my walls"], ["tollFree", "no toll on your goods in my land"], ["fugitives", "each of us sends back the other's runaways"]],
  ],
  [
    "Requests",
    [["askGold", "send me gold"], ["askSupport", "support my move"], ["askWithdraw", "withdraw your troops"], ["askCede", "give me a land"], ["askTribute", "pay me tribute"], ["askProtect", "guard my land"], ["askServe", "be my servant"], ["askHelp", "relieve my besieged city"], ["askOath", "swear your troops will stand with mine"], ["askPassage", "let my troops pass through your land"], ["askBasing", "let my troops stand within your walls"], ["askTollFree", "take no toll on my goods"]],
  ],
  ["Threats", [["threat", "or my troops will march"]]],
  ["Grievances", [["grievance", "your troops entered my land"], ["brokenOath", "you broke your oath"], ["lightGift", "your gold weighed light"], ["envoyLied", "your messenger lied"], ["habiru", "in league with the Habiru"]]],
  ["News", [["newsTroops", "troops stand in"], ["newsStrength", "troops are few or many"], ["newsTaken", "has taken"], ["newsSiege", "besieges"]]],
  ["Answers", [["accept", "I accept"], ["refuse", "I refuse"], ["counter", "not that, but this"]]],
];

const Answerable: ClauseKind[] = ["peace", "noAttack", "alliance", "against", "support", "tribute", "cede", "passage", "basing", "tollFree", "fugitives", "askGold", "askSupport", "askWithdraw", "askCede", "askTribute", "askHelp", "askOath", "askPassage", "askBasing", "askTollFree", "gift"];
const num = (s: string): number => (s.trim() === "" || !Number.isFinite(Number(s)) ? 0 : Math.trunc(Number(s)));

/**
 * Builds a letter's, a tablet's or an answer's clauses from the templates (build order item 8). Each clause shows its words
 * as the recipient will read them. `only`: the kinds offered (news only, for what a bribed envoy is to say).
 */
export function ClauseEditor({
  clauses,
  onChange,
  from,
  to,
  turn,
  only = null,
}: {
  clauses: Clause[];
  onChange: (cs: Clause[]) => void;
  from: Power;
  to: Power;
  turn: number;
  only?: readonly ClauseKind[] | null;
}) {
  const [kind, setKind] = useState<ClauseKind>(only?.[0] ?? "wellWishes");
  const [king, setKing] = useState<Power | "">("");
  const [province, setProvince] = useState("");
  const [into, setInto] = useState("");
  const [season, setSeason] = useState(turn + 2);
  const [gold, setGold] = useState(0);
  const [answers, setAnswers] = useState<ClauseKind>("peace");
  const uses = Uses[kind];
  // Passage and basing (item 9) stand until a season named, or until revoked (turn 0); passage may open all the land.
  const grant = kind === "passage" || kind === "basing" || kind === "askPassage" || kind === "askBasing";
  const land = WorldMap.default.provinces.filter((p) => !p.isSea || uses.includes("into"));
  const add = (): void => {
    const c = clause(kind, {
      power: uses.includes("king") && king !== "" ? king : null,
      province: uses.includes("province") && province !== "" ? province : null,
      to: uses.includes("into") && into !== "" ? into : null,
      turn: uses.includes("season") && (kind !== "counter" || into !== "") && !(grant && season <= 0) ? season : null,
      amount: uses.includes("gold") && (kind === "newsStrength" || gold > 0) ? gold : null,
      answers: uses.includes("answers") ? answers : null,
    });
    onChange([...clauses, c]);
  };
  return (
    <div className="clauses">
      {clauses.map((c, i) => (
        <div key={i} className="row clause">
          <span className="tablet" style={{ flex: 1, fontSize: ".88rem" }}>
            {renderClause(c, from, to)}
          </span>
          <button className="small" title="Remove this clause" onClick={() => onChange(clauses.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <div className="row" style={{ marginTop: ".3rem", flexWrap: "wrap" }}>
        <select value={kind} onChange={(e) => setKind(e.target.value as ClauseKind)}>
          {Groups.map(([group, kinds]) => {
            const shown = kinds.filter(([k]) => only === null || only.includes(k));
            return shown.length === 0 ? null : (
              <optgroup key={group} label={group}>
                {shown.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        {uses.includes("answers") && (
          <select value={answers} onChange={(e) => setAnswers(e.target.value as ClauseKind)} title="What it answers">
            {Answerable.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        {uses.includes("king") && (
          <select value={king} onChange={(e) => setKing(e.target.value as Power | "")}>
            <option value="">(king)</option>
            {AllPowers.map((p) => (
              <option key={p} value={p}>
                {powerName(p)}
              </option>
            ))}
          </select>
        )}
        {uses.includes("province") && (
          <select value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">{uses.includes("into") ? "(from)" : kind === "passage" || kind === "askPassage" ? "(all the land)" : "(land)"}</option>
            {land.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {uses.includes("into") && (
          <select value={into} onChange={(e) => setInto(e.target.value)}>
            <option value="">(into)</option>
            {land
              .filter((p) => province === "" || WorldMap.default.areAdjacent(province, p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        )}
        {uses.includes("season") && (
          <label>
            {grant ? "until turn (0: until revoked)" : "turn"} <input type="number" min={grant ? 0 : turn + 1} value={season} onChange={(e) => setSeason(num(e.target.value))} style={{ width: "4.5em" }} />
          </label>
        )}
        {uses.includes("gold") && (
          <label>
            {kind === "newsStrength" ? "many (1) or few (0)" : "shekels"}{" "}
            <input type="number" min="0" value={gold} onChange={(e) => setGold(num(e.target.value))} style={{ width: "5em" }} />
          </label>
        )}
        <button className="small" onClick={add}>
          Add clause
        </button>
      </div>
    </div>
  );
}
