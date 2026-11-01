import { AllPowers, WorldMap, ending, shortDate, shortEnding, type Power } from "@amarna/engine";
import { Presets, leaderRules } from "@amarna/llm";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AudiencePanel } from "../components/AudiencePanel.tsx";
import { ChroniclePanel } from "../components/ChroniclePanel.tsx";
import { CourtStrip } from "../components/CourtStrip.tsx";
import { EventsPanel } from "../components/EventsPanel.tsx";
import { FollowPanel } from "../components/FollowPanel.tsx";
import { LegendsPanel } from "../components/LegendsPanel.tsx";
import { GameMap, type MapHandle, type MapView } from "../components/GameMap.tsx";
import { AudioSwitches } from "../audio/AudioSwitches.tsx";
import { player } from "../audio/player.ts";
import { useGameAudio } from "../audio/use-game-audio.ts";
import { InboxPanel } from "../components/InboxPanel.tsx";
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
import { powerName, when, whenCap } from "../ui/format.ts";
import { OrderDraft } from "../ui/order-draft.ts";
import { navigate } from "../ui/router.ts";
import { getTheme, setTheme } from "../ui/theme.ts";
import { playing } from "../ui/update.ts";
import { useSession } from "../ui/use-session.ts";
import { Speeds, speedIndex, useKeys, withKey } from "../ui/keys.ts";

const phaseText = (phase: string): string => {
  const colon = phase.indexOf(":");
  return phase.startsWith("Turn ") && colon > 0 ? phase.slice(colon + 1).trim() : phase;
};

let watchStarted = false;

