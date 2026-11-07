import { AllPowers, WorldMap, ending, shortDate, shortEnding, type Power } from "@amarna/engine";
import { Presets, leaderRules } from "@amarna/llm";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { AudiencePanel } from "../components/AudiencePanel.tsx";
import { ChroniclePanel } from "../components/ChroniclePanel.tsx";
import { CourtStrip } from "../components/CourtStrip.tsx";
import { EventsPanel } from "../components/EventsPanel.tsx";
import { ExportLog } from "../components/ExportLog.tsx";
import { FollowPanel } from "../components/FollowPanel.tsx";
import { HistoryPanel, type HistoryOf } from "../components/HistoryPanel.tsx";
import { SearchPanel } from "../components/SearchPanel.tsx";
import { LegendsPanel } from "../components/LegendsPanel.tsx";
import { GameMap, type MapHandle, type MapView } from "../components/GameMap.tsx";
import { SimulateProgress } from "../components/SimulateProgress.tsx";
import { AudioSwitches } from "../audio/AudioSwitches.tsx";
import { player } from "../audio/player.ts";
import { useGameAudio } from "../audio/use-game-audio.ts";
import { InboxPanel } from "../components/InboxPanel.tsx";
import { MindPanel } from "../components/MindPanel.tsx";
import { ThreadsPanel } from "../components/ThreadsPanel.tsx";
import { directorShot } from "../map/director.ts";
import { MapLegend } from "../components/MapLegend.tsx";
import { MarkInfo } from "../components/MarkInfo.tsx";
import { OrdersPanel } from "../components/OrdersPanel.tsx";
import { PeoplePanel } from "../components/PeoplePanel.tsx";
import { ProvinceInfo } from "../components/ProvinceInfo.tsx";
import { ProvinceList } from "../components/ProvinceList.tsx";
import { SeasonPanel } from "../components/SeasonPanel.tsx";
import { StandingsPanel } from "../components/StandingsPanel.tsx";
import { TopBar } from "../components/TopBar.tsx";
import { FallbackNotice, TrailPanel } from "../components/TrailPanel.tsx";
import { Height, Width, city, ll } from "../map/art.ts";
import { pathOf } from "../map/scene.ts";
import { buildLifeRecord } from "../session/life-record.ts";
import { choicesOf, handLimitNeeded, newSettings, usesModels, withChoices } from "../session/settings.ts";
import { cap, powerName, when, whenCap } from "../ui/format.ts";
import { OrderDraft } from "../ui/order-draft.ts";
import { sideScroll } from "../ui/side-scroll.ts";
import { navigate } from "../ui/router.ts";
import { getTheme, setTheme } from "../ui/theme.ts";
import { setNames, useNames } from "../ui/names.ts";
import { useSession } from "../ui/use-session.ts";
import { Speeds, speedIndex, useKeys, withKey } from "../ui/keys.ts";
import { authorKind, type Thread } from "@amarna/game";

/** The keys handled with the page's tabs and cards (`windowKeys`), set after the page's early returns. */
const WindowActions = [
  "endSeason", "escape", "stepBack", "stepOn", "toNow",
  "winSeat", "winProvinces", "winStandings", "winPeople", "winInbox", "winThreads", "winEvents", "winRules", "winChronicles",
  "winMind", "winTrail", "winFollow", "winLegends", "winSearch", "winHistory",
] as const;

/** The runner's step of a season ("Turn 4: orders") in the header's words; the season itself is on the line above. */
const PhaseWords: Record<string, string> = {
  "income and arrivals": "Income and arrivals",
  "reports and pitches": "Reports and pitches",
  audiences: "Audiences",
  orders: "Orders being given",
  resolution: "The season resolves",
};
const phaseText = (phase: string): string => {
  const colon = phase.indexOf(":");
  if (!phase.startsWith("Turn ") || colon < 0) return phase;
  const step = phase.slice(colon + 1).trim();
  return PhaseWords[step] ?? cap(step);
};

let watchStarted = false;

/**
 * Where a view of the map opens the first time it is shown in a game (item 11c+; the owner: "zooming out to the full region is
 * more the exception than the rule"): a seat on its own realm and its neighbours, its capital at the centre; god view and
 * watching on the Levant on a phone, where most powers meet, and on the whole board on a wide screen. On a phone the Levant
 * opens a zoom step closer than item 11c+ opened it (item 11c++), so the coast's cities stand apart.
 */
function openingView(viewer: Power | null): MapView {
  if (viewer !== null) {
    const capital = WorldMap.default.provinces.find((p) => p.home === viewer && p.capital);
    if (capital !== undefined) return { at: city(capital.id), zoom: 2.5 };
  }
  return innerWidth < 700 ? { at: ll(33.4, 36.1), zoom: 6.7 } : { at: { x: Width / 2, y: Height / 2 }, zoom: 1 };
}

