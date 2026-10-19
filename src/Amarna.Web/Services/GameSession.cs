using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Web.Services;

/// <summary>
/// The one game this browser tab is playing or watching: the runner, the human seats, the
/// spectator's choices (whose eyes, which turn), and autosave to IndexedDB.
/// </summary>
public sealed class GameSession(Storage storage, SeatFactory factory)
{
    private CancellationTokenSource _cts = new();
    private GameState? _history;
    private int _historyTurn = -1;

    public GameRunner? Runner { get; private set; }
    public GameSettings Settings { get; private set; } = new();
    public Dictionary<Power, HumanSeat> Humans { get; } = new();
    public bool Busy { get; private set; }
    public bool Auto { get; private set; }
    public int DelayMs { get; set; } = 400;
    public Power? ViewAs { get; set; }
    public bool Reveal { get; set; }
    public int? HistoryTurn { get; private set; }
    public string? Error { get; private set; }
    public string? Notice { get; private set; }
    public string GameId { get; private set; } = "";
    public bool ReadOnly { get; private set; }

    public event Action? Changed;

    public bool HasHumans => Humans.Count > 0;
    public bool CanSeeAll => !HasHumans || Reveal;
    public bool GodView => ViewAs is null && CanSeeAll;
    public double Cost => Runner?.Log.TotalCost ?? 0;

    private void Notify() => Changed?.Invoke();

    public GameState? Displayed
    {
        get
        {
            if (Runner is null) return null;
            if (HistoryTurn is not int t) return Runner.State;
            if (_historyTurn != t || _history is null)
            {
                _history = Runner.StateAt(t);
                _historyTurn = t;
            }
            return _history ?? Runner.State;
        }
    }

    public async Task StartAsync(GameSettings settings, string? apiKey)
    {
        Stop();
        Settings = settings;
        Error = null;
        Notice = null;
        ReadOnly = false;
        var state = GameFactory.NewGame(settings.Seed, settings.ToConfig());
        BuiltSeats built;
        try { built = factory.Build(settings, state, apiKey, () => Runner!.Log); }
        catch (Exception ex) { Error = ex.Message; Notify(); return; }
        Humans.Clear();
        foreach (var (p, seat) in built.Seats)
            if (seat is HumanSeat h) { Humans[p] = h; h.Changed += Notify; }
        Runner = new GameRunner(state, built.Seats, built.Minds, built.Narrator) { WriteChronicles = settings.Chronicles };
        Runner.Changed += Notify;
        GameId = $"game-{settings.Seed}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        ViewAs = Humans.Keys.Cast<Power?>().FirstOrDefault();
        Reveal = false;
        HistoryTurn = null;
        Busy = true;
        Notify();
        try { await Runner.PrepareAsync(_cts.Token); }
        catch (Exception ex) { Error = ex.Message; }
        finally { Busy = false; }
        await SaveAsync();
        Notify();
        if (HasHumans) SetAuto(true);
    }

