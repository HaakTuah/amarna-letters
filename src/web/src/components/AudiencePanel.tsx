import { NewsKinds, WorldMap, authorityText, newHostReply, newTabletProposal, renderClause, type AudienceView, type Clause, type HostReply, type SeatView } from "@amarna/engine";
import { useState } from "react";
import { powerName, shekels, when } from "../ui/format.ts";
import { ClauseEditor } from "./ClauseEditor.tsx";

const num = (s: string): number => (s.trim() === "" || !Number.isFinite(Number(s)) ? 0 : Math.trunc(Number(s)));

/** A foreign envoy stands before you. You hear the envoy, never the king who sent it. The form is new for every round (keyed by the caller). */
export function AudiencePanel({ a, court, structured, onAnswer }: { a: AudienceView; court: SeatView; structured: boolean; onAnswer: (r: HostReply) => void }) {
  const [speech, setSpeech] = useState("");
  // The answer in clauses (item 8), and in structured press what a bribed envoy is to tell his lord, as news.
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [bribeNews, setBribeNews] = useState<Clause[]>([]);
  const [bribeAsk, setBribeAsk] = useState("");
  const [bribe, setBribe] = useState(0);
  const [job, setJob] = useState(0);
  const [goldBack, setGoldBack] = useState(0);
  const [goldPurity, setGoldPurity] = useState(100);
  const [seal, setSeal] = useState(false);
  const [detain, setDetain] = useState(false);
  const [end, setEnd] = useState(true);
  // A tablet of our own for an envoy that carries his king's seal (item 9).
  const [counter, setCounter] = useState<Clause[]>([]);

  const answer = (): void =>
    onAnswer(
      newHostReply({
        speech: structured ? "" : speech.trim(),
        clauses,
        bribe: Math.max(0, bribe),
        bribeAsk: structured ? "" : bribeAsk.trim(),
        bribeClauses: structured ? bribeNews : [],
        jobOffer: Math.max(0, job),
        sealProposal: seal,
        detain,
        goldBack: Math.max(0, goldBack),
        goldBackPurity: Math.min(Math.max(goldPurity, 10), 100),
        end: end || detain,
        counter: a.sealCarried && counter.length > 0 ? newTabletProposal({ clauses: [...counter] }) : null,
      }),
    );

  return (
    <>
      <h3>An envoy of {powerName(a.from)} before your throne</h3>
      <p className="muted">
        Round {a.round} of {a.maxRounds} · {a.envoy.name} of {a.envoy.origin} {a.envoy.knownFacts.length > 0 ? "· " + a.envoy.knownFacts.join(" ") : ""}
      </p>
      {a.heardThrough !== null && <p className="muted">Nobody else here speaks with {a.envoy.name}: {a.heardThrough} carries his words to you, and yours to him.</p>}
      {a.presented > 0 && <p className="muted">While nobody at your court understood him, he presented gifts weighing {a.presented} shekels, now in your treasury.</p>}
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
      {a.clauses.length > 0 && (
        <div className="notice">
          <small className="muted">The clauses {a.envoy.name} recited:</small>
          <ul>
            {a.clauses.map((c, i) => (
              <li key={i}>{renderClause(c, a.from, a.host)}</li>
            ))}
          </ul>
        </div>
      )}
      {a.soFar.map((x, i) => (
        <div key={i}>
          <p style={{ marginTop: ".5rem" }}>
            <small className="muted">You said:</small> {x.host}
          </p>
          <div className="speech">{x.envoy}</div>
        </div>
      ))}

      {a.goldWeighed > 0 && !a.inventory && (
        <p className="notice">The gold came with no inventory: nobody can say what was sent. Your weighers find {shekels(a.goldWeighed)}.</p>
      )}
      {a.goldStated > 0 && a.inventory && (
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
            {a.proposal.allianceOath ? " · a sworn alliance" : ""}
            {a.proposal.vassal ? ` · a vassal treaty: ${a.proposal.vassal} the vassal` : ""}.
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
      {a.sealCarried && (
        <p className="notice">
          {a.envoy.name} carries the seal of {powerName(a.from)}: he may seal a tablet of yours in his king's name, which binds his king unless the king repudiates it as beyond his authority.
        </p>
      )}
      {a.credentials !== null && (
        <div className="notice">
          {a.envoy.name} shows his credentials. Mandate: “{a.shownMandate ?? ""}”. {authorityText(a.credentials, (x) => WorldMap.default.get(x).name)}
        </div>
      )}
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
        {!structured && (
          <textarea maxLength={1500} value={speech} onChange={(e) => setSpeech(e.target.value)} placeholder="Speak to the envoy; they will carry it home (in their own words)." />
        )}
        <small className="muted">
          {structured ? "Your answer, in clauses (structured press): accept, refuse or counter what the letter sets out." : "Your answer's clauses (kings who read only clauses read these):"}
        </small>
        <ClauseEditor clauses={clauses} onChange={setClauses} from={a.host} to={a.from} turn={a.turn} />
        {a.sealCarried && (
          <>
            <small className="muted">A tablet of your own for {a.envoy.name} to seal in his king's name (optional), from you to {powerName(a.from)}:</small>
            <ClauseEditor clauses={counter} onChange={setCounter} from={a.host} to={a.from} turn={a.turn} />
          </>
        )}
        <div className="row" style={{ marginTop: ".4rem" }}>
          {a.proposal !== null && (
            <label>
              <input type="checkbox" checked={seal} onChange={(e) => setSeal(e.target.checked)} /> Seal the tablet
            </label>
          )}
          <label>
            Gift to the envoy <input type="number" min="0" value={bribe} onChange={(e) => setBribe(num(e.target.value))} />
          </label>
          {!structured && <input value={bribeAsk} onChange={(e) => setBribeAsk(e.target.value)} placeholder="…in return for" style={{ flex: 1 }} />}
        </div>
        {structured && bribe > 0 && (
          <>
            <small className="muted">In return for the gift, news the envoy is to tell his lord as what he saw:</small>
            <ClauseEditor clauses={bribeNews} onChange={setBribeNews} from={a.host} to={a.from} turn={a.turn} only={NewsKinds} />
          </>
        )}
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
