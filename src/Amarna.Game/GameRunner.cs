using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game;

/// <summary>
/// Drives the seasons: asks seats and characters for decisions, records every decision in the
/// log under a deterministic key, and hands the results to the engine. Given a log, the same
/// runner replays a game exactly without calling any seat or model.
/// </summary>
public sealed class GameRunner
{
    private readonly GameLog? _replay;
    private readonly bool _strict;
    /// <summary>The script king that stands in when a seat's call fails. It keeps up with every model and file seat (see OrdersAsync).</summary>
    private readonly ScriptLeader _fallbackSeat;
    private readonly ICharacterMind _fallbackMind = new ScriptMind();

    public GameState State { get; private set; }
    public GameLog Log { get; }
    public IReadOnlyDictionary<Power, ISeat> Seats { get; }
    public ICharacterMind Minds { get; }
    public INarrator Narrator { get; }
    public bool WriteChronicles { get; set; } = true;
    public bool Prepared { get; private set; }

    /// <summary>Serialized states: [0] at the start, [k] after turn k.</summary>
    public List<string> Snapshots { get; } = new();
    public Dictionary<Power, string> Chronicles { get; } = new();
    public string Phase { get; private set; } = "Ready";
    public List<string> Errors { get; } = new();

    public event Action? Changed;

    /// <param name="anyVersion">Replay a log saved under another rules version anyway (for analysis only: it may diverge).</param>
    public GameRunner(GameState state, IReadOnlyDictionary<Power, ISeat> seats, ICharacterMind minds, INarrator narrator,
        GameLog? log = null, GameLog? replay = null, bool strictReplay = true, bool anyVersion = false)
    {
        if (replay is not null && !anyVersion) EnsureVersion(replay.Header);
        State = state;
        _strict = strictReplay;
        Seats = seats;
        Minds = minds;
        Narrator = narrator;
        _replay = replay;
        _fallbackSeat = new ScriptLeader(state.Seed);
        // Who may sleep: on replay, whoever could in the recorded game; live, the seats that can.
        var sleepers = !state.Config.SleepingSeats ? new List<Power>()
            : replay?.Header.Sleepers.ToList() ?? seats.Where(x => x.Value.CanSleep).Select(x => x.Key).OrderBy(p => p).ToList();
        foreach (var p in sleepers) state.Sleep.TryAdd(p, new SleepState());
        Log = log ?? new GameLog();
        Log.Header = new LogHeader
        {
            Seed = state.Seed,
            Config = state.Config,
            Seats = seats.ToDictionary(x => x.Key, x => x.Value.Label),
            Sleepers = sleepers,
            Minds = minds.Label,
            Narrator = narrator.Label,
        };
    }

    /// <summary>
    /// Why a log cannot be replayed or continued by this version of the rules, or null when it can. Its
    /// decisions were made under other rules, so they would not play out to the same game.
    /// </summary>
    public static string? VersionProblem(LogHeader header) => header.Version == GameState.CurrentVersion ? null
        : $"This game was saved under {(header.Version < GameState.CurrentVersion ? "an earlier" : "a later")} version of the rules (version {header.Version}) and cannot be replayed by this version.";

    private static void EnsureVersion(LogHeader header)
    {
        if (VersionProblem(header) is { } problem) throw new SaveVersionException(problem);
    }

    /// <param name="anyVersion">Replay a log saved under another rules version anyway (for analysis only: it may diverge).</param>
    public static GameRunner ForReplay(GameLog log, bool anyVersion = false)
    {
        if (!anyVersion) EnsureVersion(log.Header);
        var state = GameFactory.NewGame(log.Header.Seed, log.Header.Config);
        var seats = Powers.All.ToDictionary(p => p, p => (ISeat)new ReplaySeat(log.Header.Seats.GetValueOrDefault(p) ?? "?"));
        return new GameRunner(state, seats, new ReplayMind(log.Header.Minds), new ReplayNarrator(log.Header.Narrator), replay: log, anyVersion: anyVersion);
    }