/**
 * Where a view of the map opens the first time it is shown in a game (item 11c+; Haakon: "zooming out to the full region is
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
  const [sheet, setSheet] = useState(false);
  const [legend, setLegend] = useState(false);
  // Space and the pace keys (ui/keys.ts): Space does what the play button shows, 1 to 3 set the pace, + and − step it.
  const setSpeed = (i: number): void => s.setDelay(Speeds[Math.max(0, Math.min(Speeds.length - 1, i))].ms);
  useKeys({
    pause: () => {
      if (!live.hasRunner || s.frames.length === 0) return;
      if (live.auto) s.setAuto(false);
      else if (s.replaying) s.toggleReplay();
      else if (s.historyTurn !== null || live.readOnly || live.ended) {
        if (s.frames.length > 1) s.toggleReplay();
      } else if (s.canPlay) s.setAuto(true);
    },
    pace1: () => setSpeed(0),
    pace2: () => setSpeed(1),
    pace3: () => setSpeed(2),
    faster: () => setSpeed(speedIndex(s.delayMs) + 1),
    slower: () => setSpeed(speedIndex(s.delayMs) - 1),
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

  // The game running, if any: a new version waits for a tap while one is played (ui/update.ts).
  useEffect(() => playing(live.hasRunner ? live.gameId : null), [live.hasRunner, live.gameId]);

  useEffect(() => {
    document.title = `Amarna Letters — ${!live.hasRunner ? "no game" : whenCap(live.turn, viewerOf())}`;
  });

  function viewerOf(): Power | null {
    return s.godView ? null : (s.viewAs ?? live.humans[0] ?? null);
  }

  // The music and the sounds follow the season shown, as this view knows it (item 19+++).
  useGameAudio(s.frames, s.shownIndex, viewerOf(), live.hasRunner ? live.gameId : "", () => map.current?.view() ?? null);

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
    player.play("envoy");
  }
  audienceKey.current = aKey;
  if (tab === "audience" && pendingAudience === null) tab = "";
  if (tab === "orders" && pendingOrders === null) tab = "";
  if (tab === "inbox" && viewer === null) tab = "";
  if (tab === "trail" && !s.godView) tab = "";
  if (tab === "legends" && !s.godView) tab = "";
  if (tab === "follow" && followId === null) tab = "";
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
    // A destination picked for an order: back to the orders, which now show it.
    if (picking && draft?.selected === null) setTab("orders");
    setSheet(false);
    map.current?.focus(city(province), 2.2);
  };
  const follow = (id: string): void => {
    closeCards();
    setFollowId(id);
    setTab("follow");
    const path = pathOf(s.frames, s.shownIndex, viewer, id);
    if (path.length > 0) map.current?.focus(path[path.length - 1].at, 1.6);
  };
  const stopFollowing = (): void => {
    setFollowId(null);
    setTab("season");
  };

  // The last season's frame still shows the age's end until the next season is played, after the table played on.
  const playedOn = !history && frame.ended && !live.ended;
  const endingLine =
    frame.ended && !playedOn
      ? `The age has ended: ${frame.endReason}. Winner: ${frame.winners.join(" and ")}.${s.hasHumans && live.ended ? " The record is open to every seat: choose God view, and read the Legends." : ""}`
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
            <summary aria-label="More" title="More">
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
              <button onClick={() => void s.export()}>Export log</button>
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
                  title="Keys 1 to 3 set the pace; + and − make it faster or slower"
                >
                  {Speeds.map((x, i) => (
                    <option key={x.ms} value={x.ms}>
                      {i + 1}: {x.name}
                    </option>
                  ))}
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
            followPath: followId === null ? null : pathOf(s.frames, index, viewer, followId),
          }}
          viewKey={`${live.gameId}:${viewer ?? "god"}`}
          opening={openingView(viewer)}
          onProvince={clicked}
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
            <ProvinceInfo state={state} id={selectedProvince} scene={scene} onClose={() => setSelectedProvince(null)} onPerson={follow} />
          )}
          {(index < last || frame.index > 0) && <div className="map-ui season-tag">{index === 0 ? "Opening positions" : `Moves of ${shortDate(index, viewer)}`}</div>}
        </GameMap>
      </section>

      <aside className="side">
        <button className="sheet-handle" onClick={() => setSheet(!sheet)} aria-label={sheet ? "Show the map" : "Enlarge the panel"}>
          <span className="grip"></span>
          <span className="sr">{sheet ? "Show the map" : "Enlarge the panel"}</span>
        </button>
        <div className="tabs" role="tablist">
          {pendingAudience !== null && (
            <button className={tabClass("audience", true)} onClick={() => pick("audience")}>
              Audience!
            </button>
          )}
          {pendingOrders !== null && (
            <button className={tabClass("orders", true)} onClick={() => pick("orders")}>
              Your orders
            </button>
          )}
          <button className={tabClass("season")} onClick={() => pick("season")}>
            Season
          </button>
          {viewer !== null && (
            <button className={tabClass("inbox")} onClick={() => pick("inbox")}>
              Inbox
            </button>
          )}
          {s.godView && (
            <button className={tabClass("trail")} onClick={() => pick("trail")}>
              Trail
            </button>
          )}
          <button className={tabClass("people")} onClick={() => pick("people")}>
            People
          </button>
          {followId !== null && (
            <button className={tabClass("follow")} onClick={() => pick("follow")}>
              Follow
            </button>
          )}
          <button className={tabClass("provinces")} onClick={() => pick("provinces")}>
            Provinces
          </button>
          <button className={tabClass("standings")} onClick={() => pick("standings")}>
            Standings
          </button>
          <button className={tabClass("events")} onClick={() => pick("events")}>
            Events
          </button>
          {s.godView && (
            <button className={tabClass("legends")} onClick={() => pick("legends")}>
              Legends
            </button>
          )}
          <button className={tabClass("rules")} onClick={() => pick("rules")}>
            Rules
          </button>
          {state.ended && Object.keys(live.chronicles).length > 0 && (
            <button className={tabClass("chronicle")} onClick={() => pick("chronicle")}>
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
        <button className="tb" disabled={index <= 0} onClick={() => s.stepBack()} title="One season back" aria-label="One season back">
          ◀
        </button>
        {live.auto ? (
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
          title={history ? "One season on" : "Play one season"}
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
        <span className={history ? "tlabel hide-sm" : "tlabel"} title={index === 0 ? "The start" : when(index, viewer)}>
          {index === 0 ? "Start" : shortDate(index, viewer)}
          {history ? "" : " · now"}
        </span>
        {history && (
          <button className="tb now" onClick={() => s.showTurn(null)} title="Back to now">
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
            onSubmit={(sleep) => {
              // The season's orders sealed (item 19+++).
              player.play("seal");
              s.submitOrders(pendingOrders!.power, { ...draft!.build(), stayAwake: !sleep });
            }}
          />
        );
      case "inbox":
        return <InboxPanel state={displayed} power={viewer!} />;
      case "trail":
        return <TrailPanel state={displayed} authors={live.trailAuthors} onPerson={follow} />;
      case "people":
        return <PeoplePanel state={displayed} viewer={viewer} onPerson={follow} />;
      case "follow":
        return <FollowPanel record={lifeRecord()} viewer={viewer} onProvince={clicked} onClose={stopFollowing} />;
      case "provinces":
        return <ProvinceList scene={scene} selected={useDraft ? draft!.selected : selectedProvince} onProvince={fromList} />;
      case "standings":
        return <StandingsPanel state={displayed} viewer={viewer} seats={live.seats} />;
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
        return <ChroniclePanel state={state} chronicles={live.chronicles} />;
      case "legends":
        return <LegendsPanel state={displayed} onProvince={clicked} />;
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