export function Play() {
  const s = useSession();
  const live = s.live;
  const [tabRaw, setTab] = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [followId, setFollowId] = useState<string | null>(null);
  // Whether a follow keeps the camera on its person: until the player moves the camera or stops following.
  const [tracking, setTracking] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [legend, setLegend] = useState(false);
  // The history window's subject (item 17+++b): a province, realm, title or person, from its card or the search.
  const [ledger, setLedger] = useState<HistoryOf | null>(null);
  // Every name on the page follows the player's name settings (ui/names.ts).
  const names = useNames();
  // Timed, as every step of a season on the page is (item 17a): from the start of this render to the DOM written.
  const renderStart = performance.now();
  useLayoutEffect(() => {
    performance.measure("page:play", { start: renderStart });
  });
  // The keys (ui/keys.ts). Space does what the play button shows, 1 to 4 set the pace, + and − step it; the rest are below.
  const windowKeys = useRef<Partial<Record<(typeof WindowActions)[number], () => void>>>({});
  const setSpeed = (i: number): void => s.setDelay(Speeds[Math.max(0, Math.min(Speeds.length - 1, i))].ms);
  useKeys({
    pause: () => {
      if (!live.hasRunner || s.frames.length === 0) return;
      if (s.autoPlaying) s.setAuto(false);
      else if (s.replaying) s.toggleReplay();
      else if (s.historyTurn !== null || live.readOnly || live.ended) {
        if (s.frames.length > 1) s.toggleReplay();
      } else if (s.canPlay) s.setAuto(true);
    },
    pace1: () => setSpeed(0),
    pace2: () => setSpeed(1),
    pace3: () => setSpeed(2),
    pace4: () => setSpeed(3),
    // + and − step between Slow, Normal and Fast; Simulate is chosen only by its own key ("Pace of play").
    faster: () => {
      if (speedIndex(s.delayMs) < 2) setSpeed(speedIndex(s.delayMs) + 1);
    },
    slower: () => setSpeed(speedIndex(s.delayMs) - 1),
    // The keys whose handlers need the page's tabs and cards, set where those are (below, `windowKeys`): each read at the
    // moment of the key press, so it sees the page as it is.
    ...Object.fromEntries(WindowActions.map((a) => [a, () => windowKeys.current[a]?.()])),
  });
  const [mark, setMark] = useState<string | null>(null);
  const [theme, setThemeState] = useState(getTheme);
  const [, bump] = useState(0);
  const map = useRef<MapHandle>(null);
  const draftRef = useRef<{ draft: OrderDraft; key: string } | null>(null);
  const audienceKey = useRef<string | null>(null);

  // A free spectator game of script kings from a link (play?watch=SEED), for showing a game to someone.
  useEffect(() => {
    const seed = Number(new URLSearchParams(location.search).get("watch"));
    if (!watchStarted && !live.hasRunner && !live.busy && Number.isInteger(seed) && seed > 0) {
      watchStarted = true;
      const settings = { ...newSettings(), seed };
      const c = choicesOf(settings);
      Presets.Free.applyTo(c);
      s.start(withChoices(settings, c), {});
    }
  }, []);


  useEffect(() => {
    document.title = `Amarna Letters — ${!live.hasRunner ? "no game" : whenCap(live.turn, viewerOf())}`;
  });

  function viewerOf(): Power | null {
    return s.viewer;
  }

  // The music and the sounds follow the season shown, as this view knows it (item 19+++).
  useGameAudio(s.frames, s.shownIndex, viewerOf(), live.hasRunner ? live.gameId : "", () => map.current?.view() ?? null);

  // Follow keeps the camera on its person as the seasons go, where the seat last knew him ("Following, travel lines and
  // borders" under Interface), until the player moves the camera or stops following.
  const followPath = followId !== null && s.frames.length > 0 ? pathOf(s.frames, s.shownIndex, viewerOf(), followId) : null;
  const followAt = tracking ? (followPath?.at(-1)?.at ?? null) : null;
  useEffect(() => {
    if (followAt !== null) map.current?.focus(followAt, 1, true);
  }, [followAt?.x, followAt?.y]);

  // Item 17+++, part F: the season's threads to watch for the eyes the page sees through, read while their tab is open or
  // the director camera is on, and only while the record is open to the page; the camera, off by default, takes the map
  // to the season's highest-stakes scene as it plays out, unless a follow holds it.
  const [director, setDirector] = useState(false);
  const [threads, setThreads] = useState<{ key: string; tellings: Thread[][] } | null>(null);
  const [trailOnly, setTrailOnly] = useState<string | null>(null);
  const threadsAt = `${live.gameId}:${live.generation}:${s.shownIndex}:${viewerOf() ?? ""}`;
  const wantThreads = live.hasRunner && s.canSeeAll && (tabRaw === "threads" || director);
  const readThreads = (anew: boolean): (() => void) => {
    let on = true;
    void s.threads(s.shownIndex, viewerOf(), anew).then((tellings) => on && setThreads({ key: threadsAt, tellings }));
    return () => {
      on = false;
    };
  };
  useEffect(() => (wantThreads ? readThreads(false) : undefined), [wantThreads, threadsAt]);
  const tellings = wantThreads && threads?.key === threadsAt ? threads.tellings : null;
  const playout = s.playoutAt(s.shownIndex, viewerOf());
  useEffect(() => {
    if (!director || playout === null || tellings === null || tracking || s.playoutHeld) return;
    const shot = directorShot(playout.play.timeline, tellings[0] ?? []);
    if (shot === null) return;
    const timer = window.setTimeout(() => map.current?.focus(shot.at, 2.2, true), Math.max(0, shot.time - (performance.now() - playout.began)));
    return () => window.clearTimeout(timer);
  }, [director, playout?.began, tellings, tracking, s.playoutHeld]);

  // Simulate draws nothing while it runs (item 17+++): a progress bar and the count of seasons, and the way back to watching.
  if (live.hasRunner && s.simulating)
    return (
      <SimulateProgress
        seasons={Math.max(0, s.frames.length - 1)}
        when={whenCap(live.turn, viewerOf())}
        onPause={() => s.setAuto(false)}
        onWatch={() => s.setDelay(Speeds[2].ms)}
      />
    );

  if (!live.hasRunner || s.frames.length === 0 || s.state === null) {
    // No game on screen yet: the pages' own bar stays, so the other pages are a tap away.
    const startPage = (e: MouseEvent, saved: boolean): void => {
      e.preventDefault();
      navigate("");
      if (saved) requestAnimationFrame(() => document.getElementById("saved-games")?.scrollIntoView());
    };
    return (
      <>
        {!live.busy && !live.hasRunner && <TopBar />}
        <div className="page">
          {live.error !== null && <div className="notice error">The game could not start: {live.error}</div>}
          {live.busy || live.hasRunner ? (
            <p>Preparing the game…</p>
          ) : (
            <p>
              No game is running.{" "}
              <a href="./" onClick={(e) => startPage(e, false)}>
                Start one
              </a>{" "}
              or{" "}
              <a href="./" onClick={(e) => startPage(e, true)}>
                open a saved game
              </a>
              .
            </p>
          )}
        </div>
      </>
    );
  }

  const state = s.state;
  const viewer = viewerOf();
  const index = s.shownIndex;
  const scene = s.scene(index, viewer);
  const frame = scene.frame;
  const history = s.historyTurn !== null;
  const pendingOrders = !history ? (s.asks.find((a) => a.orders !== null) ?? null) : null;
  const pendingAudience = !history ? (s.asks.find((a) => a.audience !== null) ?? null) : null;

  // A new seat view for orders starts a new draft and opens the orders tab, once.
  let tab = tabRaw;
  if (pendingOrders === null) draftRef.current = null;
  else {
    const key = `${pendingOrders.power}:${pendingOrders.orders!.turn}`;
    if (draftRef.current?.key !== key) {
      draftRef.current = { draft: new OrderDraft(pendingOrders.orders!), key };
      tab = "orders";
    }
  }
  const draft = draftRef.current?.draft ?? null;
  // A new envoy before the throne takes the panel, once.
  const aKey = pendingAudience === null ? null : `${pendingAudience.audience!.view.audienceId}:${pendingAudience.audience!.view.round}`;
  if (aKey !== null && aKey !== audienceKey.current) {
    tab = "audience";
    // Realm news is an event sound, the seat's own: never in god view, even with the board revealed.
    if (!s.godView) player.play("envoy");
  }
  audienceKey.current = aKey;
  if (tab === "audience" && pendingAudience === null) tab = "";
  if (tab === "orders" && pendingOrders === null) tab = "";
  if (tab === "inbox" && viewer === null) tab = "";
  if (tab === "trail" && !s.godView) tab = "";
  if (tab === "legends" && !s.godView) tab = "";
  if (tab === "threads" && !s.canSeeAll) tab = "";
  // Item 17+++: a model king's own words, where the record is open to the page and a seat is watched.
  const minded = viewer !== null && s.canSeeAll && authorKind(live.seats[viewer] ?? "Human") === "model";
  if (tab === "mind" && !minded) tab = "";
  if (tab === "follow" && followId === null) tab = "";
  if (tab === "history" && ledger === null) tab = "";
  if (tab === "") tab = pendingAudience !== null ? "audience" : pendingOrders !== null ? "orders" : "season";
  if (tab !== tabRaw) queueMicrotask(() => setTab(tab));

  // A human seat's orders take the map's taps, and the province list's, while either tab is open.
  const useDraft = (tab === "orders" || tab === "provinces") && draft !== null;
  const last = s.frames.length - 1;
  const displayed = s.displayed ?? state;

  const pick = (t: string): void => {
    // The open tab, tapped again, pulls the panel up over the map (on a phone held upright) or drops it back.
    if (tab === t) setSheet(!sheet);
    else setTab(t);
  };
  const tabClass = (t: string, alert = false): string => (tab === t ? "on " : "") + (alert && tab !== t ? "alert" : "");

  const ordering = (tab === "orders" || tab === "provinces") && draft !== null;
  /** A card open over the map (a province, a mark, the legend): a tap on the map outside it closes it (item 11c+). */
  const carded = (!ordering && selectedProvince !== null) || mark !== null || legend;
  const closeCards = (): void => {
    setSelectedProvince(null);
    setMark(null);
    setLegend(false);
  };
  const chosen = (province: string): void => {
    if (ordering) {
      draft.click(province);
      bump((x) => x + 1);
    } else {
      setMark(null);
      setSelectedProvince(province);
    }
  };
  const clicked = (province: string): void => {
    if (carded) closeCards();
    else chosen(province);
  };
  /** A mark tapped: its card; while an order is drafted, the province under it is chosen instead. */
  const markTapped = (id: string, province: string | null): void => {
    if (ordering) {
      if (province !== null) chosen(province);
    } else if (carded) closeCards();
    else setMark(id);
  };
  /** A province chosen from the list: selected as a tap on the map would, and brought into view. */
  const fromList = (province: string): void => {
    const picking = draft?.selected != null;
    chosen(province);
    // The camera goes to the province chosen: a follow no longer keeps it on its person.
    setTracking(false);
    // A destination picked for an order: back to the orders, which now show it.
    if (picking && draft?.selected === null) setTab("orders");
    setSheet(false);
    map.current?.focus(city(province), 2.2);
  };
  const follow = (id: string): void => {
    closeCards();
    setFollowId(id);
    setTracking(true);
    setTab("follow");
    const path = pathOf(s.frames, s.shownIndex, viewer, id);
    if (path.length > 0) map.current?.focus(path[path.length - 1].at, 1.6, true);
  };
  /** A thing's history button: its window, in front. */
  const showHistory = (h: HistoryOf): void => {
    setLedger(h);
    setTab("history");
    setSheet(false);
  };
  const stopFollowing = (): void => {
    setFollowId(null);
    setTracking(false);
    setTab("season");
  };
  /** The season's orders sealed (item 19+++ plays the seal): by the orders' own button, or Enter. */
  const seal = (sleep: boolean): void => {
    if (pendingOrders === null || draft === null) return;
    player.play("seal");
    s.submitOrders(pendingOrders.power, { ...draft.build(), stayAwake: !sleep });
  };
  /** A window opened by its key: shown when the page offers it now (a tab it hides is left alone), never toggled. */
  const open = (t: string, offered: boolean): (() => void) => () => {
    if (!offered) return;
    setTab(t);
    setSheet(false);
  };
  windowKeys.current = {
    endSeason: () => seal(false),
    stepBack: () => {
      if (index > 0) s.stepBack();
    },
    stepOn: () => s.stepForward(),
    toNow: () => {
      if (history) s.showTurn(null);
    },
    // Escape: the card or window in front (a card over the map closes itself: MapCard), the menu, the enlarged panel; else
    // the menu opens.
    escape: () => {
      if (document.querySelector(".mapcard") !== null) return;
      const menu = document.querySelector<HTMLDetailsElement>("details.menu");
      if (menu?.open === true) menu.open = false;
      else if (sheet) setSheet(false);
      else if (menu !== null) menu.open = true;
    },
    winSeat: open(pendingAudience !== null ? "audience" : pendingOrders !== null ? "orders" : "season", true),
    winProvinces: open("provinces", true),
    winStandings: open("standings", true),
    winPeople: open("people", true),
    winInbox: open("inbox", viewer !== null),
    winThreads: open("threads", s.canSeeAll),
    winEvents: open("events", true),
    winRules: open("rules", true),
    winChronicles: open("chronicle", state.ended && Object.keys(live.chronicles).length > 0),
    winMind: open("mind", minded),
    winTrail: open("trail", s.godView),
    winFollow: open("follow", followId !== null),
    winLegends: open("legends", s.godView),
    winSearch: open("search", true),
    winHistory: open("history", ledger !== null),
  };

  // The last season's frame still shows the age's end until the next season is played, after the table played on.
  const playedOn = !history && frame.ended && !live.ended;
  const endingLine =
    frame.ended && !playedOn
      ? `${frame.endReason === null ? "The age has ended" : cap(frame.endReason)}. Winner: ${frame.winners.map(powerName).join(" and ")}.${s.hasHumans && live.ended ? " The record is open to every seat: choose God view, and read the Legends." : ""}`
      : playedOn
        ? ending(true, { turn: frame.index, winners: frame.winners }, viewer)
        : ending(frame.openAge, frame.ageEnded, viewer, frame.ageBand);
  const shortLine = frame.ended && !playedOn ? `Ended · winner ${frame.winners.join(" and ")}` : shortEnding(frame.openAge || playedOn);
  const showsCost = usesModels(live.settings) || live.cost > 0;
  // An open age has no end, so with model-played seats the table sets the spending limit itself before playing on.
  const playOn = (): void => {
    if (!handLimitNeeded(live.settings)) return s.playOn();
    const answer = window.prompt(
      `An open age has no end, and its model calls none either. The game has spent $${live.cost.toFixed(2)}. At how many dollars in all should it pause?`,
    );
    if (answer === null) return;
    s.playOn(Number(answer));
  };
  const localAgents = choicesOf(live.settings).usesLocalAgents;

  return (
    <div className={`game${sheet ? " sheet" : ""} tab-${tab}`}>
      <header className="ghead">
        <a
          className="brand"
          href=""
          title="New game"
          onClick={(e) => {
            e.preventDefault();
            navigate("");
          }}
        >
          A<span>L</span>
        </a>
        <div className="when">
          <div className="date" title={history ? "The season shown" : "The season being played"}>
            {history ? (
              <>
                <span className="hist">History</span> {whenCap(index, viewer)}
              </>
            ) : (
              whenCap(live.turn, viewer)
            )}
          </div>
          <div className="ending" title={endingLine}>
            {!history && <span className="phase">{phaseText(live.phase)} · </span>}
            <span className="long">{endingLine}</span>
            {/* The short form, as in dense lists: the turn is in the tooltip. */}
            <span className="short">{shortLine}</span>
            {!history && live.canPlayOn && (
              <button className="link" onClick={() => playOn()} title="The winner stays recorded; the game goes on with no end">
                Play on into an open age
              </button>
            )}
          </div>
        </div>
        <div className="gctl">
          {!s.canSeeAll && live.humans.length === 1 ? (
            // One seat and nothing else to see: its name, not a menu of one (a menu's arrow cut "Egypt (you)" at 390 px).
            <span className="viewsel seatname" title="Your seat">
              {powerName(live.humans[0])} (you)
            </span>
          ) : (
          <select
            className="viewsel"
            value={s.viewAs ?? ""}
            onChange={(e) => {
              s.setViewAs(e.target.value === "" ? null : (e.target.value as Power));
              if (tab === "inbox" || tab === "trail") setTab("");
            }}
            aria-label="Whose eyes"
          >
            {s.canSeeAll ? (
              <>
                <option value="">God view</option>
                {AllPowers.map((p) => (
                  <option key={p} value={p}>
                    As {powerName(p)}
                  </option>
                ))}
              </>
            ) : (
              live.humans.map((p) => (
                <option key={p} value={p}>
                  {powerName(p)} (you)
                </option>
              ))
            )}
          </select>
          )}
          {showsCost && (
            <span className="pill cost" title={live.costUnknown ? "Model spend for this game: a model with no price was called, so its part is unknown" : "Model spend for this game"}>
              ${live.cost.toFixed(2)}
              {live.costUnknown && " + unknown"}
              <span className="hide-sm"> / ${live.settings.budgetUsd.toFixed(2)}</span>
            </span>
          )}
          <details className="menu">
            <summary aria-label="More" title={withKey("More", "escape")}>
              ⋯
            </summary>
            <div className="menu-body">
              <a
                href=""
                onClick={(e) => {
                  e.preventDefault();
                  navigate("");
                }}
              >
                New game
              </a>
              <a
                href="about"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("about");
                }}
              >
                How it works
              </a>
              <a
                href="keys"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("keys");
                }}
              >
                Keys
              </a>
              {/* The export is the whole record: offered only when the god view is (Engine and models, "Logging and replay"). */}
              {s.canSeeAll && <ExportLog onExport={(parts) => void s.export(parts)} />}
              <AudioSwitches />
              <label>
                Pace{" "}
                <select
                  value={Speeds[speedIndex(s.delayMs)].ms}
                  onChange={(e) => {
                    s.setDelay(Number(e.target.value));
                    // Let go of the menu, so Space and the pace keys work again at once.
                    e.target.blur();
                  }}
                  title="Keys 1 to 4 set the pace; + and − make it faster or slower"
                >
                  {Speeds.map((x, i) => (
                    <option key={x.ms} value={x.ms}>
                      {i + 1}: {x.name}
                    </option>
                  ))}
                </select>
              </label>
              {/* "History, search and names" (item 17+++b): the names this player sees, never a request to a model. */}
              <label title="Places by their names of 1346 (Gubla), or by the names a reader knows today (Byblos)">
                Places{" "}
                <select value={names.places} onChange={(e) => setNames({ places: e.target.value as "period" | "modern" })}>
                  <option value="period">Names of 1346</option>
                  <option value="modern">Modern names</option>
                </select>
              </label>
              <label title="The Great Kings' realms by the names people know (Egypt), or by their own letters' names (Miṣri)">
                Realms{" "}
                <select value={names.realms} onChange={(e) => setNames({ realms: e.target.value as "known" | "period" })}>
                  <option value="known">Names people know</option>
                  <option value="period">Names of 1346</option>
                </select>
              </label>
              <label>
                Theme{" "}
                <select
                  value={theme}
                  onChange={(e) => {
                    setThemeState(e.target.value);
                    setTheme(e.target.value);
                  }}
                >
                  <option value="">As the system</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              {s.hasHumans && (
                <label title="Shows everything the engine knows: spoils the game">
                  <input type="checkbox" checked={s.reveal} onChange={(e) => s.setReveal(e.target.checked)} /> Reveal all
                </label>
              )}
            </div>
          </details>
        </div>
      </header>

      <CourtStrip scene={scene} />

      <section className="mapcol">
        <GameMap
          ref={map}
          input={{
            scene,
            selected: useDraft ? draft!.selected : selectedProvince,
            targets: useDraft ? draft!.targets() : null,
            arrows: useDraft ? draft!.arrows() : null,
            followId,
            followPath,
            playout: s.playoutAt(index, viewer),
            held: s.playoutHeld,
          }}
          viewKey={`${live.gameId}:${viewer ?? "god"}`}
          opening={openingView(viewer)}
          onProvince={clicked}
          onCamera={() => setTracking(false)}
          onPerson={(id) => (carded ? closeCards() : follow(id))}
          onMark={markTapped}
          onBlank={closeCards}
        >
          <button className="map-ui legend-btn" onClick={() => setLegend(!legend)} aria-expanded={legend ? "true" : "false"}>
            Legend
          </button>
          {legend && <MapLegend config={state.config} onClose={() => setLegend(false)} />}
          {mark !== null && <MarkInfo id={mark} config={state.config} onClose={() => setMark(null)} />}
          {selectedProvince !== null && !useDraft && (
            <ProvinceInfo state={state} id={selectedProvince} scene={scene} onClose={() => setSelectedProvince(null)} onPerson={follow} onHistory={showHistory} />
          )}
          {(index < last || frame.index > 0) && <div className="map-ui season-tag">{index === 0 ? "Opening positions" : `Moves of ${shortDate(index, viewer)}`}</div>}
        </GameMap>
      </section>

      <aside className="side">
        <button className="sheet-handle" onClick={() => setSheet(!sheet)} aria-label={sheet ? "Show the map" : "Enlarge the panel"}>
          <span className="grip"></span>
          <span className="sr">{sheet ? "Show the map" : "Enlarge the panel"}</span>
        </button>
        <div className="tabs" role="tablist" ref={sideScroll}>
          {pendingAudience !== null && (
            <button className={tabClass("audience", true)} onClick={() => pick("audience")} title={withKey("Audience!", "winSeat")}>
              Audience!
            </button>
          )}
          {pendingOrders !== null && (
            <button className={tabClass("orders", true)} onClick={() => pick("orders")} title={withKey("Your orders", "winSeat")}>
              Your orders
            </button>
          )}
          <button className={tabClass("season")} onClick={() => pick("season")} title={withKey("Season", "winSeat")}>
            Season
          </button>
          {viewer !== null && (
            <button className={tabClass("inbox")} onClick={() => pick("inbox")} title={withKey("Inbox", "winInbox")}>
              Inbox
            </button>
          )}
          {minded && (
            <button className={tabClass("mind")} onClick={() => pick("mind")} title={withKey("Own words", "winMind")}>
              Own words
            </button>
          )}
          {s.canSeeAll && (
            <button className={tabClass("threads")} onClick={() => pick("threads")} title={withKey("Threads", "winThreads")}>
              Threads
            </button>
          )}
          {s.godView && (
            <button className={tabClass("trail")} onClick={() => pick("trail")} title={withKey("Trail", "winTrail")}>
              Trail
            </button>
          )}
          <button className={tabClass("people")} onClick={() => pick("people")} title={withKey("People", "winPeople")}>
            People
          </button>
          {followId !== null && (
            <button className={tabClass("follow")} onClick={() => pick("follow")} title={withKey("Follow", "winFollow")}>
              Follow
            </button>
          )}
          <button className={tabClass("search")} onClick={() => pick("search")} title={withKey("Search", "winSearch")}>
            Search
          </button>
          {ledger !== null && (
            <button className={tabClass("history")} onClick={() => pick("history")} title={withKey("History", "winHistory")}>
              History
            </button>
          )}
          <button className={tabClass("provinces")} onClick={() => pick("provinces")} title={withKey("Provinces", "winProvinces")}>
            Provinces
          </button>
          <button className={tabClass("standings")} onClick={() => pick("standings")} title={withKey("Standings", "winStandings")}>
            Standings
          </button>
          <button className={tabClass("events")} onClick={() => pick("events")} title={withKey("Events", "winEvents")}>
            Events
          </button>
          {s.godView && (
            <button className={tabClass("legends")} onClick={() => pick("legends")} title={withKey("Legends", "winLegends")}>
              Legends
            </button>
          )}
          <button className={tabClass("rules")} onClick={() => pick("rules")} title={withKey("Rules", "winRules")}>
            Rules
          </button>
          {state.ended && Object.keys(live.chronicles).length > 0 && (
            <button className={tabClass("chronicle")} onClick={() => pick("chronicle")} title={withKey("Chronicles", "winChronicles")}>
              Chronicles
            </button>
          )}
        </div>
        <div className="notices">
          {live.error !== null && (
            <div className="notice error">
              {live.error}{" "}
              <button className="small" onClick={() => s.clearMessages()}>
                Dismiss
              </button>
            </div>
          )}
          {live.notice !== null && (
            <div className="notice">
              {live.notice}{" "}
              {live.notice.startsWith("Paused") && (
                <button className="small" onClick={() => s.raiseBudget(5)}>
                  Add $5
                </button>
              )}
            </div>
          )}
          {/* A human seat asleep (item 9+a): the seasons pass by themselves until something concerns it, or it wakes itself. */}
          {live.humansAsleep.map((p) => (
            <div className="notice" key={`asleep-${p}`}>
              {powerName(p)} sleeps: the seasons pass until something concerns you.{" "}
              <button className="small" onClick={() => s.wake(p)}>
                Wake now
              </button>
            </div>
          ))}
          {/* Local play: nothing moves while the other kings' agents think. Which kings are asked is not said: it would tell who sleeps. */}
          {live.busy &&
            !history &&
            pendingOrders === null &&
            pendingAudience === null &&
            localAgents &&
            (live.phase.endsWith(": orders") || live.phase.endsWith(": audiences")) && (
              <div className="notice">The other kings are deciding: their agents answer in the Claude Code session on this computer, which can take a few minutes.</div>
            )}
          {(s.godView || !s.hasHumans) && <FallbackNotice live={live} />}
        </div>
        <div className="panelbody">
          {panel()}
        </div>
      </aside>

      <footer className="timebar">
        <button className="tb" disabled={index <= 0} onClick={() => s.stepBack()} title={withKey("One season back", "stepBack")} aria-label="One season back">
          ◀
        </button>
        {s.autoPlaying ? (
          <button className="tb play on" onClick={() => s.setAuto(false)} title={withKey("Pause", "pause")} aria-label="Pause">
            ❚❚
          </button>
        ) : s.replaying ? (
          <button className="tb play on" onClick={() => s.toggleReplay()} title={withKey("Stop the replay", "pause")} aria-label="Stop the replay">
            ❚❚
          </button>
        ) : history || live.readOnly || live.ended ? (
          <button className="tb play" disabled={last < 1} onClick={() => s.toggleReplay()} title={withKey("Replay the seasons", "pause")} aria-label="Replay the seasons">
            ▶
          </button>
        ) : (
          <button className="tb play primary" disabled={!s.canPlay} onClick={() => s.setAuto(true)} title={withKey("Auto-play", "pause")} aria-label="Auto-play">
            ▶
          </button>
        )}
        <button
          className="tb"
          disabled={!history && !s.canPlay}
          onClick={() => s.stepForward()}
          title={withKey(history ? "One season on" : "Play one season", "stepOn")}
          aria-label={history ? "One season on" : "Play one season"}
        >
          {history ? "▶︎|" : "+1"}
        </button>
        <input
          className="slider"
          type="range"
          min="0"
          max={Math.max(0, last)}
          value={index}
          aria-label="Season"
          onChange={(e) => s.showTurn(Number(e.target.value))}
          disabled={last < 1}
        />
        {/* Looking back on a phone, the header names the season shown, so the bar keeps its room for the slider. */}
        <span className={history ? "tlabel hide-sm" : "tlabel"} title={index === 0 ? "The start" : `The board after ${when(index, viewer)}`}>
          {/* A stop on the bar is the board after a season's moves, so the label says "after", never the season the header plans. */}
          {index === 0 ? "Start" : `after ${shortDate(index, viewer)}`}
          {!history && <span className="hide-sm"> · now</span>}
        </span>
        {history && (
          <button className="tb now" onClick={() => s.showTurn(null)} title={withKey("Back to now", "toNow")}>
            Now
          </button>
        )}
      </footer>
    </div>
  );

  function panel() {
    switch (tab) {
      case "audience": {
        const a = pendingAudience!.audience!;
        return (
          <AudiencePanel
            key={aKey!}
            a={a.view}
            court={a.court}
            structured={state.config.pressMode === "structured"}
            onAnswer={(r) => {
              // The answer closed in its envelope and given to the envoy (item 19+++).
              player.play("envelope");
              s.answer(pendingAudience!.power, r);
            }}
          />
        );
      }
      case "orders":
        return (
          <OrdersPanel
            key={draftRef.current!.key}
            draft={draft!}
            state={state}
            onChanged={() => bump((x) => x + 1)}
            onSubmit={seal}
          />
        );
      case "inbox":
        return <InboxPanel state={displayed} power={viewer!} />;
      case "mind":
        return <MindPanel power={viewer!} turn={s.shownIndex} session={s} />;
      case "trail":
        return <TrailPanel state={displayed} authors={live.trailAuthors} onPerson={follow} only={trailOnly} onAll={() => setTrailOnly(null)} />;
      case "threads":
        return (
          <ThreadsPanel
            tellings={tellings}
            trails={s.godView}
            director={director}
            canTellAnew={!live.readOnly}
            onPerson={follow}
            onTrail={(id) => {
              setTrailOnly(id);
              setTab("trail");
            }}
            onPlace={(province) => {
              setTracking(false);
              setSheet(false);
              setMark(null);
              setSelectedProvince(province);
              map.current?.focus(city(province), 2.2);
            }}
            onDirector={setDirector}
            onTellAnew={() => void readThreads(true)}
          />
        );
      case "people":
        return <PeoplePanel state={displayed} viewer={viewer} onPerson={follow} onHistory={showHistory} />;
      case "follow":
        return <FollowPanel record={lifeRecord()} viewer={viewer} onProvince={clicked} onClose={stopFollowing} onTrack={tracking ? null : () => setTracking(true)} />;
      case "provinces":
        return <ProvinceList scene={scene} selected={useDraft ? draft!.selected : selectedProvince} onProvince={fromList} />;
      case "standings":
        return <StandingsPanel state={displayed} viewer={viewer} seats={live.seats} onHistory={showHistory} />;
      case "rules":
        // The rulebook a model king reads, so a human seat reads the same rules.
        return (
          <>
            <h3>The rulebook</h3>
            <p className="muted">
              What every king is told, word for word. You give your orders with the controls of the orders tab; they are checked units first, then your
              other orders in the order you added them. Where the rulebook speaks of answering in JSON, or of the notes, summary and ledger under HOW TO
              ANSWER, it speaks to model kings: you keep your own notes.
              {state.config.sleepingSeats
                ? " A human seat sleeps only when you choose to: seal your orders with a sleep and the seasons pass by themselves, your standing and scheduled orders acting for you, until something concerns you or you wake yourself."
                : ""}{" "}
              Standing orders do: give them in the orders tab, under Standing orders. If your kingdom falls with its capital, your game is over: you watch the
              rest{" "}
              {state.config.fallenSeeAll
                ? "in god view, seeing everything (this table's setting)"
                : "with what your kingdom knew when it fell (this table's setting)"}
              .
            </p>
            <div className="item">
              <div className="body">{leaderRules(state.config.customsPrimer, state.config)}</div>
            </div>
          </>
        );
      case "chronicle":
        return <ChroniclePanel state={state} chronicles={live.chronicles} anew={live.chroniclesAnew} onTellAnew={live.readOnly ? null : () => s.chroniclesAnew()} />;
      case "legends":
        return <LegendsPanel state={displayed} onProvince={clicked} />;
      case "search":
        return <SearchPanel state={displayed} viewer={viewer} record={viewer === null || state.ended} scene={scene} onHistory={showHistory} onProvince={fromList} onPerson={follow} />;
      case "history":
        return <HistoryPanel state={displayed} of={ledger!} viewer={viewer} record={viewer === null || state.ended} onProvince={fromList} onHistory={showHistory} onClose={() => setLedger(null)} />;
      case "events":
        return <EventsPanel state={state} upTo={s.historyTurn} viewer={viewer} />;
      default:
        return <SeasonPanel scene={scene} onProvince={clicked} onPerson={follow} />;
    }
  }

  function lifeRecord() {
    return buildLifeRecord(s.frames, (i) => s.scene(i, viewer), index, displayed, viewer, followId!);
  }
}

