namespace Amarna.Engine;

/// <summary>
/// Sleeping seats. The world advances every season, but a seat that may sleep is asked for orders
/// only when something concerns it, or when the time it chose has come. There is never a global
/// skip: each seat sees only its own wake-ups, and everything it is told comes from its own view.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>How many seasons ahead a seat may schedule orders: as far as it may sleep, and one more.</summary>
    private int ScheduleHorizon => S.Config.MaxSleep + 1;

    public bool IsAsleep(Power p) => S.Config.SleepingSeats && S.IsAlive(p) && S.Sleep.TryGetValue(p, out var sl) && sl.Asleep;

    /// <summary>
    /// Decides which sleeping seats wake this season. Call it once the season's arrivals and reports are
    /// in (after <see cref="BeginTurn"/> and the reports are fulfilled), before audiences and orders.
    /// </summary>
    public void WakeCheck()
    {
        if (!S.Config.SleepingSeats) return;
        foreach (var (p, sl) in S.Sleep.OrderBy(x => x.Key))
        {
            sl.WokenBecause.Clear();
            if (!S.IsAlive(p) || !sl.Asleep) continue;
            var reasons = WakeReasons(p, sl);
            if (reasons.Count == 0)
            {
                CollectDigest(p, sl);
                continue;
            }
            sl.Asleep = false;
            sl.WokenBecause = reasons;
            sl.PendingWake.Clear();
            sl.Triggers.Clear();
            if (sl.History.LastOrDefault() is { WokeAt: 0 } spell)
            {
                spell.WokeAt = S.Turn;
                spell.Reasons = reasons.ToList();
            }
        }
    }

    private List<string> WakeReasons(Power p, SleepState sl)
    {
        var why = new List<string>();
        void Add(string reason)
        {
            if (!why.Contains(reason)) why.Add(reason);
        }

        foreach (var r in sl.PendingWake) Add(r);
        if (S.Turn >= sl.WakeAt)
            Add(sl.History.LastOrDefault() is { } last && last.Requested > S.Config.MaxSleep
                ? $"you have slept {S.Config.MaxSleep} seasons, the longest a king may sleep"
                : "the season you chose to wake has come");

        // Envoys waiting to be received, and news that needs an answer.
        foreach (var a in S.Audiences.Where(a => a.Host == p).OrderBy(a => IdNumber(a.Id)))
            Add($"an envoy of {a.From} waits to be received");
        foreach (var i in S.InboxOf(p).Where(i => i.Turn == S.Turn))
        {
            var reason = i.Kind switch
            {
                InboxKind.EnvoyReport => $"an envoy has come home ({i.Title})",
                InboxKind.SpyReport => "a spy's report has arrived",
                InboxKind.CheckResult or InboxKind.Assay or InboxKind.Authentication => $"a report has arrived: {i.Title}",
                InboxKind.Candidates => "people seeking service have presented themselves",
                InboxKind.Catastrophe => $"a catastrophe: {i.Title}",
                InboxKind.Tablet => $"a tablet: {i.Title}",
                InboxKind.Battle when i.Title == "Land lost" => $"land lost: {i.Body}",
                InboxKind.Notice when i.Title == "A spy is caught" => "a spy has been caught at your court",
                InboxKind.Notice when i.Title == "The treasury" && i.Body.Contains("deserted", StringComparison.Ordinal) => "your unpaid troops deserted",
                InboxKind.Rumor when i.Body.Contains("order payRansom", StringComparison.Ordinal) => "a ransom is demanded for one of your people",
                _ => null,
            };
            if (reason is not null) Add(reason);
        }

        // What it saw happen last season: attacks on its land or troops, foreign troops arriving at its borders.
        var land = S.OwnedBy(p).ToHashSet();
        var troops = S.Units.Where(u => u.Power == p).Select(u => u.Province).ToHashSet();
        foreach (var o in S.LastSeen.GetValueOrDefault(p) ?? [])
        {
            if (o.Power == p)
            {
                if (o.Destroyed) Add($"your {Kind(o.UnitKind)} in {o.Province} was destroyed");
                continue;
            }
            if (o.Order != "move" || o.Target is not { } t) continue;
            if (land.Contains(t) || troops.Contains(t)) Add($"{o.Power} attacked {t}");
            else if (o.Succeeded && !Map[t].IsSea && Map.Neighbors(t).Any(land.Contains)) Add($"{o.Power} troops came to your border ({o.Province} -> {t})");
            else if (o.Succeeded && Map[t].IsSea && Map.Neighbors(t).Any(land.Contains)) Add($"a {o.Power} fleet came into waters off your coast ({t})");
        }

        // Its own triggers.
        var sight = Views.Sight(S, Map, p);
        foreach (var t in sl.Triggers)
        {
            var hit = t.Kind switch
            {
                WakeKind.UnitMoves when t.Province is { } prov =>
                    (S.LastSeen.GetValueOrDefault(p) ?? []).Any(o => o.Province == prov && o.Order == "move" && o.Succeeded)
                    || (sight.Contains(prov) && Occupant(prov) != t.Seen),
                WakeKind.EnvoyReturns when S.FindCharacter(t.Character) is { } c =>
                    c.Employer == p && c.Status == CharacterStatus.Employed && c.Duty == Duty.None && c.At == p,
                WakeKind.TreasuryBelow => S.Treasuries[p].Ledger < t.Amount,
                WakeKind.TroopsEnter when t.Province is { } prov =>
                    sight.Contains(prov) && S.UnitAt(prov) is { } u && u.Power != p && (t.Power is null || u.Power == t.Power),
                WakeKind.ProvinceChangesHands when t.Province is { } prov => OwnerName(prov) != t.Seen,
                _ => false,
            };
            if (hit) Add($"you asked to be woken when {t.Describe()}");
        }
        return why;
    }

    /// <summary>Distant movements seen while asleep: shown when the seat next wakes instead of waking it now.</summary>
    private void CollectDigest(Power p, SleepState sl)
    {
        foreach (var o in S.LastSeen.GetValueOrDefault(p) ?? [])
        {
            if (o.Power == p || o.Order != "move" || o.Target is null) continue;
            sl.Digest.Add($"turn {S.Turn - 1}: a {o.Power} {Kind(o.UnitKind)} moved {o.Province} -> {o.Target}{(o.Succeeded ? "" : " (it failed)")}");
        }
        if (sl.Digest.Count > 60) sl.Digest.RemoveRange(0, sl.Digest.Count - 60);
    }

    /// <summary>
    /// A seat's orders for this season with its scheduled orders folded in. An entry for this season in
    /// the submission replaces what was scheduled for it (an empty one cancels it). Otherwise a fresh
    /// order for a unit or a person replaces the scheduled one for it, a scheduled order the seat has
    /// repeated is dropped, and every other scheduled order is kept.
    /// </summary>
    private TurnSubmission WithScheduled(Power p, TurnSubmission sub, out List<Order> scheduled)
    {
        scheduled = new();
        if (!S.Config.SleepingSeats || !S.Sleep.TryGetValue(p, out var sl)) return sub;
        var due = sub.Scheduled.LastOrDefault(x => x.Turn == S.Turn) is { } replacement
            ? replacement.Orders.ToList()
            : sl.Scheduled.Where(x => x.Turn == S.Turn).SelectMany(x => x.Orders).ToList();
        sl.Scheduled.RemoveAll(x => x.Turn <= S.Turn);
        if (due.Count == 0) return sub;
        var units = sub.Orders.Select(OrderKeys.UnitOf).OfType<string>().ToHashSet();
        var people = sub.Orders.Select(OrderKeys.CharacterOf).OfType<string>().ToHashSet();
        var same = sub.Orders.Select(o => o.Describe()).ToHashSet();
        scheduled = due.Where(o => !same.Contains(o.Describe())
                                   && (OrderKeys.UnitOf(o) is not { } u || !units.Contains(u))
                                   && (OrderKeys.CharacterOf(o) is not { } c || !people.Contains(c))).ToList();
        _scheduledNow[p] = scheduled;
        return new TurnSubmission { Orders = sub.Orders.Concat(scheduled).ToList(), Notes = sub.Notes, Sleep = sub.Sleep, Scheduled = sub.Scheduled, FromFallback = sub.FromFallback };
    }

    /// <summary>The scheduled orders running this season, per seat, to tell their failures from the seat's fresh ones.</summary>
    private readonly Dictionary<Power, List<Order>> _scheduledNow = new();

    /// <summary>A scheduled order that failed while the season resolved (a levy, cession or purchase that could not go through) wakes its seat.</summary>
    private void ScheduledFailed(Power p, Order order, string why)
    {
        if (!_scheduledNow.TryGetValue(p, out var list) || !list.Any(o => ReferenceEquals(o, order)) || !S.Sleep.TryGetValue(p, out var sl)) return;
        sl.PendingWake.Add($"orders you scheduled could not be carried out: {order.Describe()} ({why})");
    }

    /// <summary>After validation: failed scheduled orders wake the seat next season; seats that were asked this season may go to sleep.</summary>
    private void AfterValidation(Power p, TurnSubmission sub, ValidationResult v, List<Order> scheduled)
    {
        if (!S.Config.SleepingSeats || !S.Sleep.TryGetValue(p, out var sl)) return;
        // A seat asked this season has seen earlier failures in its own news; only this season's count.
        var asked = !sl.Asleep && !sub.FromFallback;
        if (asked) sl.PendingWake.Clear();
        var failed = v.Rejected.Where(r => scheduled.Any(o => ReferenceEquals(o, r.Order))).ToList();
        if (failed.Count > 0)
            sl.PendingWake.Add("orders you scheduled could not be carried out: " + string.Join("; ", failed.Select(f => $"{f.Order.Describe()} ({f.Reason})")));
        // Asleep, or the script king stood in after the seat's call failed: the seat has not seen this season yet.
        if (!asked) return;

        // The seat was asked this season: it has now seen its digest, and may queue orders and go to sleep.
        sl.LastCalled = S.Turn;
        sl.Digest.Clear();
        foreach (var plan in sub.Scheduled.Where(x => x.Turn > S.Turn && x.Turn <= S.Turn + ScheduleHorizon).GroupBy(x => x.Turn).Select(g => g.Last()))
        {
            sl.Scheduled.RemoveAll(x => x.Turn == plan.Turn);
            if (plan.Orders.Count > 0) sl.Scheduled.Add(new ScheduledOrders { Turn = plan.Turn, Orders = plan.Orders.Take(24).ToList() });
        }
        sl.Scheduled.Sort((a, b) => a.Turn.CompareTo(b.Turn));
        if (sub.Sleep is not { Seasons: > 0 } req) return;
        var skip = Math.Min(req.Seasons, S.Config.MaxSleep);
        if (skip <= 0) return;

        var sight = Views.Sight(S, Map, p);
        sl.Asleep = true;
        sl.WakeAt = S.Turn + 1 + skip;
        sl.Triggers = req.WakeOn.Take(8).Select(t => new WakeTrigger
        {
            Kind = t.Kind,
            Province = t.Province,
            Character = t.Character,
            Amount = t.Amount,
            Power = t.Power,
            Seen = t.Kind switch
            {
                WakeKind.UnitMoves when t.Province is { } prov => sight.Contains(prov) ? Occupant(prov) : "unseen",
                WakeKind.ProvinceChangesHands when t.Province is { } prov => OwnerName(prov),
                _ => null,
            },
        }).ToList();
        sl.History.Add(new SleepSpell { From = S.Turn + 1, Requested = req.Seasons });
    }

    /// <summary>A sleeping seat whose kingdom falls stops sleeping: its last spell ends that season.</summary>
    private void EndSleep(Power p)
    {
        if (!S.Sleep.TryGetValue(p, out var sl) || !sl.Asleep) return;
        sl.Asleep = false;
        if (sl.History.LastOrDefault() is { WokeAt: 0 } spell)
        {
            spell.WokeAt = S.Turn + 1;
            spell.Reasons = ["the kingdom fell"];
        }
    }

    private string Occupant(string province) => S.UnitAt(province) is { } u ? $"{u.Power} {Kind(u.Kind)}" : "none";

    private string OwnerName(string province) => S.Owner.GetValueOrDefault(province)?.ToString() ?? "free";

    private static string Kind(UnitKind k) => k == UnitKind.Army ? "army" : "fleet";

}
