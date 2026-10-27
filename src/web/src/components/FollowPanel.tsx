import { shortDate, type Power } from "@amarna/engine";
import type { LifeRecord } from "../session/life-record.ts";
import { powerName, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";

/** "Follow this character": one person's life as the current view may know it, with their path drawn on the map. */
export function FollowPanel({
  record,
  viewer,
  onProvince,
  onClose,
}: {
  record: LifeRecord;
  viewer: Power | null;
  onProvince: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {!record.known ? (
        <>
          <h3>{record.name}</h3>
          <p className="muted">{record.now}</p>
        </>
      ) : (
        <>
          <div className="follow-head">
            <Emblem power={record.employer} />
            <div>
              <h3>
                {record.name} <small className="muted">{record.subtitle}</small>
              </h3>
              <p className="small">{record.now}</p>
            </div>
          </div>
          <p className="muted small">
            Their path up to the season shown is drawn on the map; step the timeline to walk it. {viewer !== null ? `Only what ${powerName(viewer)} knows is shown.` : ""}
          </p>
          {record.sections.map((s) => (
            <div key={s.title}>
              <h4>{s.title}</h4>
              {s.note !== null && <p className="muted small">{s.note}</p>}
              <ul className="life">
                {s.entries.map((e, i) => (
                  <li
                    key={i}
                    onClick={() => {
                      if (e.province !== null) onProvince(e.province);
                    }}
                    className={(e.province === null ? "" : "tap ") + (e.from > 0 ? "" : "nodate")}
                  >
                    {e.from > 0 && (
                      <span className="when" title={when(e.from, viewer)}>
                        {shortDate(e.from, viewer)}
                        {e.until !== null && e.until > e.from ? ` – ${shortDate(e.until, viewer)}` : ""}
                      </span>
                    )}
                    <span className="what">{e.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      <button className="small" onClick={onClose}>
        Stop following
      </button>
    </>
  );
}