    /// <summary>Continues a saved game: decisions in the log are replayed, then live seats take over.</summary>
    public static GameRunner Resume(GameLog log, IReadOnlyDictionary<Power, ISeat> seats, ICharacterMind minds, INarrator narrator)
    {
        EnsureVersion(log.Header);
        // Who may sleep is part of the game: the seats that take over must be the ones that could sleep before.
        if (log.Header.Config.SleepingSeats)
        {
            var could = log.Header.Sleepers.OrderBy(p => p).ToList();
            var can = seats.Where(x => x.Value.CanSleep).Select(x => x.Key).OrderBy(p => p).ToList();
            if (!could.SequenceEqual(can))
                throw new InvalidOperationException($"This game was played with sleeping seats for {(could.Count == 0 ? "nobody" : string.Join(", ", could))}; "
                    + $"continue it with seats that can sleep for exactly those kings (now: {(can.Count == 0 ? "none" : string.Join(", ", can))}).");
        }
        var state = GameFactory.NewGame(log.Header.Seed, log.Header.Config);
        return new GameRunner(state, seats, minds, narrator, replay: log, strictReplay: false);
    }

    public bool IsReplay => _replay is not null && _strict;

    /// <summary>The stand-in script king, for tests.</summary>
    internal ScriptLeader StandIn => _fallbackSeat;

    private void SetPhase(string phase)
    {
        Phase = phase;
        Changed?.Invoke();
    }

    /// <summary>Returns the logged decision when replaying; otherwise produces, records and returns it.</summary>
    private async Task<T> Recorded<T>(string key, Func<Task<T>> produce, Func<Task<T>>? fallback = null)
    {
        if (_replay is not null)
        {
            if (_replay.TryGet<T>(key, out var logged))
            {
                Log.Record(key, logged);
                return logged;
            }
            if (_strict) throw new ReplayExhaustedException(key);
        }

        T value;
        try
        {
            value = await produce();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex) when (fallback is not null)
        {
            lock (Errors) Errors.Add($"{key}: {ex.Message}");
            value = await fallback();
        }
        Log.Record(key, value);
        Log.TryGet<T>(key, out var copy); // use the round-tripped value so live play and replay match exactly
        return copy;
    }

    public async Task PrepareAsync(CancellationToken ct = default)
    {
        if (Prepared) return;
        SetPhase("The narrator meets the characters");
        var tasks = State.Characters.Select(async c =>
        {
            var persona = await Recorded($"setup/persona/{c.Id}", () => Narrator.PersonaAsync(c, ct), () => Task.FromResult(c.Persona));
            return (c, persona);
        }).ToList();
        foreach (var (c, persona) in await Task.WhenAll(tasks))
            if (!string.IsNullOrWhiteSpace(persona)) c.Persona = persona;
        Snapshots.Add(Json.Serialize(State));
        Prepared = true;
        SetPhase("Ready");
    }

    /// <summary>Plays one season. Returns false once the game has ended.</summary>
    public async Task<bool> PlayTurnAsync(CancellationToken ct = default)
    {
        if (!Prepared) await PrepareAsync(ct);
        if (State.Ended) return false;
        var turn = State.Turn;
        var engine = new TurnEngine(State);

        // With sleeping seats a season can pass with no seat asked at all; mark every season so a replay
        // or a continued game knows how far the log goes.
        if (State.Config.SleepingSeats) await Recorded($"t{turn}/season", () => Task.FromResult(true));

        SetPhase($"Turn {turn}: income and arrivals");
        engine.BeginTurn();

        SetPhase($"Turn {turn}: reports and pitches");
        await FulfilAsync(engine, turn, ct);
        engine.WakeCheck();

        SetPhase($"Turn {turn}: audiences");
        await AudiencesAsync(engine, turn, ct);

        SetPhase($"Turn {turn}: orders");
        var subs = await OrdersAsync(turn, ct);

        SetPhase($"Turn {turn}: resolution");
        engine.Resolve(subs);
        Snapshots.Add(Json.Serialize(State));

        if (State.Ended && WriteChronicles) await ChroniclesAsync(ct);
        SetPhase(State.Ended ? "The game has ended" : "Ready");
        return !State.Ended;
    }

