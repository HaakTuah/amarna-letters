import { newHostReply, type AudienceView, type HostReply, type SeatView } from "@amarna/engine";
import { useState } from "react";
import { powerName, shekels, when } from "../ui/format.ts";

const num = (s: string): number => (s.trim() === "" || !Number.isFinite(Number(s)) ? 0 : Math.trunc(Number(s)));

/** A foreign envoy stands before you. You hear the envoy, never the king who sent it. The form is new for every round (keyed by the caller). */
export function AudiencePanel({ a, court, onAnswer }: { a: AudienceView; court: SeatView; onAnswer: (r: HostReply) => void }) {
  const [speech, setSpeech] = useState("");
  const [bribeAsk, setBribeAsk] = useState("");
  const [bribe, setBribe] = useState(0);
  const [job, setJob] = useState(0);
  const [goldBack, setGoldBack] = useState(0);
  const [goldPurity, setGoldPurity] = useState(100);
  const [seal, setSeal] = useState(false);
  const [detain, setDetain] = useState(false);
  const [end, setEnd] = useState(true);

  const answer = (): void =>
    onAnswer(
      newHostReply({
        speech: speech.trim(),
        bribe: Math.max(0, bribe),
        bribeAsk: bribeAsk.trim(),
        jobOffer: Math.max(0, job),
        sealProposal: seal,
        detain,
        goldBack: Math.max(0, goldBack),
        goldBackPurity: Math.min(Math.max(goldPurity, 10), 100),
        end: end || detain,
      }),
    );

  return (
    <>
      <h3>An envoy of {powerName(a.from)} before your throne</h3>
      <p className="muted">
        Round {a.round} of {a.maxRounds} · {a.envoy.name} of {a.envoy.origin} {a.envoy.knownFacts.length > 0 ? "· " + a.envoy.knownFacts.join(" ") : ""}
      </p>
      {a.greeting.length > 0 ? (
        <div className="tablet">{a.greeting}</div>
      ) : (
        <div className="tablet">
          <em>The tablet bears no greeting at all.</em>
        </div>
      )}
      {a.greetingDeviations.length > 0 && (
        <p>
          <small>Departs from the custom: {a.greetingDeviations.join("; ")}.</small>
        </p>
      )}

      <h4 style={{ marginTop: ".7rem" }}>{a.envoy.name} says</h4>
      <div className="speech">{a.spoken}</div>
      {a.soFar.map((x, i) => (
        <div key={i}>
          <p style={{ marginTop: ".5rem" }}>
            <small className="muted">You said:</small> {x.host}
          </p>
          <div className="speech">{x.envoy}</div>
        </div>
      ))}

      {a.goldStated > 0 && (
        <p className="notice">
          The tablet's inventory lists {shekels(a.goldStated)} of gold. Your weighers find {shekels(a.goldWeighed)}
          {a.goldWeighed < a.goldStated ? ": less than promised." : "."} Its purity you will only know if you pay for an assay.
        </p>
      )}
      {a.proposal !== null && (
        <>
          <h4>A tablet for you to seal</h4>
          <div className="tablet">{a.proposal.text}</div>
          <small>
            Already sealed by {a.proposal.seals.join(", ")}
            {a.proposal.allianceOath ? " · a sworn alliance" : ""}.
          </small>
        </>
      )}
      {a.copiesShown.map((t) => (
        <div key={t.copyId}>
          <h4>Shown to you as evidence</h4>
          <div className="tablet">{t.text}</div>
          <small>
            Bearing the seals of {t.seals.join(", ")}
            {t.sealedTurn !== null ? `, dated ${when(t.sealedTurn, court.power)}` : ""}.
          </small>
        </div>
      ))}
      {a.secretMandate !== null && (
        <div className="notice">
          <strong>This envoy secretly serves you.</strong> Their real instructions: “{a.secretLetter}” Mandate:{" "}
          {a.secretMandate.length > 0 ? a.secretMandate : "none given"}.
        </div>
      )}
      {a.goldBackNamed > 0 && (
        <p className="notice">You have already named {shekels(a.goldBackNamed)} to send home with the envoy; a new amount replaces it, 0 keeps it.</p>
      )}
      {a.giftAccepted > 0 && (
        <p className="notice">
          {a.envoy.name} has already accepted your gift of {shekels(a.giftAccepted)}. An envoy takes one gift per audience: another gift would not be given.
        </p>
      )}

      <div className="section">
        <h4>Your answer</h4>
        <textarea maxLength={1500} value={speech} onChange={(e) => setSpeech(e.target.value)} placeholder="Speak to the envoy; they will carry it home (in their own words)." />
        <div className="row" style={{ marginTop: ".4rem" }}>
          {a.proposal !== null && (
            <label>
              <input type="checkbox" checked={seal} onChange={(e) => setSeal(e.target.checked)} /> Seal the tablet
            </label>
          )}
          <label>
            Gift to the envoy <input type="number" min="0" value={bribe} onChange={(e) => setBribe(num(e.target.value))} />
          </label>
          <input value={bribeAsk} onChange={(e) => setBribeAsk(e.target.value)} placeholder="…in return for" style={{ flex: 1 }} />
        </div>
        <div className="row" style={{ marginTop: ".4rem" }}>
          <label>
            Offer them service at <input type="number" min="0" value={job} onChange={(e) => setJob(num(e.target.value))} /> a season
          </label>
          <label>
            Send gold back <input type="number" min="0" value={goldBack} onChange={(e) => setGoldBack(num(e.target.value))} />
          </label>
          <label>
            purity % <input type="number" min="10" max="100" value={goldPurity} onChange={(e) => setGoldPurity(num(e.target.value))} />
          </label>
        </div>
        <div className="row" style={{ marginTop: ".4rem" }}>
          <label>
            <input type="checkbox" checked={detain} onChange={(e) => setDetain(e.target.checked)} /> Detain the envoy
          </label>
          {a.round < a.maxRounds && (
            <label>
              <input type="checkbox" checked={end} onChange={(e) => setEnd(e.target.checked)} /> End the audience after this
            </label>
          )}
        </div>
        <p className="muted">
          <small>Treasury: {shekels(court.gold)}. Gifts and gold sent back are paid at once.</small>
        </p>
        <button className="primary" onClick={answer}>
          Answer
        </button>
      </div>
    </>
  );
}
