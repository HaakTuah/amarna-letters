namespace Amarna.Engine;

/// <summary>Spies, counter-intelligence, captives, assays, authentication and forgery.</summary>
public sealed partial class TurnEngine
{
    private void ResolveIntelligence(List<(Power P, Order O)> orders)
    {
        foreach (var (p, o) in orders)
            if (o is CounterIntelOrder ci && Pay(p, ci.Spend, "watchmen", ci, "none were set"))
                S.CounterIntel[p] = ci.Spend;

        // Captors decide first, so that a ransom paid the same season meets the captive as its captor left them,
        // whichever court comes first.
        foreach (var (p, o) in orders)
            if (o is CaptiveOrder co) Captive(p, co);

        foreach (var (p, o) in orders)
        {
            switch (o)
            {
                case PlaceSpyOrder ps: PlaceSpy(p, ps); break;
                case RecallSpyOrder rs:
                    var recalled = S.Char(rs.Character);
                    if (recalled.CoverOf(p) is { } cover) RecallCovered(p, recalled, cover);
                    else if (recalled.Employer == p && recalled.Status == CharacterStatus.Employed && recalled.Duty == Duty.SpyPosted) Recall(p, recalled);
                    else Failed(p, rs, "Recall failed", $"{recalled.Name} was not watching anywhere for you, so could not be recalled.", "not on a mission", byOthers: true, recalled.Id);
                    break;
                case AssayOrder a: Assay(p, a); break;
                case AuthenticateOrder au:
                    if (Pay(p, au.Spend, "the examination of a tablet", au, $"tablet {au.Copy} was not examined"))
                        S.Tasks.Add(new PendingTask { Id = S.NewId("q"), Kind = TaskKind.Authenticate, Requester = p, DueTurn = S.Turn + 1, CopyId = au.Copy, Spend = au.Spend });
                    break;
                case ForgeOrder f: Forge(p, f); break;
                case PayRansomOrder pr: PayRansom(p, pr); break;
            }
        }

        WatchAndReport();
    }

