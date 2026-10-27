import { AllPowers, MaxAnswerSay, MaxAnswers, answerText, newStandingAnswerRequest, type AnswerBrings, type Power } from "@amarna/engine";
import { useState } from "react";
import type { OrderDraft } from "../ui/order-draft.ts";
import { powerName } from "../ui/format.ts";

const num = (s: string): number => (s.trim() === "" || !Number.isFinite(Number(s)) ? 0 : Math.trunc(Number(s)));

/**
 * A human seat's standing answers ("Standing answers" under "Minds follow what is at stake"; answering item 6b's review,
 * built in item 8): answers given in advance for what arrives at court, so that an envoy they cover is received without
 * stopping the game for the player. They save clicks, not strength: the engine carries them out exactly as a model
 * king's, and in full press the words said are the player's own.
 */
export function StandingAnswersPanel({ draft, structured, onChanged }: { draft: OrderDraft; structured: boolean; onChanged: () => void }) {
  const v = draft.view;
  const [from, setFrom] = useState<Power | "">("");
  const [brings, setBrings] = useState<AnswerBrings>("Words");
  const [minGold, setMinGold] = useState(20);
  const [seal, setSeal] = useState(false);
  const [goldBack, setGoldBack] = useState(0);
  const [say, setSay] = useState("");
  const kept = v.answers.length - draft.cancelAnswers.size + draft.answers.length;
  const add = (): void => {
    draft.answers.push(
      newStandingAnswerRequest({
        from: from === "" ? null : from,
        brings,
        minGold: brings === "Gold" ? Math.max(1, minGold) : 0,
        seal: brings === "Tablet" || brings === "Anything" ? seal : false,
        goldBack: Math.min(100, Math.max(0, goldBack)),
        say: structured ? "" : say.trim().slice(0, MaxAnswerSay),
      }),
    );
    setSay("");
    onChanged();
  };
  return (
    <div className="section standing">
      <h3>Standing answers</h3>
      <p className="muted">
        <small>
          How your court receives envoys you need not see yourself: an envoy an answer covers is received as it says, and the game does not stop for you.
          The first answer that fits him is used; anything else waits for you. At most {MaxAnswers}.
        </small>
      </p>
      {v.answers.map((a) => {
        const cancelled = draft.cancelAnswers.has(a.id);
        return (
          <div key={a.id} className="row">
            <span style={{ flex: 1, textDecoration: cancelled ? "line-through" : undefined }}>{answerText(a)}</span>
            <button
              className="small"
              onClick={() => {
                if (!draft.cancelAnswers.delete(a.id)) draft.cancelAnswers.add(a.id);
                onChanged();
              }}
            >
              {cancelled ? "Keep" : "Cancel"}
            </button>
          </div>
        );
      })}
      {draft.answers.map((r, i) => (
        <div key={`new${i}`} className="row">
          <span style={{ flex: 1 }}>new: {answerText({ ...r, id: "" }).replace(/^: /, "")}</span>
          <button
            className="small"
            onClick={() => {
              draft.answers.splice(i, 1);
              onChanged();
            }}
          >
            Remove
          </button>
        </div>
      ))}
      {kept < MaxAnswers && (
        <>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <select value={from} onChange={(e) => setFrom(e.target.value as Power | "")}>
              <option value="">any court's envoy</option>
              {AllPowers.filter((p) => p !== v.power).map((p) => (
                <option key={p} value={p}>
                  an envoy of {powerName(p)}
                </option>
              ))}
            </select>
            <select value={brings} onChange={(e) => setBrings(e.target.value as AnswerBrings)}>
              <option value="Words">who brings only words</option>
              <option value="Gold">who brings gold</option>
              <option value="Tablet">who brings a tablet to seal</option>
              <option value="Anything">whatever he brings</option>
            </select>
            {brings === "Gold" && (
              <label>
                at least <input type="number" min="1" value={minGold} onChange={(e) => setMinGold(num(e.target.value))} style={{ width: "5em" }} /> shekels
              </label>
            )}
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {(brings === "Tablet" || brings === "Anything") && (
              <label>
                <input type="checkbox" checked={seal} onChange={(e) => setSeal(e.target.checked)} /> seal his tablet
              </label>
            )}
            <label>
              send back <input type="number" min="0" max="100" value={goldBack} onChange={(e) => setGoldBack(num(e.target.value))} style={{ width: "4em" }} /> % of his
              gold
            </label>
          </div>
          {!structured && (
            <input value={say} maxLength={MaxAnswerSay} onChange={(e) => setSay(e.target.value)} placeholder="What you say to him, in your own words (optional)" style={{ width: "100%" }} />
          )}
          <button className="small" onClick={add}>
            Add standing answer
          </button>
        </>
      )}
    </div>
  );
}