    private async Task FulfilAsync(TurnEngine engine, int turn, CancellationToken ct)
    {
        var requests = engine.MindRequests.ToList();
        var replies = await Task.WhenAll(requests.Select(req => Recorded($"t{turn}/mind/{req.Id}", () => Produce(req), () => Fallback(req))));
        for (var i = 0; i < requests.Count; i++) engine.Fulfil(requests[i], replies[i]);

        async Task<MindReply> Produce(MindRequest req)
        {
            if (req.Task == MindTask.CheckReport)
            {
                var subject = State.Char(req.CharacterId);
                return new MindReply { Text = await Narrator.CheckReportAsync(new CheckContext { Subject = subject, Court = req.Court, Facts = req.Facts, Turn = turn }, ct) };
            }
            return await Minds.WriteAsync(Context(req, engine, turn), ct);
        }

        async Task<MindReply> Fallback(MindRequest req)
        {
            if (req.Task == MindTask.CheckReport)
                return new MindReply { Text = await new TemplateNarrator().CheckReportAsync(new CheckContext { Subject = State.Char(req.CharacterId), Court = req.Court, Facts = req.Facts, Turn = turn }, ct) };
            return await _fallbackMind.WriteAsync(Context(req, engine, turn), ct);
        }
    }

    private MindContext Context(MindRequest req, TurnEngine engine, int turn)
    {
        var c = State.Char(req.CharacterId);
        return new MindContext
        {
            Request = req,
            Self = c,
            Turn = turn,
            Seed = State.Seed,
            Trail = engine.Trail(req.TrailId),
            BasePrice = TurnEngine.BasePrice(c, req.Court),
            Demand = State.Tasks.Count(t => t.Kind == TaskKind.Candidates) + engine.MindRequests.Count(r => r.Task == MindTask.Pitch && r.CharacterId == c.Id),
        };
    }

    private async Task AudiencesAsync(TurnEngine engine, int turn, CancellationToken ct)
    {
        var byHost = State.Audiences.ToList().GroupBy(a => a.Host).OrderBy(g => g.Key);
        var hostTasks = byHost.Select(async group =>
        {
            var records = new List<AudienceRecord>();
            foreach (var a in group.OrderBy(a => TurnEngine.IdNumber(a.Id)))
                records.Add(await AudienceAsync(engine, a, turn, ct));
            return records;
        }).ToList();
        var all = (await Task.WhenAll(hostTasks)).SelectMany(r => r).OrderBy(r => TurnEngine.IdNumber(r.AudienceId)).ToList();
        foreach (var record in all) engine.ApplyAudience(record);
    }

    private async Task<AudienceRecord> AudienceAsync(TurnEngine engine, PendingAudience a, int turn, CancellationToken ct)
    {
        var envoy = State.Char(a.EnvoyId);
        var key = $"t{turn}/aud/{a.Id}";
        EnvoyContext Ctx(List<Exchange> soFar, int round, string delivered, int skim) => new()
        {
            Self = envoy,
            Sender = a.From,
            Host = a.Host,
            Dispatch = a.Dispatch,
            Turn = turn,
            Seed = State.Seed,
            Round = round,
            MaxRounds = State.Config.AudienceRounds,
            SoFar = soFar,
            Delivered = delivered,
            Skim = skim,
        };

        var present = await Recorded($"{key}/present",
            () => Minds.PresentAsync(Ctx([], 0, "", 0), ct),
            () => _fallbackMind.PresentAsync(Ctx([], 0, "", 0), ct));
        present.Skim = Math.Clamp(present.Skim, 0, a.Dispatch.Gold);

        var record = new AudienceRecord { AudienceId = a.Id, Delivered = present.Speech, Skim = present.Skim };
        var soFar = new List<Exchange>();
        for (var round = 1; round <= State.Config.AudienceRounds; round++)
        {
            var view = engine.BuildAudienceView(a, present.Speech, present.Skim, soFar, round, record.Rounds);
            var court = Views.For(State, a.Host);
            var host = await Recorded($"{key}/host/{round}",
                () => Seats[a.Host].HostAudienceAsync(view, court, ct),
                () => _fallbackSeat.HostAudienceAsync(view, court, ct));
            var ctx = Ctx(soFar.ToList(), round, present.Speech, present.Skim);
            var reaction = await Recorded($"{key}/envoy/{round}",
                () => Minds.ReactAsync(ctx, host, ct),
                () => _fallbackMind.ReactAsync(ctx, host, ct));
            record.Rounds.Add(new AudienceRound { Host = host, Envoy = reaction });
            soFar.Add(new Exchange { Host = host.Speech, Envoy = reaction.Speech });
            if (host.End || host.Detain || reaction.AcceptJob) break;
        }
        return record;
    }

