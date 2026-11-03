/**
 * Simulate, the fourth pace ("Pace of play" under Interface, item 17+++): no visuals at all while the game is computed as
 * fast as the machine allows, only a progress bar and the count of seasons. The bar runs without an end, since when the age
 * ends is hidden from every seat. Pausing, or the age's end, opens the game at its last season with the timeline, to watch
 * any part of it at any pace.
 */
import { Speeds, withKey } from "../ui/keys.ts";

export function SimulateProgress(props: { seasons: number; when: string; onPause: () => void; onWatch: () => void }) {
  const { seasons, when, onPause, onWatch } = props;
  return (
    <div className="page simulate" role="status" aria-live="off" data-season={seasons}>
      <h1>Simulating</h1>
      <progress aria-label="The game is being computed" />
      <p className="simulate-count">
        {seasons === 1 ? "1 season played" : `${seasons} seasons played`}, now {when}.
      </p>
      <p className="simulate-note">Nothing is drawn while the seasons are computed. Pause to open the game at its last season and watch any of it from the timeline.</p>
      <div className="simulate-actions">
        <button className="primary" onClick={onPause} title={withKey("Pause", "pause")}>
          Pause and watch
        </button>
        <button onClick={onWatch}>Play on at {Speeds[2].name}</button>
      </div>
    </div>
  );
}
