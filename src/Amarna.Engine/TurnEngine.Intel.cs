namespace Amarna.Engine;

/// <summary>Spies, counter-intelligence, captives, assays, authentication and forgery.</summary>
public sealed partial class TurnEngine
{
    private void ResolveIntelligence(List<(Power P, Order O)> orders)
    {
        foreach (var (p, o) in orders)
            if (o is CounterIntelOrder ci && Pay(p, ci.Spend, "watchmen"))
                S.CounterIntel[p] = ci.Spend;

        foreach (var (p, o) in orders)
        {
            switch (o)
            {
                case PlaceSpyOrder ps: PlaceSpy(p, ps); break;
                case RecallSpyOrder rs:
                    var recalled = S.Char(rs.Character);
                    // A spy its master still believes at its post: the master now believes it on the road home.
                    if (recalled.Cover is { } cover && cover.For == p)
                    {
                        cover.Believed = Duty.EnvoyHomebound;
                        cover.DutyText = "on the road home";
                        cover.WhereText = recalled.WatchProvince is { } wp ? $"in {wp}" : "travelling";
                    }
                    else Recall(p, recalled);
                    break;
                case AssayOrder a: Assay(p, a); break;
                case AuthenticateOrder au:
                    if (Pay(p, au.Spend, "the examination of a tablet"))
                        S.Tasks.Add(new PendingTask { Id = S.NewId("q"), Kind = TaskKind.Authenticate, Requester = p, DueTurn = S.Turn + 1, CopyId = au.Copy, Spend = au.Spend });
                    break;
                case ForgeOrder f: Forge(p, f); break;
                case CaptiveOrder co: Captive(p, co); break;
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
        if (c.Status != CharacterStatus.Employed) return;
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

    private void SpyComesHome(Journey j)
    {
        var c = S.Char(j.CharacterId!);
        if (c.Status != CharacterStatus.Employed || c.Employer != j.To) return;
        c.Duty = Duty.None;
        c.At = j.To;
        c.MissionTarget = null;
        c.WatchProvince = null;
        c.TurnsAbroad = 0;
        S.Notify(j.To, InboxKind.Notice, "Agent returns", $"{c.Name} is back at court.", c.Id);
    }

    /// <summary>Every posted spy risks detection, then observes what its competence allows and sends word home.</summary>
    private void WatchAndReport()
    {
        foreach (var c in S.Characters.Where(c => c.Duty == Duty.SpyPosted && c.Status == CharacterStatus.Employed).OrderBy(c => IdNumber(c.Id)).ToList())
        {
            var employer = c.Employer!.Value;
            var host = c.MissionTarget ?? (c.WatchProvince is { } wp ? S.Owner.GetValueOrDefault(wp) : null);
            var rng = R("spy", c.Id);

            if (host is { } h && h != employer && c.SecretMaster != h)
            {
                var watch = S.CounterIntel.GetValueOrDefault(h);
                var p = Math.Clamp(0.05 + watch / 300.0 - c.Traits.Competence / 400.0, 0.02, 0.6);
                if (rng.Chance(p))
                {
                    Capture(c, h, rng);
                    continue;
                }
            }

            var report = new SpyReport { SpyId = c.Id, Court = c.MissionTarget, Province = c.WatchProvince, ObservedTurn = S.Turn };
            report.Observations.AddRange(SpyObserve(c, rng));
            if (c.SecretMaster is { } master && master == host)
            {
                report.Poison = c.PoisonText;
                report.Observations = report.Observations.Take(1).ToList();
            }
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

    private void SpyReportArrives(Journey j)
    {
        var c = S.FindCharacter(j.CharacterId);
        if (c is null || j.Report is null) return;
        MindRequests.Add(new MindRequest { Id = S.NewId("r"), Task = MindTask.SpyReport, CharacterId = c.Id, Court = j.To, Report = j.Report });
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
        S.Log("spy-caught", $"{host} caught {c.Name}, a spy of {employer}.", [host], "spy-caught");
    }

    private void Captive(Power host, CaptiveOrder co)
    {
        var c = S.Char(co.Character);
        if (c.Status != CharacterStatus.Captured || c.HeldBy != host) return;
        var employer = c.Employer;
        switch (co.Fate)
        {
            case CaptiveFate.Execute:
                // Its master goes on believing what it believed until the rumour of the death arrives.
                if (employer is { } lord) CoverFor(c, lord, c.Cover?.Believed ?? Duty.None);
                c.Status = CharacterStatus.Dead;
                c.Duty = Duty.None;
                S.Log("execution", $"{host} executed {c.Name}.", [host]);
                if (employer is { } e) Rumor(e, host, $"It is said that {c.Name} was put to death in {host}.", c.Id, NewsKind.Death);
                break;
            case CaptiveFate.Ransom:
                if (employer is not { } payer || !S.IsAlive(payer)) break;
                S.Tasks.Add(new PendingTask { Id = S.NewId("q"), Kind = TaskKind.RansomDemand, Requester = payer, Other = host, CharacterId = c.Id, Spend = co.Ransom, DueTurn = S.Turn + 5 });
                Rumor(payer, host, $"{host} holds {c.Name} and demands {Money.Format(co.Ransom)} for their return (order payRansom for {c.Id}).", c.Id, NewsKind.Ransom);
                break;
            case CaptiveFate.Turn:
                // A captive whose kingdom has fallen has no court left to deceive: they stay a captive.
                if (employer is not { } master || !S.IsAlive(master)) break;
                c.Status = CharacterStatus.Employed;
                c.SecretMaster = host;
                c.PoisonText = Greeting.Cap(co.Poison, 600);
                c.Duty = Duty.SpyPosted;
                c.HeldBy = null;
                // Back at its post, where it watched from before (a court, or out in a province): what its master believed all along.
                c.At = c.MissionTarget;
                c.Cover = null;
                c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Was caught by {host.Land()} and now secretly serves it.", Secrecy = Secrecy.Deep, Tag = "turned", KnownBy = [host] });
                c.Remember(S.Turn, $"To save my life I agreed to serve {host.Land()} in secret and send home what they tell me.");
                S.Log("double-agent", $"{host} turned {c.Name} into a double agent against {employer}.", [host], "double-agent");
                break;
            case CaptiveFate.Release:
                ReleaseCaptive(host, c);
                break;
        }
    }

    private void ReleaseCaptive(Power host, Character c)
    {
        c.Status = c.Employer is null ? CharacterStatus.Free : CharacterStatus.Employed;
        c.HeldBy = null;
        c.Cover = null;
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
        var task = S.Tasks.FirstOrDefault(t => t.Kind == TaskKind.RansomDemand && t.CharacterId == pr.Character && t.Requester == payer);
        if (task is null || task.Other is not { } host) return;
        if (!Pay(payer, task.Spend, "a ransom")) return;
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
    private void Rumor(Power to, Power from, string text, string? about = null, NewsKind? news = null)
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
        });
    }

    private void Assay(Power p, AssayOrder a)
    {
        var t = S.Treasuries[p];
        var lot = t.Lots.FirstOrDefault(l => l.Id == a.Lot);
        if (lot is null || !Pay(p, S.Config.AssayFee, "an assay")) return;
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
        string result;
        if (!tablet.Forged)
            result = rng.Chance(0.95) ? "The seals are genuine." : "The scribes cannot agree; the result is inconclusive.";
        else
        {
            var detect = Math.Clamp(0.2 + task.Spend / 200.0 - tablet.ForgerSkill / 150.0, 0.05, 0.95);
            if (rng.Chance(detect))
            {
                result = "The seals are false: this tablet is a forgery.";
                S.Log("forgery-detected", $"{task.Requester} found that tablet {tablet.Id} is forged.", [task.Requester], "forgery-detected");
                if (tablet.ForgerEmployer is { } culprit && rng.Chance(Math.Clamp(0.3 + task.Spend / 400.0, 0.3, 0.8)))
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
            else result = "The seals appear genuine.";
        }
        copy.AuthResult = result;
        S.Notify(task.Requester, InboxKind.Authentication, "Examination of a tablet", $"\"{Greeting.Cap(tablet.Text, 200)}\" — {result}");
        S.Log("authenticate", $"{task.Requester} paid to authenticate a tablet.", [task.Requester], "authentication");
    }

    private void Forge(Power p, ForgeOrder f)
    {
        var c = S.Char(f.Character);
        if (c.Traits.Competence < S.Config.ForgeMinCompetence)
        {
            S.Notify(p, InboxKind.Notice, "Forgery botched", $"{c.Name} lacks the skill; the clay is ruined and nothing usable came of it.", c.Id);
            Pay(p, S.Config.ForgeFee, "spoiled clay");
            return;
        }
        if (!Pay(p, S.Config.ForgeFee, "a forger's materials")) return;
        var seals = f.Seals.Distinct().ToList();
        var tablet = new Tablet
        {
            Id = S.NewId("t"),
            Text = Greeting.Cap(f.Text, 1200),
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