    private void PlaceSpy(Power p, PlaceSpyOrder ps)
    {
        var c = S.Char(ps.Character);
        var target = ps.Court is { } court ? Map.Capital(court).Id : ps.Province!;
        var travel = TravelTurns(Map.Capital(p).Id, target);
        c.Duty = Duty.SpyOutbound;
        c.At = null;
        c.MissionTarget = ps.Court;
        c.WatchProvince = ps.Province;
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.SpyOutbound,
            DepartTurn = S.Turn,
            ArriveTurn = S.Turn + travel,
            From = p,
            To = ps.Court ?? p,
            CharacterId = c.Id,
        });
        c.Remember(S.Turn, $"My lord of {p.Land()} sent me quietly to watch {ps.Court?.Land() ?? Map[ps.Province!].Name}.");
        S.Notify(p, InboxKind.Notice, "Agent sent", $"{c.Name} left last season to watch {ps.Court?.ToString() ?? Map[ps.Province!].Name}; the journey takes {travel} season(s).", c.Id);
    }

    private void SpyArrives(Journey j)
    {
        var c = S.Char(j.CharacterId!);
        if (c.Status == CharacterStatus.Free)
        {
            // Dismissed on the way, or its kingdom fell: free at the court it was going to watch, or back from the province.
            if (c.MissionTarget is { } court)
            {
                c.Duty = Duty.None;
                c.At = court;
                c.MissionTarget = null;
                c.WatchProvince = null;
            }
            else Recall(j.From, c);
            return;
        }
        // Taken into another court's service on the way: it is there already.
        if (c.Status != CharacterStatus.Employed || c.Employer != j.From) return;
        c.Duty = Duty.SpyPosted;
        c.At = c.MissionTarget;
    }

    private void Recall(Power p, Character c)
    {
        var from = c.MissionTarget is { } court ? Map.Capital(court).Id : c.WatchProvince ?? Map.Capital(p).Id;
        c.Duty = Duty.EnvoyHomebound;
        c.At = null;
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.SpyHomebound,
            DepartTurn = S.Turn,
            ArriveTurn = S.Turn + TravelTurns(from, Map.Capital(p).Id),
            From = c.MissionTarget ?? p,
            To = p,
            CharacterId = c.Id,
        });
    }

    /// <summary>
    /// A spy its master still believes at its post, though it was caught or let go: the master now believes it on
    /// the road home, and hears a season after it was due that it has not come back. If its captor turns it, it
    /// comes home as told.
    /// </summary>
    private void RecallCovered(Power p, Character c, Cover cover)
    {
        cover.Believed = Duty.EnvoyHomebound;
        cover.Recalled = true;
        cover.DutyText = "on the road home";
        cover.WhereText = c.WatchProvince is { } wp ? $"in {wp}" : "travelling";
        var post = c.MissionTarget is { } court ? Map.Capital(court).Id : c.WatchProvince ?? Map.Capital(p).Id;
        var place = c.MissionTarget is { } at ? $"the court of {at}" : c.WatchProvince is { } field ? Map[field].Name : p.ToString();
        var due = S.Turn + TravelTurns(post, Map.Capital(p).Id);
        // Due back as a spy really recalled now would be.
        cover.TimingText = Views.HomeTiming(due);
        Overdue(p, c, c.HeldBy ?? c.MissionTarget ?? p, due, place);
    }

    private void SpyComesHome(Journey j)
    {
        var c = S.Char(j.CharacterId!);
        // Dismissed on the way: free at the court it came back to. Taken into another court's service: it is there already.
        var free = c.Status == CharacterStatus.Free;
        if (!free && (c.Status != CharacterStatus.Employed || c.Employer != j.To)) return;
        c.Duty = Duty.None;
        c.At = j.To;
        c.MissionTarget = null;
        c.WatchProvince = null;
        c.TurnsAbroad = 0;
        if (!free) S.Notify(j.To, InboxKind.Notice, "Agent returns", $"{c.Name} is back at court.", c.Id);
    }

    /// <summary>Every posted spy risks detection, then observes what its competence allows and sends word home.</summary>
    private void WatchAndReport()
    {
        foreach (var c in S.Characters.Where(c => c.Duty == Duty.SpyPosted && c.Status == CharacterStatus.Employed).OrderBy(c => IdNumber(c.Id)).ToList())
        {
            var employer = c.Employer!.Value;
            var host = c.MissionTarget ?? (c.WatchProvince is { } wp ? S.Owner.GetValueOrDefault(wp) : null);
            var rng = R("spy", c.Id);

            // A fallen court has nobody left to catch a spy, nor to decide its fate.
            if (host is { } h && h != employer && c.SecretMaster != h && S.IsAlive(h))
            {
                var watch = S.CounterIntel.GetValueOrDefault(h);
                var p = Math.Clamp(0.05 + watch / 300.0 - c.Traits.Competence / 400.0, 0.02, 0.6);
                if (rng.Chance(p))
                {
                    Capture(c, h, rng);
                    continue;
                }
            }

            // What the spy was when it observed: a report that arrives after its capture is still written as it was then.
            var report = new SpyReport { SpyId = c.Id, Court = c.MissionTarget, Province = c.WatchProvince, ObservedTurn = S.Turn, FactCount = c.Facts.Count, SecretMaster = c.SecretMaster };
            report.Observations.AddRange(SpyObserve(c, rng));
            if (c.SecretMaster is { } master && master == host)
            {
                report.Poison = c.PoisonText;
                report.Observations = report.Observations.Take(1).ToList();
            }
            // A spy at a living court copies from its archive; one turned by that court sends home only what it is told.
            else if (c.MissionTarget is { } watched && S.IsAlive(watched))
                report.TabletIds = CopyFromArchive(c, watched, employer);
            var from = c.MissionTarget is { } court ? Map.Capital(court).Id : c.WatchProvince ?? Map.Capital(employer).Id;
            S.Journeys.Add(new Journey
            {
                Id = S.NewId("j"),
                Kind = JourneyKind.SpyReport,
                DepartTurn = S.Turn,
                ArriveTurn = S.Turn + TravelTurns(from, Map.Capital(employer).Id),
                From = host ?? employer,
                To = employer,
                CharacterId = c.Id,
                Report = report,
            });
        }
    }

    private List<string> SpyObserve(Character c, Rng rng)
    {
        var obs = new List<string>();
        var skill = c.Traits.Competence / 100.0;
        if (c.MissionTarget is { } court)
        {
            var land = S.OwnedBy(court).ToHashSet();
            var near = new HashSet<string>(land);
            foreach (var id in land) foreach (var n in Map.Neighbors(id)) near.Add(n);
            foreach (var u in S.Units.Where(u => near.Contains(u.Province)).OrderBy(u => u.Province))
                if (rng.Chance(0.35 + skill * 0.6)) obs.Add($"{u.Power} has {(u.Kind == UnitKind.Army ? "an army" : "a fleet")} in {Map[u.Province].Name}.");
            if (rng.Chance(skill))
            {
                var g = S.Treasuries[court].Gold;
                var lo = Math.Max(0, (int)(g * (0.75 + rng.NextDouble() * 0.2)));
                var hi = (int)(g * (1.05 + rng.NextDouble() * 0.25)) + 20;
                obs.Add($"The treasury of {court} holds between {Money.Format(lo)} and {Money.Format(hi)}.");
            }
            foreach (var v in S.Characters.Where(x => x.At == court && x.Id != c.Id && x.Employer is { } e && e != court && x.Duty is Duty.EnvoyAtCourt or Duty.Detained))
                if (rng.Chance(skill)) obs.Add($"{v.Name}, envoy of {v.Employer}, was received at {court}{(v.Duty == Duty.Detained ? " and is being held there" : "")}.");
            foreach (var cat in S.Catastrophes.Where(x => x.Power == court && x.EndTurn >= S.Turn && x.StartTurn <= S.Turn + 1))
                obs.Add($"In {court}: {cat.Text}");
            // The captives the court holds, noticed as envoys at court are; its executions, always, as catastrophes are.
            obs.AddRange(LossesHeard(c, court, held: skill, death: 1));
            foreach (var x in S.Characters.Where(x => x.Employer == court && x.At == court && x.Id != c.Id))
            {
                var secret = x.Facts.FirstOrDefault(f => f.Secrecy == Secrecy.Hidden && !f.KnownBy.Contains(c.Employer!.Value));
                var deep = x.Facts.FirstOrDefault(f => f.Secrecy == Secrecy.Deep && !f.KnownBy.Contains(c.Employer!.Value));
                if (secret is not null && rng.Chance(skill / 2.5)) { secret.KnownBy.Add(c.Employer!.Value); obs.Add($"About {x.Name}: {secret.Text}"); }
                else if (deep is not null && rng.Chance(skill / 6)) { deep.KnownBy.Add(c.Employer!.Value); obs.Add($"About {x.Name}: {deep.Text}"); }
            }
        }
        else if (c.WatchProvince is { } wp)
        {
            var watched = Map.Neighbors(wp).Append(wp).ToHashSet();
            foreach (var u in S.Units.Where(u => watched.Contains(u.Province)).OrderBy(u => u.Province))
                if (rng.Chance(0.5 + skill * 0.5)) obs.Add($"{u.Power} has {(u.Kind == UnitKind.Army ? "an army" : "a fleet")} in {Map[u.Province].Name}.");
        }
        if (obs.Count == 0) obs.Add("Nothing of note this season.");
        return obs;
    }

    /// <summary>How long a court talks of a servant it put to death: the season of the death and this many after.</summary>
    public const int LossNewsSeasons = 3;

    /// <summary>
    /// What a carrier (an envoy received at <paramref name="court"/>, or a spy posted there) hears of the servants of other
    /// courts caught or put to death there: the captives the court still holds, each with the chance <paramref name="held"/>,
    /// and those it put to death in the last <see cref="LossNewsSeasons"/> seasons, with the chance <paramref name="death"/>,
    /// named with their master where the court knows it. Its own random stream, so nothing else the carrier notices changes.
    /// Each line begins with the court's name, as the carrier's other news of the court does.
    /// </summary>
    private List<string> LossesHeard(Character carrier, Power court, double held, double death)
    {
        var rng = R("losses-heard", carrier.Id);
        var heard = new List<string>();
        var talk = S.Losses.Where(l => l.Court == court && l.CharacterId != carrier.Id)
            .GroupBy(l => (l.CharacterId, l.Kind)).Select(g => g.Last()).OrderBy(l => l.Turn).ThenBy(l => IdNumber(l.CharacterId));
        foreach (var l in talk)
        {
            if (S.FindCharacter(l.CharacterId) is not { } x) continue;
            if (l.Kind == LossKind.Captured && x.Status == CharacterStatus.Captured && x.HeldBy == court)
            {
                if (rng.Chance(held))
                    heard.Add($"{court} holds {x.Name}, {(l.Master is { } m ? $"a spy of {m}" : "a spy who will not say whom they serve")}, captive (caught in turn {l.Turn}).");
            }
            else if (l.Kind == LossKind.PutToDeath && S.Turn - l.Turn <= LossNewsSeasons && rng.Chance(death))
                heard.Add($"{court} put {x.Name}, {(l.Master is { } m ? $"a spy of {m}" : "a spy who would not say whom they served")}, to death in turn {l.Turn}.");
        }
        return heard;
    }

    private void SpyReportArrives(Journey j)
    {
        var c = S.FindCharacter(j.CharacterId);
        if (c is null || j.Report is null) return;
        // A report it sent after its master's belief was frozen (a captive turned and back at its post): word has come from it.
        if (c.CoverOf(j.To) is { } cover && j.Report.ObservedTurn >= cover.Since) c.Covers.Remove(cover);
        // The copies it made of the watched court's archive come home with the report.
        var copies = ArchiveCopiesArrive(j, c);
        MindRequests.Add(new MindRequest { Id = S.NewId("r"), Task = MindTask.SpyReport, CharacterId = c.Id, Court = j.To, Report = j.Report, CopyIds = copies });
    }

    private void Capture(Character c, Power host, Rng rng)
    {
        var employer = c.Employer!.Value;
        // Its master goes on seeing it at its post until word comes.
        CoverFor(c, employer, Duty.SpyPosted);
        c.Status = CharacterStatus.Captured;
        c.HeldBy = host;
        c.Duty = Duty.None;
        c.At = host;
        var confesses = c.Traits.Courage < 50 || rng.Chance(0.4);
        c.Remember(S.Turn, $"I was caught spying in {host.Land()}." + (confesses ? $" I told them I serve {employer.Land()}." : " I did not say whom I serve."));
        S.Notify(host, InboxKind.Notice, "A spy is caught",
            $"Your watchmen caught {c.Name}" + (confesses ? $", who confesses to serving {employer}." : ", who will not say whom they serve.")
            + " You may execute, ransom, turn or release them.", c.Id);
        // The captor's record says what its court learned: whose spy, only if it confessed. The truth goes in a line
        // nobody's court sees (the god view's), which carries the success marker.
        if (confesses) S.Log("spy-caught", $"{host} caught {c.Name}, a spy of {employer}.", [host], "spy-caught");
        else
        {
            S.Log("spy-caught", $"{host} caught {c.Name}, a spy who will not say whom they serve.", [host]);
            S.Log("spy-caught", $"{host} caught {c.Name}, a spy of {employer} who would not say so.", [], "spy-caught");
        }
        // The talk of the court that holds it, for the envoys and spies there to carry home: whose spy, if it confessed.
        S.Losses.Add(new LossAbroad { Turn = S.Turn, Kind = LossKind.Captured, CharacterId = c.Id, Court = host, Master = confesses ? employer : null });
    }

    private void Captive(Power host, CaptiveOrder co)
    {
        var c = S.Char(co.Character);
        if (c.Status != CharacterStatus.Captured || c.HeldBy != host)
        {
            Failed(host, co, "Captive order failed", $"Your order for {c.Name} could not be carried out: {c.Name} was no longer your captive.", "no longer your captive", byOthers: true, c.Id);
            return;
        }
        // Checked again as the season resolves: the captive's king may have dismissed them this season.
        if (OrderValidator.CaptiveRefusal(S, c, co.Fate) is { } why)
        {
            S.Notify(host, InboxKind.Rejected, "Captive order failed", $"Your order for {c.Name} could not be carried out: {why}.", c.Id);
            ScheduledFailed(host, co, why);
            return;
        }
        var employer = c.Employer;
        switch (co.Fate)
        {
            case CaptiveFate.Execute:
                // Its master goes on believing what it believed until the rumour of the death arrives.
                if (employer is { } lord) CoverFor(c, lord, Duty.None);
                c.Status = CharacterStatus.Dead;
                c.Duty = Duty.None;
                // The dead are never paid: what any court owed it is gone (a court that has not heard keeps its own belief).
                c.BackPay.Clear();
                S.Log("execution", $"{host} executed {c.Name}.", [host]);
                // The rumour reaches its king, and every court that still believes the dead one serves it.
                foreach (var heard in Powers.All.Where(p => p == employer || c.CoverOf(p) is not null))
                    Rumor(heard, host, $"It is said that {c.Name} was put to death in {host}.", c.Id, NewsKind.Death);
                // Other courts hear of it only from their envoys and spies at this court (see LossesHeard).
                S.Losses.Add(new LossAbroad
                {
                    Turn = S.Turn, Kind = LossKind.PutToDeath, CharacterId = c.Id, Court = host,
                    Master = S.Losses.LastOrDefault(l => l.CharacterId == c.Id && l.Court == host && l.Kind == LossKind.Captured)?.Master,
                });
                break;
            case CaptiveFate.Ransom:
                var payer = OrderValidator.RansomPayer(S, c)!.Value;
                // One open demand per captive: a new one replaces the old. A demand whose word is still on the road
                // goes at once and announces nothing; one the payer has heard of stands, and can be paid, until the
                // new one's word arrives.
                S.Tasks.RemoveAll(t => t.Kind == TaskKind.RansomDemand && t.CharacterId == c.Id && !t.Announced);
                var demand = new PendingTask { Id = S.NewId("q"), Kind = TaskKind.RansomDemand, Requester = payer, Other = host, CharacterId = c.Id, Spend = co.Ransom, DueTurn = S.Turn + 5 };
                S.Tasks.Add(demand);
                Rumor(payer, host, $"{host} holds {c.Name} and demands {Money.Format(co.Ransom)} for their return (order pay_ransom for {c.Id}).", c.Id, NewsKind.Ransom, demand.Id);
                break;
            case CaptiveFate.Turn:
                var master = employer!.Value;
                var cover = c.CoverOf(master);
                // A master that has heard of the capture goes on believing its servant held until word comes from it again.
                if (cover is null) CoverFor(c, master, Duty.None);
                c.Status = CharacterStatus.Employed;
                c.SecretMaster = host;
                c.PoisonText = Scribe(host, Greeting.Cap(co.Poison, 600));
                c.Duty = Duty.SpyPosted;
                c.HeldBy = null;
                // Back at its post, where it watched from before (a court, or out in a province): what its master believed all along.
                c.At = c.MissionTarget;
                c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Was caught by {host.Land()} and now secretly serves it.", Secrecy = Secrecy.Deep, Tag = "turned", KnownBy = [host] });
                c.Remember(S.Turn, $"To save my life I agreed to serve {host.Land()} in secret and send home what they tell me.");
                S.Log("double-agent", $"{host} turned {c.Name} into a double agent against {employer}.", [host], "double-agent");
                // Recalled by a master that did not know it was caught: it comes home as told, and is seen when it arrives.
                if (cover is { Recalled: true }) Recall(master, c);
                else if (cover is not null) c.Covers.Remove(cover);
                break;
            case CaptiveFate.Release:
                ReleaseCaptive(host, c);
                break;
        }
    }

    /// <summary>
    /// A captive let go walks home. A master that believes it still at its post (or recalled) goes on believing
    /// that until it is home; one that has heard of the capture sees it on the road home at once, so that no ransom
    /// is paid for a captive already free.
    /// </summary>
    private void ReleaseCaptive(Power host, Character c)
    {
        c.Status = c.Employer is null ? CharacterStatus.Free : CharacterStatus.Employed;
        c.HeldBy = null;
        c.Remember(S.Turn, $"{host.Land()} set me free.");
        if (c.Employer is { } e && S.IsAlive(e))
        {
            c.Duty = Duty.SpyOutbound;
            Recall(e, c);
        }
        else
        {
            c.Duty = Duty.None;
            c.At = host;
        }
    }

    private void PayRansom(Power payer, PayRansomOrder pr)
    {
        // Checked again as the season resolves: the captor may have let the captive go, or an earlier order paid already.
        var c = S.Char(pr.Character);
        if (OrderValidator.RansomRefusal(S, payer, c, out var task) is { } why)
        {
            S.Notify(payer, InboxKind.Rejected, "Ransom not sent", $"The ransom for {c.Name} could not be sent: {why}.", c.Id);
            ScheduledFailed(payer, pr, why);
            return;
        }
        var host = task!.Other!.Value;
        if (!Pay(payer, task.Spend, $"the ransom for {c.Name}", pr, "none was sent")) return;
        S.Tasks.Remove(task);
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.Ransom,
            DepartTurn = S.Turn,
            ArriveTurn = S.Turn + TravelTurns(payer, host),
            From = payer,
            To = host,
            CharacterId = pr.Character,
            Gold = task.Spend,
        });
    }

    private void RansomArrives(Journey j)
    {
        var c = S.FindCharacter(j.CharacterId);
        S.Treasuries[j.To].Gold += j.Gold;
        S.Notify(j.To, InboxKind.Notice, "Ransom paid", $"{j.From} paid {Money.Format(j.Gold)} for {c?.Name}.", c?.Id);
        if (c is { Status: CharacterStatus.Captured } && c.HeldBy == j.To) ReleaseCaptive(j.To, c);
    }

    /// <param name="about">One of the receiving court's own people the rumour is about, whose cover it ends on arrival.</param>
    /// <param name="demand">For a ransom demand's rumour: the demand it announces.</param>
    private void Rumor(Power to, Power from, string text, string? about = null, NewsKind? news = null, string? demand = null)
    {
        if (!S.IsAlive(to)) return;
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.Rumor,
            DepartTurn = S.Turn,
            ArriveTurn = S.Turn + TravelTurns(from, to),
            From = from,
            To = to,
            Text = text,
            CharacterId = about,
            News = news,
            TaskId = demand,
        });
    }

    /// <summary>
    /// A ransom demand's rumour reaches the court asked to pay. Only a demand still standing for a captive still
    /// held is announced: one replaced by a newer demand, or for a captive since freed, turned or put to death,
    /// announces nothing.
    /// </summary>
    private bool DemandArrives(Journey j)
    {
        var task = S.Tasks.FirstOrDefault(t => t.Id == j.TaskId);
        var c = S.FindCharacter(j.CharacterId);
        if (task is null || c is not { Status: CharacterStatus.Captured } || c.HeldBy != task.Other)
        {
            if (task is not null) S.Tasks.Remove(task);
            return false;
        }
        task.Announced = true;
        // It replaces the demand the payer had heard of before, which could be paid until now.
        S.Tasks.RemoveAll(t => t.Kind == TaskKind.RansomDemand && t.CharacterId == c.Id && t != task);
        return true;
    }

    private void Assay(Power p, AssayOrder a)
    {
        var t = S.Treasuries[p];
        var lot = t.Lots.FirstOrDefault(l => l.Id == a.Lot);
        if (lot is null)
        {
            // The validator refuses a lot that is not there, or one assayed twice: the only way it is gone now is an
            // earlier payment this season that fell short, when the treasurers weighed all the unassayed gold.
            Failed(p, a, "Assay failed",
                $"Gold lot {a.Lot} was not assayed: your treasurers had already weighed all your unassayed gold last season, when a payment fell short. No fee was paid.",
                "your treasurers had already weighed it", byOthers: true);
            return;
        }
        if (!Pay(p, S.Config.AssayFee, "an assay", a, $"gold lot {a.Lot} was not assayed")) return;
        t.Lots.Remove(lot);
        var pct = lot.Face == 0 ? 100 : (int)Math.Round(100.0 * lot.True / lot.Face);
        var text = $"Of the {Money.Format(lot.Face)} weighed from {lot.From}, {Money.Format(lot.True)} is fine gold ({pct}%).";
        if (lot.Stated != lot.Face) text += $" The inventory had promised {Money.Format(lot.Stated)}.";
        S.Notify(p, InboxKind.Assay, "Assay of gold", text);
        S.Log("assay", $"{p} assayed gold from {lot.From}: {pct}% fine.", [p], pct < 100 ? "debasement-found" : "assay");
    }

    private void FinishAuthentication(PendingTask task)
    {
        var copy = S.Copies.FirstOrDefault(x => x.Id == task.CopyId);
        var tablet = copy is null ? null : S.Tablets.FirstOrDefault(t => t.Id == copy.TabletId);
        if (copy is null || tablet is null) return;
        var rng = R("authenticate", task.Id);
        // A forgery the scribes miss reads exactly as a genuine tablet that reads genuine: the words betray nothing.
        const string genuine = "The seals are genuine.";
        string result;
        if (!tablet.Forged)
            result = rng.Chance(0.95) ? genuine : "The scribes cannot agree; the result is inconclusive.";
        else
        {
            var detect = Math.Clamp(0.2 + task.Spend / 200.0 - tablet.ForgerSkill / 150.0, 0.05, 0.95);
            if (rng.Chance(detect))
            {
                result = "The seals are false: this tablet is a forgery.";
                // The event names the tablet as the court does, not by the engine's id, which a narrator reading its events could repeat.
                S.Log("forgery-detected", $"{task.Requester} found that {Views.TabletName(tablet, Archive(task.Requester))} is forged.", [task.Requester], "forgery-detected");
                // A swapped inventory is traced, with the same chance, to the envoy who forged it and brought it.
                if (tablet.Inventory)
                {
                    if (S.FindCharacter(tablet.ForgerId) is { } bearer && rng.Chance(Math.Clamp(0.3 + task.Spend / 400.0, 0.3, 0.8)))
                        result += InventoryExposed(task.Requester, tablet, bearer);
                }
                else if (tablet.ForgerEmployer is { } culprit && rng.Chance(Math.Clamp(0.3 + task.Spend / 400.0, 0.3, 0.8)))
                {
                    var forger = S.FindCharacter(tablet.ForgerId);
                    result += $" The scribes trace it to the hand of {forger?.Name ?? "a scribe"} in the service of {culprit}.";
                    if (forger is not null)
                    {
                        foreach (var p in Powers.All) forger.Reputation[p] = forger.Reputation.GetValueOrDefault(p) - 30;
                        forger.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Exposed as a forger of seals in the service of {culprit.Land()}.", Secrecy = Secrecy.Public, Tag = "forger" });
                    }
                    foreach (var p in S.Alive.Where(p => p != task.Requester))
                        Rumor(p, task.Requester, $"The scribes of {task.Requester} declare that a tablet bearing the seal of {string.Join(" and ", tablet.Seals)} was forged by {forger?.Name ?? "a scribe"} of {culprit}.");
                    S.Log("forgery-exposed", $"{task.Requester} publicly traced a forgery to {culprit}.", signal: "forgery-exposed");
                }
            }
            else result = genuine;
        }
        copy.AuthResult = result;
        // The tablet as every court names it, the court's own mark for its copy, and its text in full.
        S.Notify(task.Requester, InboxKind.Authentication, "Examination of a tablet", $"{Views.Capitalized(Views.TabletName(tablet, Archive(task.Requester)))} (your copy {copy.Id}): \"{tablet.Text}\" — {result}");
        S.Log("authenticate", $"{task.Requester} paid to authenticate a tablet.", [task.Requester], "authentication");
    }

    private void Forge(Power p, ForgeOrder f)
    {
        var c = S.Char(f.Character);
        if (c.Traits.Competence < S.Config.ForgeMinCompetence)
        {
            // A failed order like any other, though the clay is still paid for.
            Failed(p, f, "Forgery botched", $"{c.Name} lacks the skill; the clay is ruined and nothing usable came of it.", "the forger lacked the skill", byOthers: false, c.Id);
            Pay(p, S.Config.ForgeFee, "spoiled clay");
            return;
        }
        if (!Pay(p, S.Config.ForgeFee, "a forger's materials", f, "nothing was forged")) return;
        var seals = f.Seals.Distinct().ToList();
        var tablet = new Tablet
        {
            Id = S.NewId("t"),
            Text = Scribe(p, Greeting.Cap(f.Text, 1200)),
            ProposedBy = seals[0],
            Partner = seals.Count > 1 ? seals[1] : null,
            Seals = seals,
            CreatedTurn = S.Turn,
            SealedTurn = Math.Max(1, S.Turn - R("forge-date", c.Id).Range(1, 4)),
            Forged = true,
            ForgerId = c.Id,
            ForgerEmployer = p,
            ForgerSkill = c.Traits.Competence,
        };
        S.Tablets.Add(tablet);
        S.Copies.Add(new TabletCopy { Id = S.NewId("k"), TabletId = tablet.Id, Holder = p, AcquiredTurn = S.Turn, Source = $"made by {c.Name}" });
        c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Forged a tablet bearing the seal of {string.Join(" and ", seals)}.", Secrecy = Secrecy.Deep, Tag = "forgery", KnownBy = [p] });
        c.Remember(S.Turn, $"I forged a tablet with the seals of {string.Join(" and ", seals)} for {p.Land()}.");
        S.Notify(p, InboxKind.Tablet, "A tablet is ready", $"{c.Name} has produced a tablet bearing the seals of {string.Join(" and ", seals)}.", c.Id);
        S.Log("forgery", $"{p} had {c.Name} forge a tablet sealed by {string.Join(" and ", seals)}.", [p], "forgery");
    }
}
