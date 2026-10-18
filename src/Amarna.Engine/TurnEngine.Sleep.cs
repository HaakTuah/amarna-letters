namespace Amarna.Engine;

/// <summary>
/// Sleeping seats. The world advances every season, but a seat that may sleep sleeps after every set of orders, and
/// is asked again only when something concerns it, the season it named comes, or the hidden cap is reached. There
/// is never a global skip: each seat sees only its own wake-ups, and everything it is told comes from its own view.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>The most orders a seat may schedule for one season.</summary>
    public const int MaxScheduledPerSeason = 24;

    /// <summary>The most seasons a seat may have orders scheduled for at once.</summary>
    public const int MaxScheduledSeasons = 40;

    /// <summary>The digest keeps this many lines; the oldest go first.</summary>
    public const int MaxDigest = 60;

    /// <summary>Why a seat is woken when the hidden cap is reached: it says nothing of the cap.</summary>
    public const string CapReason = "your counsellors woke you after a long sleep";

    /// <summary>Why a seat whose last call failed (the stand-in played that season) is asked again, when nothing else concerns it.</summary>
    public const string AskedAgainReason = "your counsellors woke you";

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
            if (!S.IsAlive(p)) continue;
            if (!sl.Asleep)
            {
                // Awake although it gave orders before: its last call failed and the stand-in played. It is asked again,
                // and told what concerns it as if it had been woken.
                if (sl.LastCalled > 0 && sl.LastCalled < S.Turn - 1)
                    sl.WokenBecause = WakeReasons(p, sl) is { Count: > 0 } why ? why : [AskedAgainReason];
                continue;
            }
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

    /// <summary>
    /// What wakes a seat, and nothing else: an envoy waiting to be received; foreign troops in its land; land or troops
    /// lost; a scheduled order that failed; a ransom demanded; a servant giving notice; one of its own triggers; the
    /// season it named; the hidden cap. (A kingdom that falls ends its sleep in <see cref="EndSleep"/>.)
    /// </summary>
    private List<string> WakeReasons(Power p, SleepState sl)
    {
        var why = new List<string>();
        void Add(string reason)
        {
            if (!why.Contains(reason)) why.Add(reason);
        }

        foreach (var r in sl.PendingWake) Add(r);
        if (sl.Asleep && S.Turn >= sl.WakeAt)
            Add(sl.History.LastOrDefault() is { Named: > 0 } spell && spell.Named == sl.WakeAt
                ? $"you asked to be woken in turn {spell.Named}"
                : CapReason);

        foreach (var a in S.Audiences.Where(a => a.Host == p).OrderBy(a => IdNumber(a.Id)))
            Add($"an envoy of {a.From} waits to be received");

        // Last season's moves as it saw them: foreign troops that entered its land, its own troops destroyed.
        foreach (var o in S.LastSeen.GetValueOrDefault(p) ?? [])
        {
            if (o.Power == p)
            {
                if (o.Destroyed) Add($"your {Kind(o.UnitKind)} in {o.Province} was destroyed");
            }
            else if (o.Order == "move" && o.Succeeded && o.TargetOwner == p)
                Add($"foreign troops entered your land: {o.Power}'s {Kind(o.UnitKind)} moved {o.Province} -> {o.Target}");
        }
        foreach (var i in S.InboxOf(p).Where(i => i.Turn == S.Turn))
            if (WakeReason(i) is { } reason) Add(reason);

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

    /// <summary>The news this season that wakes a seat: land lost, troops lost to desertion or plague, a ransom demanded, a servant's notice.</summary>
    private string? WakeReason(InboxItem i) => i.Kind switch
    {
        InboxKind.Battle when i.Title == "Land lost" => $"land lost: {i.Body}",
        InboxKind.Catastrophe when i.Body.Contains("it has destroyed your", StringComparison.Ordinal) => "plague destroyed troops of yours",
        InboxKind.Notice when i.Title == NoticeTitle => "a servant gives notice: " + (S.FindCharacter(i.Subject) is { Contract.NoticePrice: { } ask } c
            ? $"{c.Name} asks {Money.Format(ask)} a season to serve on"
            : i.Body),
        InboxKind.Notice when i.Title == "The treasury" && i.Body.Contains("deserted", StringComparison.Ordinal) => "your unpaid troops deserted",
        InboxKind.Rumor when i.Body.Contains("order pay_ransom", StringComparison.Ordinal) => "a ransom is demanded for one of your people",
        _ => null,
    };

    /// <summary>
    /// What happened this season that did not wake a sleeping seat, one line each, for the digest it reads when it wakes:
    /// troop movements it saw (failed attacks on its land or troops among them), and a line for each report, catastrophe,
    /// forgery, caught spy and refused order whose full text waits in its news.
    /// </summary>
    private void CollectDigest(Power p, SleepState sl)
    {
        var seen = S.LastSeen.GetValueOrDefault(p) ?? [];
        var mine = seen.Where(o => o.Power == p).Select(o => o.Province).ToHashSet();
        foreach (var o in seen)
        {
            if (o.Power == p || o.Order != "move" || o.Target is not { } t) continue;
            var who = $"{o.Power}'s {Kind(o.UnitKind)}";
            sl.Digest.Add(o.Succeeded
                ? $"turn {S.Turn - 1}: {who} moved {o.Province} -> {t}"
                : $"turn {S.Turn - 1}: {who} tried to move {o.Province} -> {t}{(mine.Contains(t) ? " (against your troops)" : o.TargetOwner == p ? " (into your land)" : "")} and failed");
        }
        foreach (var i in S.InboxOf(p).Where(i => i.Turn == S.Turn))
            if (DigestLine(i) is { } line) sl.Digest.Add($"turn {S.Turn}: {line}");
        if (sl.Digest.Count > MaxDigest)
        {
            sl.DigestLeftOut += sl.Digest.Count - MaxDigest;
            sl.Digest.RemoveRange(0, sl.Digest.Count - MaxDigest);
        }
    }

    private string? DigestLine(InboxItem i) => i.Kind switch
    {
        InboxKind.EnvoyReport => $"your envoy {S.FindCharacter(i.Subject)?.Name ?? "?"} came home with a report",
        InboxKind.SpyReport => $"a spy's report arrived ({i.Title})",
        InboxKind.CheckResult or InboxKind.Assay or InboxKind.Authentication => $"a report arrived ({i.Title})",
        InboxKind.Candidates => i.Title == "No candidates" ? "nobody came forward to seek service" : $"a candidate presented themselves ({i.Title})",
        InboxKind.Catastrophe => $"a catastrophe struck your land ({i.Title})",
        InboxKind.Tablet => $"a tablet you ordered is ready ({i.Title})",
        InboxKind.Notice when i.Title == "A spy is caught" => "a spy was caught at your court",
        InboxKind.Rejected => $"an order was refused or failed ({i.Title})",
        _ => null,
    };

    /// <summary>
    /// A seat's orders for this season with its scheduled orders folded in. An entry for this season in
    /// the submission replaces what was scheduled for it (an empty one cancels it). Otherwise a fresh
    /// order for a unit or a person replaces the scheduled one for it, a scheduled order the seat has
    /// repeated is dropped, and every other scheduled order is kept. A renewal is not a task: a fresh
    /// renewal replaces a scheduled renewal or dismissal of the same person, and a fresh dismissal a
    /// scheduled renewal, but a renewal and an errand for the same person both run.
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
        var renewing = sub.Orders.OfType<RenewOrder>().Select(r => r.Character).ToHashSet();
        var renewedOrDismissed = sub.Orders.OfType<DismissOrder>().Select(d => d.Character).Concat(renewing).ToHashSet();
        var same = sub.Orders.Select(o => o.Describe()).ToHashSet();
        scheduled = due.Where(o => !same.Contains(o.Describe())
                                   && (OrderKeys.UnitOf(o) is not { } u || !units.Contains(u))
                                   && (OrderKeys.CharacterOf(o) is not { } c || !people.Contains(c))
                                   && !(o is DismissOrder dm && renewing.Contains(dm.Character))
                                   && !(o is RenewOrder rn && renewedOrDismissed.Contains(rn.Character))).ToList();
        _scheduledNow[p] = scheduled;
        return new TurnSubmission { Orders = sub.Orders.Concat(scheduled).ToList(), Notes = sub.Notes, Sleep = sub.Sleep, Scheduled = sub.Scheduled, FromFallback = sub.FromFallback };
    }

    /// <summary>The scheduled orders running this season, per seat, to tell their failures from the seat's fresh ones.</summary>
    private readonly Dictionary<Power, List<Order>> _scheduledNow = new();

    /// <summary>
    /// A scheduled order that failed while the season resolved (a move that was stopped, or a levy, cession or purchase
    /// that could not go through) wakes its seat next season.
    /// </summary>
    private void ScheduledFailed(Power p, Order order, string why)
    {
        if (!_scheduledNow.TryGetValue(p, out var list) || !list.Any(o => ReferenceEquals(o, order)) || !S.Sleep.TryGetValue(p, out var sl)) return;
        sl.PendingWake.Add($"orders you scheduled could not be carried out: {order.Describe()} ({why})");
    }

    /// <summary>
    /// After validation: failed scheduled orders wake the seat next season. A seat that was asked this season (and
    /// answered itself, not through the stand-in) keeps the orders it scheduled and goes to sleep: until a reason
    /// wakes it, the season it named, or the hidden cap, turn + 1 + <see cref="GameConfig.MaxSleep"/>.
    /// </summary>
    private void AfterValidation(Power p, TurnSubmission sub, ValidationResult v, List<Order> scheduled)
    {
        if (!S.Config.SleepingSeats || !S.Sleep.TryGetValue(p, out var sl)) return;
        // A seat asked this season has seen earlier failures in its own news; only this season's count.
        var asked = !sl.Asleep && !sub.FromFallback;
        if (asked) sl.PendingWake.Clear();
        var failed = v.Rejected.Where(r => scheduled.Any(o => ReferenceEquals(o, r.Order))).ToList();
        if (failed.Count > 0)
            sl.PendingWake.Add("orders you scheduled could not be carried out: " + string.Join("; ", failed.Select(f => $"{f.Order.Describe()} ({f.Reason})")));
        // Asleep, or the script king stood in after the seat's call failed: the seat has not seen this season yet,
        // and it is asked again next season.
        if (!asked) return;

        // The seat was asked this season: it has now seen its digest, keeps what it scheduled, and sleeps.
        sl.LastCalled = S.Turn;
        sl.Digest.Clear();
        sl.DigestLeftOut = 0;
        KeepScheduled(p, sl, sub.Scheduled);

        var cap = S.Turn + 1 + Math.Max(0, S.Config.MaxSleep);
        var named = sub.Sleep is { WakeTurn: var w } && w > S.Turn ? w : 0;
        var sight = Views.Sight(S, Map, p);
        sl.Asleep = true;
        sl.WakeAt = named > 0 && named <= cap ? named : cap;
        sl.Triggers = (sub.Sleep?.WakeOn ?? []).Take(8).Select(t => new WakeTrigger
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
        sl.History.Add(new SleepSpell { From = S.Turn + 1, Named = named });
    }

    /// <summary>
    /// Keeps the orders a seat scheduled for later seasons: any season up to the game's last, at most
    /// <see cref="MaxScheduledPerSeason"/> orders a season, for at most <see cref="MaxScheduledSeasons"/> seasons. One
    /// entry per season replaces everything scheduled for it, and an empty entry cancels it. What is not kept is reported.
    /// </summary>
    private void KeepScheduled(Power p, SleepState sl, List<ScheduledOrders> plans)
    {
        var notKept = new List<string>();
        foreach (var plan in plans.Where(x => x.Turn != S.Turn).GroupBy(x => x.Turn).Select(g => g.Last()).OrderBy(x => x.Turn))
        {
            if (plan.Turn < S.Turn)
            {
                if (plan.Orders.Count > 0) notKept.Add($"turn {plan.Turn}: that season has passed");
                continue;
            }
            // A season after the game's last never comes. Nothing is said, so the king learns nothing of when the game must end.
            if (plan.Turn > S.Config.MaxTurns) continue;
            sl.Scheduled.RemoveAll(x => x.Turn == plan.Turn);
            if (plan.Orders.Count == 0) continue;
            if (plan.Orders.Count > MaxScheduledPerSeason)
                notKept.Add($"turn {plan.Turn}: only the first {MaxScheduledPerSeason} of its {plan.Orders.Count} orders were kept; at most {MaxScheduledPerSeason} orders may be scheduled for one season");
            sl.Scheduled.Add(new ScheduledOrders { Turn = plan.Turn, Orders = plan.Orders.Take(MaxScheduledPerSeason).ToList() });
        }
        sl.Scheduled.Sort((a, b) => a.Turn.CompareTo(b.Turn));
        if (sl.Scheduled.Count > MaxScheduledSeasons)
        {
            var late = sl.Scheduled.Skip(MaxScheduledSeasons).Select(x => x.Turn).ToList();
            notKept.Add($"turn{(late.Count == 1 ? "" : "s")} {string.Join(", ", late)}: orders may be scheduled for at most {MaxScheduledSeasons} seasons, so those for the latest were not kept");
            sl.Scheduled.RemoveRange(MaxScheduledSeasons, late.Count);
        }
        if (notKept.Count > 0)
            S.Notify(p, InboxKind.Rejected, "Scheduled orders not kept", string.Join("\n", notKept.Select(x => "- " + x)));
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
