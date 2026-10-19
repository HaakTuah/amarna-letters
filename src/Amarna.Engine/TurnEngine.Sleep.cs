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

    /// <summary>The most standing orders a seat may keep at once.</summary>
    public const int MaxStanding = 12;

    /// <summary>The digest keeps this many lines; the oldest go first.</summary>
    public const int MaxDigest = 60;

    /// <summary>The notice that a scheduled move failed and will be tried again, its unit's later orders a season later.</summary>
    public const string MarchHeldUpTitle = "A march is held up";

    /// <summary>The notice that a unit's march ended, and which of its scheduled orders were dropped.</summary>
    public const string MarchEndsTitle = "A march ends";

    /// <summary>The notice that orders for troops the seat no longer has were dropped.</summary>
    public const string LostTroopsTitle = "Orders for lost troops dropped";

    /// <summary>The notice that a standing order fired, and what ran.</summary>
    public static string StandingFiredTitle(string id) => $"Standing order {id} fired";

    /// <summary>Why a seat is woken when the hidden cap is reached: it says nothing of the cap.</summary>
    public const string CapReason = "your counsellors woke you after a long sleep";

    /// <summary>Why a seat whose last call failed (the stand-in played that season) is asked again, when nothing else concerns it.</summary>
    public const string AskedAgainReason = "your counsellors woke you";

    /// <summary>
    /// Why a seat is woken when foreign troops end a move next to its capital (followed by the move). A temporary trigger,
    /// until sieges and walls on homeland provinces exist.
    /// </summary>
    public const string CapitalReason = "foreign troops came next to your capital";

    /// <summary>Why a sleeping seat holds court: an envoy of <paramref name="from"/> waits at its door.</summary>
    public static string EnvoyWaits(Power from) => $"an envoy of {from} waits to be received";

    /// <summary>Whether a wake reason is an envoy waiting, the one reason that wakes a seat for its audiences only.</summary>
    public static bool IsEnvoyWaiting(string reason) =>
        reason.StartsWith("an envoy of ", StringComparison.Ordinal) && reason.EndsWith(" waits to be received", StringComparison.Ordinal);

    /// <summary>Why a seat that held court asleep gives orders after all: it chose at one of its audiences to reopen them.</summary>
    public const string ReopenReason = "you chose at your audience to reopen your orders";

    public bool IsAsleep(Power p) => S.Config.SleepingSeats && S.IsAlive(p) && S.Sleep.TryGetValue(p, out var sl) && sl.Asleep;

    /// <summary>
    /// Decides which sleeping seats wake this season. Call it once the season's arrivals and reports are
    /// in (after <see cref="BeginTurn"/> and the reports are fulfilled), before audiences and orders. A seat whose only
    /// reasons are envoys waiting is woken for its audiences only (<see cref="SleepState.HoldsCourt"/>): it stays asleep, and
    /// once the audiences are done <see cref="CourtsHeld"/> reopens its orders if it chose so. Every other reason reopens
    /// them directly, without asking.
    /// </summary>
    public void WakeCheck()
    {
        if (!S.Config.SleepingSeats) return;
        foreach (var (p, sl) in S.Sleep.OrderBy(x => x.Key))
        {
            var before = sl.WokenBecause;
            sl.WokenBecause = new();
            // What an earlier season's court left is never carried on (CourtsHeld clears it; Resolve uses the letters).
            sl.HoldsCourt = false;
            sl.Reopen = false;
            sl.CourtLetters.Clear();
            if (!S.IsAlive(p)) continue;
            // Troops lost since last season (in battle, by desertion or plague, disbanded or given away) take their orders with them.
            LostUnits(p, sl);
            if (!sl.Asleep)
            {
                // Awake although it gave orders before: its last call failed and the stand-in played. It is asked again,
                // told why it was woken last season (it never read it) and what concerns it now, as if it had been woken.
                if (sl.LastCalled > 0 && sl.LastCalled < S.Turn - 1)
                {
                    var why = before.Where(r => r != AskedAgainReason).ToList();
                    foreach (var r in WakeReasons(p, sl))
                        if (!why.Contains(r)) why.Add(r);
                    sl.WokenBecause = why.Count > 0 ? why : [AskedAgainReason];
                }
                continue;
            }
            var reasons = WakeReasons(p, sl);
            if (reasons.Count == 0)
            {
                CollectDigest(p, sl);
                continue;
            }
            // Only envoys waiting: an audience, not an orders call. The seat stays asleep and its orders stand; at its
            // audiences it judges whether the news changes its plan (Part H). Its digest for the season is collected once
            // the audiences are done, if it sleeps on.
            if (reasons.All(IsEnvoyWaiting))
            {
                sl.HoldsCourt = true;
                sl.WokenBecause = reasons;
                sl.Courts.Add(new CourtHeld { Turn = S.Turn, Envoys = S.Audiences.Count(a => a.Host == p) });
                continue;
            }
            Wake(sl, reasons);
        }
    }

    /// <summary>A sleeping seat wakes for an orders call: its triggers and the reasons it waited on are spent, and its spell ends.</summary>
    private void Wake(SleepState sl, List<string> reasons)
    {
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

    /// <summary>
    /// Once the season's audiences are applied (<see cref="ApplyAudience"/>): each seat that held court asleep either reopened
    /// its orders at one of its audiences, and wakes for an orders call this season as when anything else wakes it, or sleeps
    /// on with its orders standing, and what happened this season goes to its digest. Either way the court is recorded for
    /// the reports. The letters it sent stay for <see cref="Resolve"/>, which checks them first among its orders.
    /// </summary>
    public void CourtsHeld()
    {
        if (!S.Config.SleepingSeats) return;
        foreach (var (p, sl) in S.Sleep.OrderBy(x => x.Key))
        {
            if (!sl.HoldsCourt) continue;
            sl.HoldsCourt = false;
            var reopened = sl.Reopen && S.IsAlive(p) && sl.Asleep;
            sl.Reopen = false;
            if (sl.Courts.LastOrDefault() is { } court && court.Turn == S.Turn) court.Reopened = reopened;
            if (reopened) Wake(sl, [.. sl.WokenBecause, ReopenReason]);
            else
            {
                sl.WokenBecause.Clear();
                CollectDigest(p, sl);
            }
        }
    }

    /// <summary>
    /// Adds letters sent from an audience to those sent before it this season: only letters (dispatches, or one that could not
    /// be read), in the order sent, a later letter for the same person replacing an earlier one.
    /// </summary>
    public static void AddLetters(List<Order> sent, IEnumerable<Order>? letters)
    {
        foreach (var letter in letters ?? [])
        {
            if (letter is not (DispatchOrder or UnreadableOrder)) continue;
            if (OrderKeys.CharacterOf(letter) is { } who) sent.RemoveAll(x => OrderKeys.CharacterOf(x) == who);
            sent.Add(letter);
        }
    }

    /// <summary>
    /// What wakes a seat, and nothing else: an envoy waiting to be received; foreign troops in its land, or ending a move next
    /// to its capital while it holds it; land or troops lost; a scheduled or standing order that failed; a ransom demanded; a
    /// servant giving notice; one of its own triggers; the season it named; the hidden cap. (A kingdom that falls ends its
    /// sleep in <see cref="EndSleep"/>.) An envoy waiting wakes it for its audiences only; every other reason here is an
    /// order trigger, which reopens its orders directly (<see cref="WakeCheck"/>).
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
            Add(EnvoyWaits(a.From));

        // Last season's moves as it saw them: foreign troops that entered its land, its own troops destroyed.
        // Until sieges exist (a temporary trigger, to revisit with the siege package): foreign troops that ended a move
        // next to its capital, while it still holds it, since with no walls on homeland provinces they can take it the
        // next season. Troops that merely stand there do not wake it again.
        var capital = Map.Capital(p).Id;
        var nextToCapital = S.Owner.GetValueOrDefault(capital) == p ? Map.Neighbors(capital).ToHashSet() : [];
        foreach (var o in S.LastSeen.GetValueOrDefault(p) ?? [])
        {
            if (o.Power == p)
            {
                if (o.Destroyed) Add($"your {Kind(o.UnitKind)} in {o.Province} was destroyed");
                continue;
            }
            if (o.Order != "move" || !o.Succeeded) continue;
            if (o.TargetOwner == p)
                Add($"foreign troops entered your land: {o.Power}'s {Kind(o.UnitKind)} moved {o.Province} -> {o.Target}");
            if (o.Target is { } t && nextToCapital.Contains(t))
                Add($"{CapitalReason}: {o.Power}'s {Kind(o.UnitKind)} moved {o.Province} -> {t}");
        }
        foreach (var i in S.InboxOf(p).Where(i => i.Turn == S.Turn))
            if (WakeReason(i) is { } reason) Add(reason);

        // Its own triggers. Each fires on a change since it was set, never on a state that merely lasts (the user's rule for
        // Part G): the unit or the owner it saw then is no longer there; the person comes back, having been away; the
        // treasury falls below the amount, having stood at or above it; troops move into the province.
        var sight = Views.Sight(S, Map, p);
        var seen = S.LastSeen.GetValueOrDefault(p) ?? [];
        foreach (var t in sl.Triggers)
        {
            var hit = t.Kind switch
            {
                WakeKind.UnitMoves when t.Province is { } prov =>
                    seen.Any(o => o.Province == prov && o.Order == "move" && o.Succeeded)
                    || (sight.Contains(prov) && Occupant(prov) != t.Seen),
                WakeKind.EnvoyReturns => Comes(t, BackAtCourt(p, t.Character)),
                WakeKind.TreasuryBelow => Comes(t, S.Treasuries[p].Ledger < t.Amount),
                WakeKind.TroopsEnter when t.Province is { } prov =>
                    seen.Any(o => o.Order == "move" && o.Succeeded && o.Target == prov && o.Power != p && (t.Power is null || o.Power == t.Power)),
                WakeKind.ProvinceChangesHands when t.Province is { } prov => OwnerName(prov) != t.Seen,
                _ => false,
            };
            if (hit) Add($"you asked to be woken when {t.Describe()}");
        }
        return why;
    }

    /// <summary>
    /// A trigger on a condition (a person back at court, the treasury below an amount) fires when the condition comes
    /// about, not while it lasts: only once the seat has seen it not hold since it set the trigger, which arms it. So a
    /// treasury already below the amount wakes the seat only after it has risen to the amount and fallen below again.
    /// </summary>
    private static bool Comes(WakeTrigger t, bool holds)
    {
        if (holds) return t.Seen == WakeTrigger.Armed;
        t.Seen = WakeTrigger.Armed;
        return false;
    }

    /// <summary>One of the seat's people at its court with no errand: what <see cref="WakeKind.EnvoyReturns"/> waits for.</summary>
    private bool BackAtCourt(Power p, string? id) =>
        S.FindCharacter(id) is { } c && c.Employer == p && c.Status == CharacterStatus.Employed && c.Duty == Duty.None && c.At == p;

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
        // Each line is dated by the season its news came, except a standing order's firing, dated by the season it fired.
        foreach (var i in S.InboxOf(p).Where(i => i.Turn == S.Turn))
            if (DigestLine(i) is { } line) sl.Digest.Add($"turn {(IsFiring(i) ? S.Turn - 1 : S.Turn)}: {line}");
        if (sl.Digest.Count > MaxDigest)
        {
            sl.DigestLeftOut += sl.Digest.Count - MaxDigest;
            sl.Digest.RemoveRange(0, sl.Digest.Count - MaxDigest);
        }
    }

    private string? DigestLine(InboxItem i) => i.Kind switch
    {
        InboxKind.EnvoyReport => S.FindCharacter(i.Subject) is { } envoy ? $"your envoy {envoy.Name} came home with a report" : $"an envoy came home with a report ({i.Title})",
        InboxKind.SpyReport => $"a spy's report arrived ({i.Title})",
        InboxKind.CheckResult or InboxKind.Assay or InboxKind.Authentication => $"a report arrived ({i.Title})",
        InboxKind.Candidates => i.Title == "No candidates" ? "nobody came forward to seek service" : $"a candidate presented themselves ({i.Title})",
        InboxKind.Catastrophe => $"a catastrophe struck your land ({i.Title})",
        InboxKind.Tablet => $"a tablet you ordered is ready ({i.Title})",
        InboxKind.Notice when i.Title == "A spy is caught" => "a spy was caught at your court",
        InboxKind.Rejected => $"an order was refused or failed ({i.Title})",
        InboxKind.Resolution when IsFiring(i) => "your s" + i.Title[1..],
        _ => null,
    };

    /// <summary>The notice that one of the seat's standing orders fired (<see cref="StandingFiredTitle"/>).</summary>
    private static bool IsFiring(InboxItem i) =>
        i.Kind == InboxKind.Resolution && i.Title.StartsWith("Standing order ", StringComparison.Ordinal) && i.Title.EndsWith(" fired", StringComparison.Ordinal);

    /// <summary>
    /// A seat's orders for this season with its standing and scheduled orders folded in. An entry for this season in
    /// the submission replaces what was scheduled for it (an empty one cancels it); its orders are given now, so they
    /// count as fresh ones (a failure among them does not wake the seat). Standing orders whose event the seat saw last
    /// season fire now, once, by id; then the orders scheduled for this season run. Each is given from where its unit
    /// stands now. Orders given now replace a standing or scheduled order for the same unit or person, an earlier
    /// standing order's replace a later one's, and a standing order's replace a scheduled one's; an order repeated is
    /// dropped. A renewal is not a task: a renewal replaces another's renewal or dismissal of the same person, and a
    /// dismissal its renewal, but a renewal and an errand for the same person both run. The script king standing in after
    /// the seat's call failed is not the seat: its orders only fill what the seat's own plans leave free, and it neither
    /// replaces the schedule nor cancels standing orders. Letters the seat sent from its audiences this season (while its
    /// orders stood) come first, as orders given now; an order it gives now for the same person replaces one.
    /// </summary>
    private TurnSubmission WithScheduled(Power p, TurnSubmission sub, out List<Order> scheduled)
    {
        scheduled = new();
        if (!S.Config.SleepingSeats || !S.Sleep.TryGetValue(p, out var sl)) return sub;
        LostUnits(p, sl);
        var standIn = sub.FromFallback;
        // Cancelled now, a standing order does not fire this season.
        if (!standIn && sub.CancelStanding.Count > 0) CancelStanding(p, sl, sub.CancelStanding);

        var replacement = standIn ? null : sub.Scheduled.LastOrDefault(x => x.Turn == S.Turn);
        var now = standIn ? new List<Order>() : sub.Orders.ToList();
        if (replacement is not null) now.AddRange(Survivors(sub.Orders, replacement.Orders, o => o));
        // Letters it sent from its audiences this season are its own orders, given before any it gives now: checked first, so
        // their gold is reserved first. One it gives now for the same person replaces the letter (when it reopened its orders).
        if (sl.CourtLetters.Count > 0)
        {
            now.InsertRange(0, Survivors(now, sl.CourtLetters, o => o));
            sl.CourtLetters.Clear();
        }

        var fired = sl.Standing.Where(x => x.Fires > 0 && x.Fires <= S.Turn).OrderBy(x => IdNumber(x.Id)).ToList();
        sl.Standing.RemoveAll(fired.Contains);
        var standing = new List<(Order Order, StandingOrder From)>();
        var firings = new List<Firing>();
        foreach (var f in fired)
        {
            var orders = f.Orders.Select(o => AsItStands(S, p, o)).OfType<Order>().ToList();
            var free = Survivors(now, orders, o => o);
            var kept = Survivors(standing.Select(x => x.Order), free, o => o);
            // Each order an earlier standing order's replaced, with that standing order's id.
            var earlier = free.Where(o => !kept.Any(k => ReferenceEquals(k, o)))
                .Select(o => (Order: o, By: standing.First(x => Survivors<Order>([x.Order], [o], y => y).Count == 0).From.Id)).ToList();
            firings.Add(new Firing(f, kept, orders.Where(o => !free.Any(k => ReferenceEquals(k, o))).ToList(), earlier));
            standing.AddRange(kept.Select(o => (o, f)));
        }

        var due = replacement is not null ? []
            : sl.Scheduled.Where(x => x.Turn == S.Turn).Select(x => (Order: AsItStands(S, p, x), Plan: x)).Where(x => x.Order is not null).ToList();
        sl.Scheduled.RemoveAll(x => x.Turn <= S.Turn);
        var runs = Survivors(now.Concat(standing.Select(x => x.Order)), due, x => x.Order!);

        scheduled = standing.Select(x => x.Order).Concat(runs.Select(x => x.Order!)).ToList();
        // The stand-in's orders come last, for the units and people the seat's own plans leave free.
        var filling = standIn ? Survivors(now.Concat(scheduled), sub.Orders, o => o) : [];
        _scheduledNow[p] = scheduled;
        _standingNow[p] = standing.Select(x => (x.Order, x.From.Id)).ToList();
        _firedNow[p] = firings;
        _marchNow[p] = runs.Where(x => x.Order is MoveOrder).Select(x => (x.Order!, x.Plan)).ToList();
        return new TurnSubmission
        {
            Orders = now.Concat(scheduled).Concat(filling).ToList(), Notes = sub.Notes, Sleep = sub.Sleep, Scheduled = sub.Scheduled,
            Standing = sub.Standing, CancelStanding = sub.CancelStanding, FromFallback = sub.FromFallback,
        };
    }

    /// <summary>
    /// A standing order that fired this season: the orders it gave, those the orders given now replaced, and those an
    /// earlier standing order that fired with it replaced (with that one's id). Told to its seat once the orders are checked.
    /// </summary>
    private sealed record Firing(StandingOrder From, List<Order> Given, List<Order> ByYours, List<(Order Order, string By)> ByEarlier);

    /// <summary>
    /// The notice that a standing order fired, written once the season's orders are checked: what set it off, the orders it
    /// gave, those refused (with the reason), and those that other orders replaced.
    /// </summary>
    private void TellFired(Power p, Firing f, ValidationResult v)
    {
        string List(IEnumerable<Order> orders) => string.Join("; ", orders.Select(o => o.Describe()));
        var refused = f.Given.Select(o => (Order: o, Why: v.Rejected.FirstOrDefault(r => ReferenceEquals(r.Order, o))?.Reason)).Where(x => x.Why is not null).ToList();
        var given = f.Given.Where(o => !refused.Any(r => ReferenceEquals(r.Order, o))).ToList();
        var text = new List<string> { $"Your standing order {f.From.Id} ({WhenText(p, f.From)}) fired: {f.From.Cause} in turn {f.From.Fires - 1}." };
        if (given.Count > 0) text.Add($"In turn {S.Turn} it gave these orders: {List(given)}.");
        if (refused.Count > 0) text.Add($"Refused: {string.Join("; ", refused.Select(r => $"{r.Order.Describe()} ({r.Why})"))}.");
        if (f.ByYours.Count > 0) text.Add($"Replaced by the orders you gave for turn {S.Turn}: {List(f.ByYours)}.");
        foreach (var g in f.ByEarlier.GroupBy(x => x.By))
            text.Add($"Replaced by standing order {g.Key}, which fired in the same season: {List(g.Select(x => x.Order))}.");
        S.Notify(p, InboxKind.Resolution, StandingFiredTitle(f.From.Id), string.Join(" ", text));
    }

    /// <summary>The orders of <paramref name="under"/> that still run beside <paramref name="over"/>, which replace them (see <see cref="WithScheduled"/>).</summary>
    private static List<T> Survivors<T>(IEnumerable<Order> over, IEnumerable<T> under, Func<T, Order> order)
    {
        var given = over.ToList();
        var units = given.Select(OrderKeys.UnitOf).OfType<string>().ToHashSet();
        var people = given.Select(OrderKeys.CharacterOf).OfType<string>().ToHashSet();
        var renewing = given.OfType<RenewOrder>().Select(r => r.Character).ToHashSet();
        var renewedOrDismissed = given.OfType<DismissOrder>().Select(d => d.Character).Concat(renewing).ToHashSet();
        var same = given.Select(o => o.Describe()).ToHashSet();
        return under.Where(x => order(x) is var o
                                && !same.Contains(o.Describe())
                                && (OrderKeys.UnitOf(o) is not { } u || !units.Contains(u))
                                && (OrderKeys.CharacterOf(o) is not { } c || !people.Contains(c))
                                && !(o is DismissOrder dm && renewing.Contains(dm.Character))
                                && !(o is RenewOrder rn && renewedOrDismissed.Contains(rn.Character))).ToList();
    }

    /// <summary>
    /// A kept order as it is given from where its units stand now: the seat's own unit (and its own unit supported or
    /// convoyed) wherever it has gone since. Null if one of them is no longer the seat's (destroyed, disbanded, given away).
    /// </summary>
    public static Order? AsItStands(GameState s, Power p, PlannedOrder plan)
    {
        string? At(string? id) => s.Units.FirstOrDefault(u => u.Id == id && u.Power == p)?.Province;
        var unit = plan.UnitId is null ? null : At(plan.UnitId);
        var other = plan.OtherUnitId is null ? null : At(plan.OtherUnitId);
        if ((plan.UnitId is not null && unit is null) || (plan.OtherUnitId is not null && other is null)) return null;
        if (unit is null) return plan.Order;
        return plan.Order switch
        {
            HoldOrder h => h with { Unit = unit },
            MoveOrder m => m with { Unit = unit },
            SupportOrder sp => sp with { Unit = unit, Supported = other ?? sp.Supported },
            ConvoyOrder c => c with { Unit = unit, Army = other ?? c.Army },
            DisbandOrder d => d with { Unit = unit },
            GiftUnitOrder g => g with { Unit = unit },
            var o => o,
        };
    }

    /// <summary>The scheduled and standing orders running this season, per seat, to tell their failures from the seat's fresh ones.</summary>
    private readonly Dictionary<Power, List<Order>> _scheduledNow = new();

    /// <summary>Of those, the ones from standing orders that fired, with the standing order's id.</summary>
    private readonly Dictionary<Power, List<(Order Order, string Id)>> _standingNow = new();

    /// <summary>The standing orders that fired this season, per seat, to be told once the orders are checked.</summary>
    private readonly Dictionary<Power, List<Firing>> _firedNow = new();

    /// <summary>The scheduled moves running this season, per seat, with what was kept: a move that fails holds up its unit's march.</summary>
    private readonly Dictionary<Power, List<(Order Order, PlannedOrder Plan)>> _marchNow = new();

    /// <summary>How a failed scheduled or standing order is named when it wakes its seat.</summary>
    private string FailureOf(Power p, Order order) =>
        _standingNow.GetValueOrDefault(p)?.FirstOrDefault(x => ReferenceEquals(x.Order, order)) is { Id: { } id }
            ? $"a standing order of yours could not be carried out: {id}"
            : "orders you scheduled could not be carried out";

    /// <summary>
    /// A scheduled or standing order that failed while the season resolved (a move that was stopped, a support that was cut,
    /// a support or convoy that matched no move, or a levy, cession or purchase that could not go through) wakes its seat next season.
    /// </summary>
    private void ScheduledFailed(Power p, Order order, string why)
    {
        if (!_scheduledNow.TryGetValue(p, out var list) || !list.Any(o => ReferenceEquals(o, order)) || !S.Sleep.TryGetValue(p, out var sl)) return;
        sl.PendingWake.Add($"{FailureOf(p, order)}: {order.Describe()} ({why})");
    }

    /// <summary>
    /// After validation: failed scheduled and standing orders wake the seat next season. A seat that was asked this season
    /// (and answered itself, not through the stand-in) keeps the orders it scheduled and its new standing orders, and goes
    /// to sleep: until a reason wakes it, the season it named, or the hidden cap, turn + 1 + <see cref="GameConfig.MaxSleep"/>.
    /// </summary>
    private void AfterValidation(Power p, TurnSubmission sub, ValidationResult v, List<Order> scheduled)
    {
        if (!S.Config.SleepingSeats || !S.Sleep.TryGetValue(p, out var sl)) return;
        foreach (var f in _firedNow.GetValueOrDefault(p) ?? []) TellFired(p, f, v);
        // A seat asked this season has seen earlier failures in its own news; only this season's count.
        var asked = !sl.Asleep && !sub.FromFallback;
        if (asked) sl.PendingWake.Clear();
        var failed = v.Rejected.Where(r => scheduled.Any(o => ReferenceEquals(o, r.Order))).ToList();
        foreach (var g in failed.GroupBy(f => FailureOf(p, f.Order)))
            sl.PendingWake.Add($"{g.Key}: " + Entries(g.Select(f => $"{f.Order.Describe()} ({f.Reason})").ToList(), "Orders that could not be carried out"));
        // Asleep, or the script king stood in after the seat's call failed: the seat has not seen this season yet,
        // and it is asked again next season.
        if (!asked) return;

        // The seat was asked this season: it has now seen its digest, keeps what it scheduled, and sleeps.
        sl.LastCalled = S.Turn;
        sl.Digest.Clear();
        sl.DigestLeftOut = 0;
        KeepScheduled(p, sl, sub.Scheduled);
        KeepStanding(p, sl, sub.Standing);

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
                // A condition that holds as the trigger is set must first stop holding (see Comes): the person must leave
                // and come back, a treasury below the amount must rise to it again. One sent out this season is still at
                // court now, and is seen away at the next check.
                WakeKind.EnvoyReturns => BackAtCourt(p, t.Character) ? null : WakeTrigger.Armed,
                WakeKind.TreasuryBelow => S.Treasuries[p].Ledger < t.Amount ? null : WakeTrigger.Armed,
                _ => null,
            },
        }).ToList();
        sl.History.Add(new SleepSpell { From = S.Turn + 1, Named = named });
    }

    /// <summary>
    /// Binds an order the seat gives for later to the units it names: each of its own units, named by the province it stands
    /// in now, and its own unit named as the unit supported or the army convoyed. Null, with the reason in the rulebook's
    /// words, when it names a province where the seat has no unit, or could not be read.
    /// </summary>
    private PlannedOrder? Bind(Power p, int turn, Order o, out string refusal)
    {
        refusal = "";
        if (o is UnreadableOrder unreadable)
        {
            refusal = unreadable.Reason;
            return null;
        }
        var plan = new PlannedOrder { Turn = turn, Order = o };
        if (OrderKeys.UnitOf(o) is { } at)
        {
            // In the validator's words: a foreign unit is named as such only where the seat can see it.
            if (!Map.Exists(at)) refusal = $"there is no province called '{at}'";
            else if (S.UnitAt(at) is { } unit && unit.Power == p) plan.UnitId = unit.Id;
            else refusal = OrderValidator.NotYours(S.UnitAt(at), at, Views.Sight(S, Map, p));
            if (plan.UnitId is null) return null;
        }
        // A foreign unit, or walls, stay named by their province.
        if (o switch { SupportOrder sp => sp.Supported, ConvoyOrder c => c.Army, _ => null } is { } other && S.UnitAt(other) is { } helped && helped.Power == p)
            plan.OtherUnitId = helped.Id;
        return plan;
    }

    /// <summary>
    /// Keeps the orders a seat scheduled for later seasons: any later season, at most <see cref="MaxScheduledPerSeason"/>
    /// orders a season, for at most <see cref="MaxScheduledSeasons"/> seasons. One entry per season replaces everything
    /// scheduled for it, and an empty entry cancels it. Each order is bound to the units it names (<see cref="Bind"/>); one
    /// naming a province where the seat has no unit is refused, which wakes the seat next season. What is not kept is reported.
    /// </summary>
    private void KeepScheduled(Power p, SleepState sl, List<ScheduledOrders> plans)
    {
        var notKept = new List<string>();
        var refused = new List<string>();
        foreach (var plan in plans.Where(x => x.Turn != S.Turn).GroupBy(x => x.Turn).Select(g => g.Last()).OrderBy(x => x.Turn))
        {
            if (plan.Turn < S.Turn)
            {
                if (plan.Orders.Count > 0) notKept.Add($"turn {plan.Turn}: that season has passed");
                continue;
            }
            // A season after the game's last is kept like any other, under the same limits: its orders never run, because
            // the game ends first, and nothing the king reads depends on when the game must end.
            sl.Scheduled.RemoveAll(x => x.Turn == plan.Turn);
            if (plan.Orders.Count == 0) continue;
            if (plan.Orders.Count > MaxScheduledPerSeason)
                notKept.Add($"turn {plan.Turn}: only the first {MaxScheduledPerSeason} of its {plan.Orders.Count} orders were kept; at most {MaxScheduledPerSeason} orders may be scheduled for one season");
            foreach (var o in plan.Orders.Take(MaxScheduledPerSeason))
            {
                if (Bind(p, plan.Turn, o, out var why) is { } bound) sl.Scheduled.Add(bound);
                else refused.Add($"turn {plan.Turn}: {o.Describe()}: {why}");
            }
        }
        // By season, then as given (a stable sort).
        sl.Scheduled = sl.Scheduled.OrderBy(x => x.Turn).ToList();
        var seasons = sl.Scheduled.Select(x => x.Turn).Distinct().ToList();
        if (seasons.Count > MaxScheduledSeasons)
        {
            var late = seasons.Skip(MaxScheduledSeasons).ToList();
            notKept.Add($"turn{(late.Count == 1 ? "" : "s")} {string.Join(", ", late)}: orders may be scheduled for at most {MaxScheduledSeasons} seasons, so those for the latest were not kept");
            sl.Scheduled.RemoveAll(x => late.Contains(x.Turn));
        }
        // Orders past a limit, or for a season already past, are refused like any other, and wake the seat the same way.
        if (notKept.Count + refused.Count == 0) return;
        const string title = "Scheduled orders not kept";
        S.Notify(p, InboxKind.Rejected, title, string.Join("\n", refused.Concat(notKept).Select(x => "- " + x)));
        sl.PendingWake.Add("orders you scheduled were refused: " + Entries(refused.Concat(notKept).ToList(), title));
    }

    /// <summary>
    /// Keeps a seat's new standing orders, at most <see cref="MaxStanding"/> in all, each bound to the units it names
    /// (<see cref="Bind"/>). One that cannot be kept is refused whole, which wakes the seat next season.
    /// </summary>
    private void KeepStanding(Power p, SleepState sl, List<StandingRequest> requests)
    {
        var refused = new List<string>();
        foreach (var r in requests)
        {
            var province = string.IsNullOrWhiteSpace(r.Province) ? "?" : r.Province;
            var unit = Map.Exists(r.Province) && S.UnitAt(r.Province) is { } u && u.Power == p ? u : null;
            var what = r.When == StandingWhen.UnitAttacked ? $"when your unit in {province} is attacked" : EntersText(p, r.Power, province);
            var why = r.Unreadable
                      ?? (!Map.Exists(r.Province) ? $"there is no province called '{r.Province}'" : null)
                      ?? (r.When == StandingWhen.UnitAttacked && unit is null ? $"you have no unit in {province}" : null)
                      ?? (r.Orders.Count == 0 ? "it gives no orders" : null)
                      ?? (r.Orders.Count > MaxScheduledPerSeason ? $"it gives {r.Orders.Count} orders; a standing order may give at most {MaxScheduledPerSeason}" : null)
                      ?? (sl.Standing.Count >= MaxStanding ? $"you may keep at most {MaxStanding} standing orders" : null);
            var bound = new List<PlannedOrder>();
            if (why is null)
                foreach (var o in r.Orders)
                {
                    if (Bind(p, 0, o, out var refusal) is { } plan) bound.Add(plan);
                    else
                    {
                        why = $"{o.Describe()}: {refusal}";
                        break;
                    }
                }
            if (why is not null)
            {
                refused.Add($"{what}: {why}");
                continue;
            }
            sl.Standing.Add(new StandingOrder
            {
                Id = $"s{++sl.LastStanding}",
                When = r.When,
                Power = r.When == StandingWhen.UnitEnters ? r.Power : null,
                Province = r.Province,
                UnitId = r.When == StandingWhen.UnitAttacked ? unit!.Id : null,
                Orders = bound,
            });
        }
        if (refused.Count == 0) return;
        const string title = "Standing orders not kept";
        S.Notify(p, InboxKind.Rejected, title, string.Join("\n", refused.Select(x => "- " + x)));
        sl.PendingWake.Add("standing orders you gave were refused: " + Entries(refused, title));
    }

    /// <summary>Cancels standing orders by id, or all of them; an id the seat does not have is reported.</summary>
    private void CancelStanding(Power p, SleepState sl, List<string> ids)
    {
        var named = ids.Select(x => x.Trim()).Where(x => x.Length > 0).ToList();
        if (named.Any(x => x.Equals("all", StringComparison.OrdinalIgnoreCase)))
        {
            sl.Standing.Clear();
            return;
        }
        var unknown = named.Where(id => sl.Standing.RemoveAll(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase)) == 0).ToList();
        if (unknown.Count > 0)
            S.Notify(p, InboxKind.Rejected, "Standing orders not cancelled", string.Join("\n", unknown.Select(x => $"- {x}: you have no standing order {x}")));
    }

    /// <summary>What a standing order waits for, in the words its seat reads: its unit named by where it stands now.</summary>
    private string WhenText(Power p, StandingOrder st) => st.When == StandingWhen.UnitAttacked
        ? S.Units.FirstOrDefault(u => u.Id == st.UnitId && u.Power == p) is { } u ? $"when your {Kind(u.Kind)} in {u.Province} is attacked" : $"when your unit that stood in {st.Province} is attacked"
        : EntersText(p, st.Power, st.Province ?? "?");

    /// <summary>The words for <see cref="StandingWhen.UnitEnters"/>: whose troops, and where.</summary>
    public static string EntersText(Power viewer, Power? power, string province) =>
        $"when {(power is { } w ? w == viewer ? "your own" : $"{w}'s" : "foreign")} troops enter {province}";

    /// <summary>
    /// After movement, the events standing orders wait for, as each seat saw them: a unit of the power named (any foreign
    /// power's if none) moving into the province named; a foreign move against the province where the seat's unit stood,
    /// the unit staying there. A standing order whose event happened fires next season, once.
    /// </summary>
    private void StandingEvents(AdjudicationResult result, IReadOnlyDictionary<string, string> stoodAt)
    {
        if (!S.Config.SleepingSeats) return;
        foreach (var (p, sl) in S.Sleep.OrderBy(x => x.Key))
        {
            if (!S.IsAlive(p) || sl.Standing.Count == 0) continue;
            var seen = S.LastSeen.GetValueOrDefault(p) ?? [];
            foreach (var st in sl.Standing.Where(x => x.Fires == 0))
            {
                var hit = st.When switch
                {
                    StandingWhen.UnitEnters => seen.FirstOrDefault(o => o.Order == "move" && o.Succeeded && o.Target == st.Province
                                                                    && (st.Power is { } who ? o.Power == who : o.Power != p)),
                    StandingWhen.UnitAttacked when st.UnitId is { } id && stoodAt.TryGetValue(id, out var at)
                                                   && result.NewPositions.TryGetValue(id, out var still) && still == at =>
                        seen.FirstOrDefault(o => o.Order == "move" && o.Power != p && o.Target == at),
                    _ => null,
                };
                if (hit is null) continue;
                st.Fires = S.Turn + 1;
                st.Cause = $"{hit.Power}'s {Kind(hit.UnitKind)} {(hit.Succeeded ? "moved" : "tried to move")} {hit.Province} -> {hit.Target}";
            }
        }
    }

    /// <summary>
    /// After movement, each scheduled move that ran this season: one whose unit still stands but did not get where it was
    /// going is tried again next season, and each of that unit's later scheduled orders waits a season; failing a second
    /// time, or refused, it ends the unit's march, and the unit's remaining scheduled orders are dropped. (The failure
    /// itself wakes the seat.) A unit that was destroyed takes its orders with it (<see cref="LostUnits"/>).
    /// </summary>
    private void Marches(IReadOnlyDictionary<Power, ValidationResult> valid)
    {
        foreach (var (p, moves) in _marchNow.OrderBy(x => x.Key))
        {
            if (!S.Sleep.TryGetValue(p, out var sl)) continue;
            foreach (var (order, plan) in moves)
            {
                var move = (MoveOrder)order;
                if (S.Units.FirstOrDefault(u => u.Id == plan.UnitId && u.Power == p) is not { } unit) continue;
                var whose = $"Your {Kind(unit.Kind)} in {unit.Province}";
                if (valid.GetValueOrDefault(p)?.Rejected.FirstOrDefault(r => ReferenceEquals(r.Order, order)) is { } refused)
                    EndMarch(p, sl, plan, unit, $"{whose} could not be ordered to {move.To} in turn {S.Turn} ({refused.Reason})", quietIfNothingDropped: true);
                else if (unit.Province == move.To)
                    continue;
                else if (plan.Retry)
                    EndMarch(p, sl, plan, unit, $"{whose} failed to reach {move.To} a second time in turn {S.Turn}", quietIfNothingDropped: false);
                else
                {
                    var later = sl.Scheduled.Where(x => x.UnitId == plan.UnitId && x.Turn > S.Turn).ToList();
                    foreach (var x in later) x.Turn++;
                    sl.Scheduled.Add(new PlannedOrder { Turn = S.Turn + 1, Order = plan.Order, UnitId = plan.UnitId, OtherUnitId = plan.OtherUnitId, Retry = true });
                    sl.Scheduled = sl.Scheduled.OrderBy(x => x.Turn).ToList();
                    var turns = later.Select(x => x.Turn).Distinct().ToList();
                    S.Notify(p, InboxKind.Rejected, MarchHeldUpTitle,
                        $"{whose} did not reach {move.To} in turn {S.Turn}. It will try again in turn {S.Turn + 1}"
                        + (turns.Count == 0 ? "." : $", and each of its later scheduled orders waits a season (they now run in turn{(turns.Count == 1 ? "" : "s")} {string.Join(", ", turns)})."));
                }
            }
        }
    }

    /// <summary>A unit's march ends: its remaining scheduled orders are dropped, and its seat is told which.</summary>
    private void EndMarch(Power p, SleepState sl, PlannedOrder plan, Unit unit, string what, bool quietIfNothingDropped)
    {
        var dropped = sl.Scheduled.Where(x => x.UnitId == plan.UnitId && x.Turn > S.Turn).ToList();
        sl.Scheduled.RemoveAll(dropped.Contains);
        if (dropped.Count == 0 && quietIfNothingDropped) return;
        S.Notify(p, InboxKind.Rejected, MarchEndsTitle, $"{what}: its march ends"
            + (dropped.Count == 0 ? "." : ", and its remaining scheduled orders were dropped: "
                + string.Join("; ", dropped.Select(d => $"turn {d.Turn}: {(AsItStands(S, p, d) ?? d.Order).Describe()}")) + "."));
    }

    /// <summary>
    /// Orders bound to troops the seat no longer has (destroyed, deserted, disbanded or given away) can never run: they are
    /// dropped, a standing order with them if it waited on that unit or has no orders left, and the seat is told and woken.
    /// </summary>
    private void LostUnits(Power p, SleepState sl)
    {
        bool Gone(string? id) => id is not null && !S.Units.Any(u => u.Id == id && u.Power == p);
        bool Lost(PlannedOrder x) => Gone(x.UnitId) || Gone(x.OtherUnitId);
        var lines = sl.Scheduled.Where(Lost).Select(x => $"turn {x.Turn}: {x.Order.Describe()}").ToList();
        sl.Scheduled.RemoveAll(Lost);
        foreach (var st in sl.Standing.ToList())
        {
            if (Gone(st.UnitId) || st.Orders.All(Lost))
            {
                sl.Standing.Remove(st);
                lines.Add($"standing order {st.Id} ({(st.When == StandingWhen.UnitAttacked ? $"when your unit that stood in {st.Province} is attacked" : EntersText(p, st.Power, st.Province ?? "?"))})");
            }
            else if (st.Orders.Where(Lost).Select(x => x.Order.Describe()).ToList() is { Count: > 0 } lost)
            {
                st.Orders.RemoveAll(Lost);
                lines.Add($"from standing order {st.Id}: {string.Join("; ", lost)}");
            }
        }
        if (lines.Count == 0) return;
        S.Notify(p, InboxKind.Rejected, LostTroopsTitle,
            "These orders were for troops you no longer have (destroyed, deserted, disbanded or given away), so they were dropped. Each names its unit by where it stood when you gave the order:\n"
            + string.Join("\n", lines.Select(x => "- " + x)));
        sl.PendingWake.Add($"orders you gave for later could not be carried out: the troops they were for are lost ({Entries(lines, LostTroopsTitle)})");
    }

    /// <summary>The most orders a wake reason names; the rest are counted, and the notice it names lists every one.</summary>
    public const int MaxReasonEntries = 3;

    /// <summary>The orders a wake reason names: the first few, and how many more the notice lists, so the reason stays short.</summary>
    private static string Entries(List<string> items, string notice) => items.Count <= MaxReasonEntries
        ? string.Join("; ", items)
        : string.Join("; ", items.Take(MaxReasonEntries)) + $"; and {items.Count - MaxReasonEntries} more, listed in the notice \"{notice}\"";

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
