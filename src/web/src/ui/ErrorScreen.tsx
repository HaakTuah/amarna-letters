/**
 * No error leaves a white page (item 17a). Whatever throws while the page draws, or anywhere in the page uncaught, shows a
 * plain screen saying what went wrong, with the seed, the season and the error to copy into a report, and a way back: the
 * game itself lives in the engine's worker and is saved after every season, so the page can go back to it, or reload into
 * it from its last saved season.
 */
import { CURRENT_VERSION, dateLabel } from "@amarna/engine";
import { Component, useState, type ReactNode } from "react";
import { session } from "../session/client.ts";
import { reloadInto } from "./update.ts";

declare const __BUILD_ID__: string;

/** An error caught somewhere, with where it was caught. */
export interface Caught {
  error: unknown;
  where: string;
  /** React's component stack, for an error thrown while drawing. */
  components?: string;
}

const listeners = new Set<(c: Caught) => void>();

/** Reports an error caught outside React's drawing (an uncaught error or rejection on the page): the screen shows it too. */
export function reportError(c: Caught): void {
  listeners.forEach((f) => f(c));
}

/** Hooks the page's uncaught errors and unhandled rejections to the screen. Called once, as the page starts. */
export function catchPageErrors(): void {
  addEventListener("error", (e) => reportError({ error: e.error ?? e.message, where: "uncaught on the page" }));
  addEventListener("unhandledrejection", (e) => reportError({ error: e.reason, where: "an unhandled rejection on the page" }));
}

const messageOf = (e: unknown): string => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));
const stackOf = (e: unknown): string => (e instanceof Error && e.stack ? e.stack.split("\n").slice(0, 12).join("\n") : "");

/** The report to copy: the versions, the game and the season, the error, the browser. */
export function reportText(c: Caught): string {
  const live = session.live;
  const seed = session.state?.seed ?? null;
  const game = live.hasRunner ? `seed ${seed ?? "?"}, ${dateLabel(live.turn)} (season ${live.turn}), game ${live.gameId}${live.auto ? ", auto-play" : ""}, speed ${session.delayMs} ms` : "no game running";
  return [
    "Amarna Letters: an error on the page",
    `Build ${__BUILD_ID__}, rules version ${CURRENT_VERSION}`,
    `Game: ${game}`,
    `Caught: ${c.where}`,
    `Error: ${messageOf(c.error)}`,
    stackOf(c.error),
    c.components ? `Components:${c.components.split("\n").slice(0, 8).join("\n")}` : "",
    `Browser: ${navigator.userAgent}, ${innerWidth}x${innerHeight}`,
    `Time: ${new Date().toISOString()}`,
  ]
    .filter((x) => x !== "")
    .join("\n");
}

function CrashScreen({ caught, again, onBack }: { caught: Caught; again: boolean; onBack: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const live = session.live;
  const text = reportText(caught);
  const copy = (): void => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied("Copied."))
      .catch(() => setCopied("Could not copy: select the report and copy it by hand."));
  };
  return (
    <div className="crash" role="alert">
      <h1>Something went wrong on the page</h1>
      <p>
        {live.hasRunner
          ? `The game itself goes on in its engine and is saved after every season: nothing is lost. The page hit an error while drawing ${dateLabel(live.turn)} (season ${live.turn}) of seed ${session.state?.seed ?? "?"}.`
          : "The page hit an error while no game was running."}
        {again && " Going back failed at once with the same error, so reloading into the game is the way back."}
      </p>
      <pre className="crash-report">{text}</pre>
      <div className="crash-actions">
        <button className="small" onClick={copy}>
          Copy the report
        </button>
        {live.hasRunner && !again && <button className="primary small" onClick={onBack}>Back to the game</button>}
        {live.hasRunner && (
          <button className="small" onClick={() => reloadInto(live.gameId)}>
            Reload into this game
          </button>
        )}
        <button className="small" onClick={() => reloadInto(null)}>
          To the start screen
        </button>
        {copied !== null && <span className="muted">{copied}</span>}
      </div>
      <p className="muted">
        Please paste the report into an issue or a message: the seed and the season let the error be replayed exactly.
      </p>
    </div>
  );
}

interface BoundaryState {
  caught: Caught | null;
  /** When the page last went back from the screen: a second error right after means going back does not help. */
  backAt: number;
  again: boolean;
}

/** Wraps the whole app: an error while drawing, or reported from the page, shows the screen in its place. */
export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { caught: null, backAt: 0, again: false };
  private readonly onReport = (c: Caught): void => {
    if (this.state.caught === null) this.setState({ caught: c, again: false });
  };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { caught: { error, where: "while drawing the page" } };
  }

  override componentDidCatch(_error: unknown, info: { componentStack?: string | null }): void {
    const again = Date.now() - this.state.backAt < 3000;
    this.setState((s) => ({ caught: s.caught === null ? null : { ...s.caught, components: info.componentStack ?? undefined }, again }));
  }

  override componentDidMount(): void {
    listeners.add(this.onReport);
  }
  override componentWillUnmount(): void {
    listeners.delete(this.onReport);
  }

  override render(): ReactNode {
    const c = this.state.caught;
    if (c === null) return this.props.children;
    return <CrashScreen caught={c} again={this.state.again} onBack={() => this.setState({ caught: null, backAt: Date.now() })} />;
  }
}