    private async Task<Dictionary<Power, TurnSubmission>> OrdersAsync(int turn, CancellationToken ct)
    {
        // A sleeping seat is not asked: its units hold and its scheduled orders run (the engine folds them in).
        var engine = new TurnEngine(State);
        var alive = State.Alive.Where(p => !engine.IsAsleep(p)).ToList();
        var views = alive.ToDictionary(p => p, p => Views.For(State, p));
        // A shadow brain: the stand-in reads every model or file seat's view each season, asleep or awake, so that when a
        // call fails it plays a king who remembers. It learns once a season (if it stood in at an audience, it learned
        // then). Its reading changes nothing in the game, so replays stay exact; a strict replay asks no seat and skips it.
        if (!IsReplay)
            foreach (var p in State.Alive.Where(p => Seats[p].CanSleep))
                _fallbackSeat.Observe(views.GetValueOrDefault(p) ?? Views.For(State, p));
        var results = await Task.WhenAll(alive.Select(p => Recorded($"t{turn}/orders/{p}",
            () => Seats[p].DecideAsync(views[p], ct),
            async () =>
            {
                // The script king stands in; the seat itself has not seen this season (its digest is kept for it).
                var stand = await _fallbackSeat.DecideAsync(views[p], ct);
                stand.FromFallback = true;
                return stand;
            })));
        return alive.Select((p, i) => (p, results[i])).ToDictionary(x => x.p, x => x.Item2);
    }

    private async Task ChroniclesAsync(CancellationToken ct)
    {
        SetPhase("The scribes write the annals");
        var tasks = State.Alive.Concat(State.Eliminated).Distinct().OrderBy(p => p).Select(async p =>
        {
            var ctx = new ChronicleContext
            {
                Power = p,
                Known = State.Events.Where(e => e.VisibleTo.Contains(p)).ToList(),
                Scores = State.Scores.Where(s => s.Power == p).ToList(),
                Winners = State.Winners.ToList(),
                LastTurn = State.Scores.Count == 0 ? State.Turn : State.Scores.Max(s => s.Turn),
            };
            var text = await Recorded($"end/chronicle/{p}", () => Narrator.ChronicleAsync(ctx, ct), () => new TemplateNarrator().ChronicleAsync(ctx, ct));
            return (p, text);
        }).ToList();
        foreach (var (p, text) in await Task.WhenAll(tasks)) Chronicles[p] = text;
    }

    /// <summary>The state at the end of a given turn (0 = start), from the snapshots.</summary>
    public GameState? StateAt(int turn) =>
        turn >= 0 && turn < Snapshots.Count ? Json.Deserialize<GameState>(Snapshots[turn]) : null;
}

/// <summary>A log saved under another version of the rules: it can be neither replayed nor continued.</summary>
public sealed class SaveVersionException(string message) : InvalidOperationException(message);

public sealed class ReplayExhaustedException(string key) : Exception($"The log has no decision for '{key}'.")
{
    public string Key { get; } = key;
}

internal sealed class ReplaySeat(string label) : ISeat
{
    public string Label => label;
    public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => throw new InvalidOperationException("replay seat");
    public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => throw new InvalidOperationException("replay seat");
}

internal sealed class ReplayMind(string label) : ICharacterMind
{
    public string Label => label;
    public Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct) => throw new InvalidOperationException("replay mind");
    public Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct) => throw new InvalidOperationException("replay mind");
    public Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct) => throw new InvalidOperationException("replay mind");
}

internal sealed class ReplayNarrator(string label) : INarrator
{
    public string Label => label;
    public Task<string> PersonaAsync(Character c, CancellationToken ct) => throw new InvalidOperationException("replay narrator");
    public Task<string> CheckReportAsync(CheckContext ctx, CancellationToken ct) => throw new InvalidOperationException("replay narrator");
    public Task<string> ChronicleAsync(ChronicleContext ctx, CancellationToken ct) => throw new InvalidOperationException("replay narrator");
}