    /// <summary>Loads a log: replays it fully for the timeline; optionally continues it with live seats.</summary>
    public async Task LoadAsync(string text, bool continuePlay, string? apiKey)
    {
        Stop();
        Error = null;
        Notice = null;
        GameLog log;
        try { log = GameLog.FromJsonl(text); }
        catch (Exception ex) { Error = $"That file is not a game log: {ex.Message}"; Notify(); return; }
        // A game saved under other rules would not play out the same: say so plainly instead of failing midway.
        if (GameRunner.VersionProblem(log.Header) is { } problem) { Error = problem; Notify(); return; }

        Humans.Clear();
        Busy = true;
        Notify();
        try
        {
            if (continuePlay)
            {
                Settings = factory.SettingsFromHeader(log.Header);
                var built = factory.Build(Settings, GameFactory.NewGame(log.Header.Seed, log.Header.Config), apiKey, () => Runner!.Log);
                foreach (var (p, seat) in built.Seats)
                    if (seat is HumanSeat h) { Humans[p] = h; h.Changed += Notify; }
                Runner = GameRunner.Resume(log, built.Seats, built.Minds, built.Narrator);
                Runner.Changed += Notify;
                ReadOnly = false;
                await Runner.PrepareAsync(_cts.Token);
                Notice = "Replaying the saved seasons…";
                // Fast-forward through the logged seasons; live seats take over where the log ends.
                while (!Runner.State.Ended && log.Decisions.Any(d => d.Key == $"t{Runner.State.Turn}/season" || d.Key.StartsWith($"t{Runner.State.Turn}/orders/")))
                    await Runner.PlayTurnAsync(_cts.Token);
                Notice = null;
                ViewAs = Humans.Keys.Cast<Power?>().FirstOrDefault();
            }
            else
            {
                Runner = GameRunner.ForReplay(log);
                Runner.Changed += Notify;
                Runner.WriteChronicles = log.Decisions.Any(d => d.Key.StartsWith("end/chronicle/"));
                ReadOnly = true;
                await Runner.PrepareAsync(_cts.Token);
                try { while (await Runner.PlayTurnAsync(_cts.Token)) { } }
                catch (ReplayExhaustedException) { Notice = $"The log ends during turn {Runner.State.Turn}; showing the game up to there."; }
                ViewAs = null;
            }
            GameId = $"game-{log.Header.Seed}-loaded-{DateTime.UtcNow:yyyyMMddHHmmss}";
            HistoryTurn = null;
        }
        catch (Exception ex) { Error = ex.Message; }
        finally { Busy = false; }
        Notify();
        if (continuePlay && HasHumans) SetAuto(true);
    }

    public async Task StepAsync()
    {
        if (Runner is null || Busy || ReadOnly || Runner.State.Ended) return;
        HistoryTurn = null;
        Busy = true;
        Notify();
        try
        {
            await Runner.PlayTurnAsync(_cts.Token);
            await SaveAsync();
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Error = ex.Message;
            Auto = false;
        }
        finally
        {
            Busy = false;
            Notify();
        }
    }

    public void SetAuto(bool on)
    {
        if (Auto == on) return;
        Auto = on;
        Notify();
        if (on) _ = LoopAsync();
    }

    private async Task LoopAsync()
    {
        while (Auto && Runner is not null && !Runner.State.Ended && !ReadOnly)
        {
            if (Settings.UsesModels && Cost >= Settings.BudgetUsd)
            {
                Notice = $"Paused: this game has spent ${Cost:0.00}, reaching its budget of ${Settings.BudgetUsd:0.00}. Raise the budget to continue.";
                Auto = false;
                break;
            }
            await StepAsync();
            if (!Auto) break;
            await Task.Delay(HasHumans ? 50 : DelayMs);
        }
        Auto = false;
        Notify();
    }

    public void RaiseBudget(double by)
    {
        Settings.BudgetUsd += by;
        Notice = null;
        Notify();
    }

    public void Stop()
    {
        Auto = false;
        _cts.Cancel();
        _cts = new CancellationTokenSource();
    }

    public void ShowTurn(int? turn)
    {
        HistoryTurn = turn is int t && Runner is not null && t >= Runner.Snapshots.Count - 1 ? null : turn;
        Notify();
    }

    public async Task SaveAsync()
    {
        if (Runner is null || ReadOnly) return;
        var meta = $"Seed {Runner.State.Seed}, turn {Runner.State.Turn}{(Runner.State.Ended ? " (ended)" : "")}, {string.Join(", ", Runner.Log.Header.Seats.GroupBy(s => s.Value).Select(g => $"{g.Count()} {g.Key}"))}";
        await storage.SaveAsync(GameId, meta, Runner.Log.ToJsonl());
    }

    public async Task ExportAsync()
    {
        if (Runner is null) return;
        await storage.DownloadAsync($"{GameId}.jsonl", Runner.Log.ToJsonl());
    }

    public void ClearMessages()
    {
        Error = null;
        Notice = null;
        Notify();
    }
}
