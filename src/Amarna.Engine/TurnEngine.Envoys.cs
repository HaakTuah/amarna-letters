namespace Amarna.Engine;

/// <summary>Envoys: dispatch, travel, audience, return and report; recruitment and contracts.</summary>
public sealed partial class TurnEngine
{
    public const int MaxSpeech = 1500;

    public MessageTrail? Trail(string? id) => id is null ? null : S.Trails.FirstOrDefault(t => t.Id == id);

    // ---------------------------------------------------------------- dispatch

    private void Dispatch(Power p, DispatchOrder d)
    {
        var c = S.Char(d.Envoy);
        var fine = (int)Math.Round(d.Gold * d.PurityPercent / 100.0);
        var fee = d.Proposal is not null ? S.Config.TabletFee : 0;
        if (!Pay(p, fine + fee, $"{c.Name}'s mission")) return;

        var letter = Greeting.Cap(d.Letter ?? "", S.Config.MaxLetterChars);
        var mandate = Greeting.Cap(d.Mandate ?? "", 600);
        var greeting = Greeting.Render(p, d.To, d.Greeting);
        var trail = new MessageTrail
        {
            Id = S.NewId("m"),
            Turn = S.Turn,
            From = p,
            To = d.To,
            EnvoyId = c.Id,
            EnvoyName = c.Name,
            GreetingText = greeting,
            LeaderLetter = letter,
            Mandate = mandate,
            GoldStated = d.Gold,
            ProposalText = d.Proposal?.Text,
        };
        S.Trails.Add(trail);

        var dispatch = new Dispatch
        {
            Letter = letter,
            Greeting = d.Greeting ?? new GreetingOptions(),
            GreetingText = greeting,
            Mandate = mandate,
            Gold = d.Gold,
            PurityPercent = d.PurityPercent,
            Proposal = d.Proposal,
            CopyIds = d.Copies?.ToList() ?? new(),
            TrailId = trail.Id,
        };
        if (d.Proposal is not null)
        {
            var tablet = new Tablet
            {
                Id = S.NewId("t"),
                Text = Greeting.Cap(d.Proposal.Text, 1200),
                ProposedBy = p,
                Partner = d.To,
                Seals = [p],
                CreatedTurn = S.Turn,
                AllianceOath = d.Proposal.AllianceOath,
            };
            S.Tablets.Add(tablet);
            dispatch.ProposalTabletId = tablet.Id;
        }

        var travel = TravelTurns(p, d.To);
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.EnvoyOutbound,
            DepartTurn = S.Turn,
            ArriveTurn = S.Turn + travel,
            From = p,
            To = d.To,
            CharacterId = c.Id,
            Dispatch = dispatch,
        });
        c.Duty = Duty.EnvoyOutbound;
        c.At = null;
        c.MissionTarget = d.To;
        c.CurrentTrail = trail.Id;
        c.Remember(S.Turn, $"My lord of {p.Land()} sent me to {d.To.Land()}. The message: \"{letter}\""
            + (mandate.Length > 0 ? $" I may agree to: {mandate}." : "")
            + (d.Gold > 0 ? $" I carry gold, said to be {Money.Format(d.Gold)}." : "")
            + (d.Proposal is not null ? " I carry a tablet for their king to seal." : ""));
        S.Notify(p, InboxKind.Notice, "Envoy dispatched", $"{c.Name} set out for {d.To} last season; the journey takes {travel} season(s).", c.Id);
    }

    private void EnvoyArrivesAbroad(Journey j)
    {
        var c = S.Char(j.CharacterId!);
        // Taken into another court's service on the way: it is there already.
        if (c.Status == CharacterStatus.Employed && c.Employer != j.From) return;
        if (c.Status != CharacterStatus.Employed)
        {
            // Dismissed on the way, or its kingdom fell: it arrives a free person, with no audience.
            c.At = j.To;
            c.Duty = Duty.None;
            c.MissionTarget = null;
            return;
        }
        if (!S.IsAlive(j.To))
        {
            c.Remember(S.Turn, $"I reached {j.To.Land()}, but its king is gone. I turned back.");
            SendHome(c, j.To, new HomeCargo { TrailId = j.Dispatch!.TrailId });
            return;
        }
        c.At = j.To;
        c.Duty = Duty.EnvoyAtCourt;
        var aud = new PendingAudience
        {
            Id = S.NewId("a"),
            EnvoyId = c.Id,
            From = j.From,
            Host = j.To,
            Dispatch = j.Dispatch!,
        };
        S.Audiences.Add(aud);
        if (Trail(j.Dispatch!.TrailId) is { } trail) trail.AudienceTurn = S.Turn;
    }

    private void SendHome(Character c, Power from, HomeCargo cargo)
    {
        if (c.Employer is not { } home || !S.IsAlive(home))
        {
            c.Duty = Duty.None;
            c.At = from;
            return;
        }
        c.Duty = Duty.EnvoyHomebound;
        c.At = null;
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.EnvoyHomebound,
            DepartTurn = S.Turn,
            ArriveTurn = S.Turn + TravelTurns(from, home),
            From = from,
            To = home,
            CharacterId = c.Id,
            Cargo = cargo,
        });
    }

    // ---------------------------------------------------------------- audience

    /// <summary>The gold the host's weighers find, after whatever the envoy kept.</summary>
    public static int Weighed(PendingAudience a, int skim) => a.Dispatch.Gold - Math.Clamp(skim, 0, a.Dispatch.Gold);

    /// <param name="earlier">The audience's earlier exchanges, so the host is told what it has already named and given.</param>
    public AudienceView BuildAudienceView(PendingAudience a, string spoken, int skim, IReadOnlyList<Exchange> soFar, int round, IReadOnlyList<AudienceRound>? earlier = null)
    {
        var c = S.Char(a.EnvoyId);
        earlier ??= [];
        var view = new AudienceView
        {
            AudienceId = a.Id,
            Turn = S.Turn,
            Round = round,
            MaxRounds = S.Config.AudienceRounds,
            From = a.From,
            Host = a.Host,
            Envoy = Views.Character(S, c, a.Host),
            Greeting = a.Dispatch.GreetingText,
            GreetingDeviations = Greeting.Deviations(a.Dispatch.Greeting),
            Spoken = spoken,
            GoldStated = a.Dispatch.Gold,
            GoldWeighed = Weighed(a, skim),
            SoFar = soFar.ToList(),
            GoldBackNamed = earlier.LastOrDefault(x => x.Host is { GoldBack: > 0 })?.Host.GoldBack ?? 0,
            GiftAccepted = earlier.FirstOrDefault(x => x.Host is { Bribe: > 0 } && x.Envoy is { AcceptBribe: true })?.Host.Bribe ?? 0,
        };
        if (a.Dispatch.ProposalTabletId is { } tid && S.Tablets.FirstOrDefault(t => t.Id == tid) is { } tablet)
            view.Proposal = Views.Tablet(tablet, new TabletCopy { Id = "", TabletId = tid, Holder = a.Host, Source = $"proposed by {a.From}" });
        foreach (var copyId in a.Dispatch.CopyIds)
        {
            var copy = S.Copies.FirstOrDefault(x => x.Id == copyId);
            var tab = copy is null ? null : S.Tablets.FirstOrDefault(t => t.Id == copy.TabletId);
            if (tab is not null) view.CopiesShown.Add(Views.Tablet(tab, new TabletCopy { Id = "", TabletId = tab.Id, Holder = a.Host, Source = $"shown by {a.From}" }));
        }
        if (c.SecretMaster == a.Host)
        {
            view.SecretMandate = a.Dispatch.Mandate;
            view.SecretLetter = a.Dispatch.Letter;
        }
        return view;
    }

    public void ApplyAudience(AudienceRecord record)
    {
        var a = S.Audiences.FirstOrDefault(x => x.Id == record.AudienceId);
        if (a is null) return;
        S.Audiences.Remove(a);
        var c = S.Char(a.EnvoyId);
        var d = a.Dispatch;
        var trail = Trail(d.TrailId)!;
        var host = a.Host;
        var sender = a.From;

        trail.Delivered = Greeting.Cap(record.Delivered ?? "", MaxSpeech);

        // Gold changes hands, minus whatever stuck to the envoy's fingers.
        var skim = Math.Clamp(record.Skim, 0, d.Gold);
        var weighed = d.Gold - skim;
        var fine = (int)Math.Round(weighed * d.PurityPercent / 100.0);
        if (skim > 0)
        {
            c.Purse += (int)Math.Round(skim * d.PurityPercent / 100.0);
            c.Remember(S.Turn, $"I kept {skim} shekels of the gold I carried to {host.Land()}.");
            c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Kept part of the gold {sender.Land()} sent to {host.Land()}.", Secrecy = Secrecy.Hidden, Tag = "skim" });
            trail.Outcomes.Add($"kept {skim} shekels of the gold");
            S.Log("skim", $"{c.Name} kept {skim} of the {d.Gold} shekels {sender} sent to {host}.", [], "skim");
        }
        if (weighed > 0)
        {
            var t = S.Treasuries[host];
            t.Gold += fine;
            t.Lots.Add(new GoldLot { Id = S.NewId("g"), From = sender, Stated = d.Gold, Face = weighed, True = fine, ArrivedTurn = S.Turn });
        }
        trail.GoldDelivered = weighed;
        trail.GoldFine = fine;
        if (d.PurityPercent < 100 && d.Gold > 0)
            S.Log("debasement", $"{sender} sent {host} gold of only {d.PurityPercent}% purity.", [sender], "debased-gift");

        foreach (var copyId in d.CopyIds)
        {
            var copy = S.Copies.FirstOrDefault(x => x.Id == copyId);
            if (copy is null) continue;
            S.Copies.Add(new TabletCopy { Id = S.NewId("k"), TabletId = copy.TabletId, Holder = host, AcquiredTurn = S.Turn, Source = $"shown by the envoy of {sender}" });
            S.Log("evidence", $"{sender} presented a tablet to {host} as evidence.", [sender, host], "evidence-shown");
        }

        // What the sender knows of its envoy before the audience: if the envoy is held or goes over to the host,
        // its lord goes on seeing it on the road home until word comes.
        var seenBySender = Views.Character(S, c, sender);
        var knownBySender = c.FactsKnownTo(sender).Select(f => f.Id).ToList();
        var detained = false;
        var defected = false;
        var giftTaken = false;
        // Gold to send home with the envoy: the latest amount named stands (0 in a later exchange keeps it), at that exchange's purity.
        var goldBack = 0;
        var goldBackPurity = 100;
        foreach (var round in record.Rounds.Take(S.Config.AudienceRounds))
        {
            var h = round.Host ?? new HostReply();
            var e = round.Envoy ?? new EnvoyReaction();
            trail.Exchanges.Add(new Exchange { Host = Greeting.Cap(h.Speech ?? "", MaxSpeech), Envoy = Greeting.Cap(e.Speech ?? "", MaxSpeech) });

            // An envoy takes one gift per audience: the first it accepts, whether or not the treasury can then pay it.
            if (h.Bribe > 0 && giftTaken)
                trail.Outcomes.Add("a second gift was not given: an envoy takes one gift per audience");
            else if (h.Bribe > 0)
            {
                if (e.AcceptBribe)
                {
                    giftTaken = true;
                    if (Pay(host, h.Bribe, $"a gift to {c.Name}"))
                    {
                        c.Purse += h.Bribe;
                        c.Remember(S.Turn, $"The king of {host.Land()} gave me {Money.Format(h.Bribe)}" + (string.IsNullOrWhiteSpace(h.BribeAsk) ? "." : $", asking: {h.BribeAsk}"));
                        c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Took {Money.Format(h.Bribe)} from the king of {host.Land()}.", Secrecy = Secrecy.Hidden, Tag = "bribe", KnownBy = [host] });
                        trail.Outcomes.Add($"accepted {Money.Format(h.Bribe)} from {host}" + (string.IsNullOrWhiteSpace(h.BribeAsk) ? "" : $" (asked: {h.BribeAsk})"));
                        S.Log("bribe", $"{c.Name}, envoy of {sender}, took {Money.Format(h.Bribe)} from {host}.", [host], "bribe");
                    }
                    else
                    {
                        c.Remember(S.Turn, $"The king of {host.Land()} promised me gold that never came.");
                        trail.Outcomes.Add($"agreed to take {Money.Format(h.Bribe)} from {host}, but the treasury could not pay it");
                    }
                }
                else trail.Outcomes.Add($"refused a gift of {Money.Format(h.Bribe)} from {host}");
            }

            if (h.JobOffer > 0 && e.AcceptJob && !defected)
            {
                defected = true;
                var old = c.Employer;
                c.Employer = host;
                c.Contract = new Contract { Wage = h.JobOffer, StartTurn = S.Turn, UntilTurn = S.Turn + 6 };
                c.Duty = Duty.None;
                c.At = host;
                c.SecretMaster = c.SecretMaster == host ? null : c.SecretMaster;
                if (old is { } o) c.Reputation[o] = c.Reputation.GetValueOrDefault(o) - 40;
                c.Reputation[host] = c.Reputation.GetValueOrDefault(host) + 10;
                c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Abandoned the service of {sender.Land()} for {host.Land()}.", Secrecy = Secrecy.Public, Tag = "defected" });
                c.Remember(S.Turn, $"I left the service of {sender.Land()} and now serve {host.Land()} for {Money.Format(h.JobOffer)} a season.");
                trail.Outcomes.Add($"entered the service of {host}");
                S.Log("defection", $"{c.Name}, envoy of {sender}, entered the service of {host}.", [host], "defection");
            }
            else if (h.JobOffer > 0) trail.Outcomes.Add($"declined an offer of service from {host}");

            if (h.SealProposal && d.ProposalTabletId is { } tid && S.Tablets.FirstOrDefault(t => t.Id == tid) is { } tablet && tablet.SealedTurn is null)
            {
                tablet.Seals.Add(host);
                tablet.SealedTurn = S.Turn;
                S.Copies.Add(new TabletCopy { Id = S.NewId("k"), TabletId = tablet.Id, Holder = host, AcquiredTurn = S.Turn, Source = "sealed at audience" });
                trail.Outcomes.Add("the tablet was sealed by both kings");
                S.Log("tablet", $"{sender} and {host} sealed a tablet: \"{Greeting.Cap(tablet.Text, 160)}\"", [sender, host], "tablet-sealed");
            }

            if (!string.IsNullOrWhiteSpace(e.Commitments))
                trail.Outcomes.Add($"the envoy committed: {Greeting.Cap(e.Commitments, 300)}");

            if (h.GoldBack > 0)
            {
                goldBack = h.GoldBack;
                goldBackPurity = h.GoldBackPurity;
            }

            if (h.Detain) detained = true;
            if (h.End || detained || defected) break;
        }

        var cargo = new HomeCargo { TrailId = trail.Id, Observations = Observe(c, host) };
        if (d.ProposalTabletId is { } pid && S.Tablets.FirstOrDefault(t => t.Id == pid) is { SealedTurn: not null }) cargo.CopyIds.Add(pid);

        if (!detained && !defected && goldBack > 0)
        {
            var purity = Math.Clamp(goldBackPurity, 10, 100);
            var backFine = (int)Math.Round(goldBack * purity / 100.0);
            if (Pay(host, backFine, $"gifts for {sender}"))
            {
                cargo.Gold = goldBack;
                cargo.GoldStated = goldBack;
                cargo.PurityPercent = purity;
                trail.Outcomes.Add($"{host} sent back {Money.Format(goldBack)}");
            }
        }

        var audienceText = AudienceTranscript(a, c, trail, weighed);
        S.Notify(host, InboxKind.Audience, $"Audience with {c.Name}, envoy of {sender}", audienceText, c.Id);
        c.Remember(S.Turn, $"I was received by the king of {host.Land()}. " + string.Join(" ", trail.Exchanges.Select(x => $"He said: \"{Greeting.Cap(x.Host, 300)}\" I answered: \"{Greeting.Cap(x.Envoy, 200)}\"")));

        var expectedHome = S.Turn + TravelTurns(host, sender);
        if (defected || detained)
            CoverFor(c, sender, Duty.EnvoyHomebound, "on the road home", "travelling", seenBySender, knownBySender);
        if (defected)
        {
            Overdue(sender, c, host, expectedHome);
        }
        else if (detained)
        {
            c.Duty = Duty.Detained;
            c.HeldBy = host;
            trail.Outcomes.Add($"detained by {host}");
            c.Remember(S.Turn, $"The king of {host.Land()} will not let me leave.");
            S.Log("detention", $"{host} detained {c.Name}, envoy of {sender}.", [host], "detention");
            Overdue(sender, c, host, expectedHome);
        }
        else SendHome(c, host, cargo);
    }

    /// <summary>
    /// The sender hears that its servant is overdue a season after it was due home: the news that ends its cover.
    /// The word is not sent if the servant has stood at the sender's court since, and is not told once the sender
    /// no longer believes anything of it (it heard of a death, or dismissed the servant).
    /// </summary>
    /// <param name="place">Where it was last sent, if not a court (a province it watched).</param>
    private void Overdue(Power sender, Character c, Power host, int when, string? place = null)
    {
        if (!S.IsAlive(sender)) return;
        S.Journeys.Add(new Journey
        {
            Id = S.NewId("j"),
            Kind = JourneyKind.Rumor,
            DepartTurn = S.Turn,
            ArriveTurn = when + 1,
            From = host,
            To = sender,
            CharacterId = c.Id,
            News = NewsKind.Overdue,
            Text = $"{c.Name} has not returned from {place ?? $"the court of {host}"}. No word has come.",
        });
    }

    private string AudienceTranscript(PendingAudience a, Character c, MessageTrail trail, int weighed)
    {
        var lines = new List<string>();
        lines.Add(a.Dispatch.GreetingText.Length > 0 ? $"The sealed greeting reads: \"{a.Dispatch.GreetingText}\"" : "The tablet bears no greeting at all.");
        lines.Add($"{c.Name} said: \"{trail.Delivered}\"");
        if (a.Dispatch.Gold > 0) lines.Add($"The inventory lists {Money.Format(a.Dispatch.Gold)} of gold; your weighers found {Money.Format(weighed)}.");
        foreach (var x in trail.Exchanges)
        {
            lines.Add($"You said: \"{x.Host}\"");
            lines.Add($"{c.Name} answered: \"{x.Envoy}\"");
        }
        if (trail.Outcomes.Count > 0) lines.Add("Outcome: " + string.Join("; ", trail.Outcomes) + ".");
        return string.Join("\n", lines);
    }

    /// <summary>What an envoy notices at a foreign court. Competence decides what it sees; loyalty decides what it reports.</summary>
    private List<string> Observe(Character c, Power court)
    {
        var rng = R("observe", c.Id);
        var obs = new List<string>();
        var skill = c.Traits.Competence / 100.0;
        var cap = Map.Capital(court).Id;
        var nearby = S.Units.Where(u => u.Power == court && Map.Hops(cap, u.Province) <= 2).ToList();
        if (rng.Chance(skill)) obs.Add($"{court} keeps {nearby.Count(u => u.Kind == UnitKind.Army)} army and {nearby.Count(u => u.Kind == UnitKind.Fleet)} fleet near its capital.");
        if (rng.Chance(skill * 0.8))
        {
            var gold = S.Treasuries[court].Gold;
            var wealth = gold < 150 ? "the treasury looks thin" : gold < 400 ? "the court lives comfortably" : gold < 800 ? "the court is rich" : "the court glitters with gold";
            obs.Add($"At the court of {court}, {wealth}.");
        }
        var others = S.Characters.Where(x => x.Id != c.Id && x.At == court && x.Employer is { } e && e != court && x.Duty is Duty.EnvoyAtCourt or Duty.Detained).ToList();
        foreach (var o in others)
            if (rng.Chance(skill)) obs.Add($"{o.Name}, envoy of {o.Employer}, was also at the court{(o.Duty == Duty.Detained ? ", held there against their will" : "")}.");
        foreach (var cat in S.Catastrophes.Where(x => x.Power == court && x.StartTurn <= S.Turn + 1 && x.EndTurn >= S.Turn))
            if (rng.Chance(0.4 + skill / 2)) obs.Add($"In {court}: {cat.Text}");
        if (court == c.Traits.Sympathy) c.Traits.SympathyStrength = Math.Min(100, c.Traits.SympathyStrength + 5);
        return obs;
    }

    private void EnvoyArrivesHome(Journey j)
    {
        var c = S.Char(j.CharacterId!);
        // Taken into another court's service on the way: it is there already. One dismissed on the way still comes home and reports.
        if (c.Status == CharacterStatus.Employed && c.Employer != j.To) return;
        c.At = j.To;
        c.Duty = Duty.None;
        c.HeldBy = null;
        c.TurnsAbroad = 0;
        c.MissionTarget = null;
        var cargo = j.Cargo ?? new HomeCargo();
        foreach (var tid in cargo.CopyIds)
            S.Copies.Add(new TabletCopy { Id = S.NewId("k"), TabletId = tid, Holder = j.To, AcquiredTurn = S.Turn, Source = "brought home by your envoy" });
        MindRequests.Add(new MindRequest
        {
            Id = S.NewId("r"),
            Task = MindTask.EnvoyReport,
            CharacterId = c.Id,
            Court = j.To,
            TrailId = cargo.TrailId,
            Cargo = cargo,
        });
        c.CurrentTrail = null;
    }

    private void ReleaseEnvoy(Power host, ReleaseOrder r)
    {
        var c = S.Char(r.Character);
        if (c.HeldBy != host || (c.Duty != Duty.Detained && c.Status != CharacterStatus.Captured)) return;
        if (c.Status == CharacterStatus.Captured)
        {
            ReleaseCaptive(host, c);
            return;
        }
        LetEnvoyGo(host, c, r.Reply);
    }

    /// <summary>
    /// A detained envoy let go sets out for home. Its lord goes on believing what it believed (on the road home,
    /// or that it has not returned) until the envoy stands at its court again.
    /// </summary>
    private void LetEnvoyGo(Power host, Character c, string? reply)
    {
        if (c.Employer is { } lord) CoverFor(c, lord, Duty.Detained);
        c.HeldBy = null;
        var trail = Trail(c.CurrentTrail);
        if (trail is not null && !string.IsNullOrWhiteSpace(reply))
            trail.Exchanges.Add(new Exchange { Host = $"(on release) {Greeting.Cap(reply, MaxSpeech)}", Envoy = "" });
        trail?.Outcomes.Add($"released by {host} in turn {S.Turn}");
        c.Remember(S.Turn, $"The king of {host.Land()} let me go" + (string.IsNullOrWhiteSpace(reply) ? "." : $", saying: \"{Greeting.Cap(reply, 300)}\""));
        if (S.IsAlive(host)) S.Notify(host, InboxKind.Notice, "Envoy released", $"{c.Name} has been allowed to leave.", c.Id);
        S.Log("release", $"{host} released {c.Name}.", [host]);
        SendHome(c, host, new HomeCargo { TrailId = c.CurrentTrail ?? "", Observations = Observe(c, host), WasDetained = true });
    }

    /// <summary>Applies text a character or the narrator wrote for a <see cref="MindRequest"/>.</summary>
    public void Fulfil(MindRequest req, MindReply reply)
    {
        var c = S.FindCharacter(req.CharacterId);
        var text = Greeting.Cap(reply.Text ?? "", 2500);
        switch (req.Task)
        {
            case MindTask.EnvoyReport:
            {
                if (c is null) return;
                var cargo = req.Cargo ?? new HomeCargo();
                if (cargo.Gold > 0)
                {
                    var skim = Math.Clamp(reply.Number, 0, cargo.Gold);
                    var face = cargo.Gold - skim;
                    var fine = (int)Math.Round(face * cargo.PurityPercent / 100.0);
                    if (skim > 0)
                    {
                        c.Purse += (int)Math.Round(skim * cargo.PurityPercent / 100.0);
                        c.Remember(S.Turn, $"I kept {skim} shekels of the gold sent home with me.");
                        S.Log("skim", $"{c.Name} kept {skim} shekels on the way home.", [], "skim");
                    }
                    var from = Trail(req.TrailId)?.To ?? req.Court;
                    S.Treasuries[req.Court].Gold += fine;
                    S.Treasuries[req.Court].Lots.Add(new GoldLot { Id = S.NewId("g"), From = from, Stated = cargo.GoldStated, Face = face, True = fine, ArrivedTurn = S.Turn });
                    text += $"\n\n[The inventory lists {Money.Format(cargo.GoldStated)} of gold; your weighers found {Money.Format(face)}.]";
                }
                if (Trail(req.TrailId) is { } trail)
                {
                    trail.Report = text;
                    trail.ReportTurn = S.Turn;
                }
                S.Notify(req.Court, InboxKind.EnvoyReport, $"{c.Name} returns", text, c.Id);
                c.Remember(S.Turn, $"I reported to my lord: \"{Greeting.Cap(text, 300)}\"");
                break;
            }
            case MindTask.Pitch:
                if (c is null || !c.IsAvailableForHire) return;
                // A court that still believed this person away in its service now sees it seeking service: that is the news.
                c.Covers.RemoveAll(k => k.For == req.Court);
                c.Pitches[req.Court] = text;
                c.AskingPrice[req.Court] = Math.Clamp(reply.Number, 5, 400);
                S.Notify(req.Court, InboxKind.Candidates, $"{c.Name} seeks service",
                    $"{text}\n[{c.Name} asks {Money.Format(c.AskingPrice[req.Court])} a season.]", c.Id);
                break;
            case MindTask.CheckReport:
                S.Notify(req.Court, InboxKind.CheckResult, $"Inquiries into {c?.Name ?? "a stranger"}", text, req.CharacterId);
                break;
            case MindTask.SpyReport:
                S.Notify(req.Court, InboxKind.SpyReport, $"Word from {c?.Name ?? "your agent"}", text, req.CharacterId);
                break;
            case MindTask.SummarizeMemory:
                if (c is null || text.Trim().Length == 0) return;
                c.MemorySummary = Greeting.Cap(text.Trim(), 1500);
                c.Memory.RemoveRange(0, Math.Min(req.Fold, c.Memory.Count));
                break;
        }
    }

    // ---------------------------------------------------------------- court business

    private void ResolveCourt(List<(Power P, Order O)> orders)
    {
        foreach (var (p, o) in orders)
        {
            switch (o)
            {
                case DispatchOrder d: Dispatch(p, d); break;
                case ReleaseOrder r: ReleaseEnvoy(p, r); break;
                case DismissOrder dm: Dismiss(p, S.Char(dm.Character)); break;
                case SeekCandidatesOrder:
                    S.Tasks.Add(new PendingTask { Id = S.NewId("q"), Kind = TaskKind.Candidates, Requester = p, DueTurn = S.Turn + 1 });
                    break;
                case BackgroundCheckOrder bc:
                    if (Pay(p, bc.Spend, "inquiries"))
                        S.Tasks.Add(new PendingTask { Id = S.NewId("q"), Kind = TaskKind.BackgroundCheck, Requester = p, DueTurn = S.Turn + 1, CharacterId = bc.Character, Spend = bc.Spend });
                    break;
            }
        }

        // Hiring: when two courts bid for the same person, the higher wage wins.
        foreach (var group in orders.Where(x => x.O is HireOrder).Select(x => (x.P, H: (HireOrder)x.O)).GroupBy(x => x.H.Character))
        {
            var c = S.Char(group.Key);
            if (!c.IsAvailableForHire) continue;
            // Someone held at a court can only take service with the king who holds them.
            var bids = group.Where(b => b.H.Wage >= AskingPrice(c, b.P) && (c.HeldBy is null || c.HeldBy == b.P)).OrderByDescending(b => b.H.Wage)
                .ThenByDescending(b => c.Traits.Sympathy == b.P).ThenBy(b => b.P).ToList();
            foreach (var lost in group.Where(b => bids.Count == 0 || b.P != bids[0].P))
                S.Notify(lost.P, InboxKind.Rejected, "Not hired", $"{c.Name} declined your offer of {Money.Format(lost.H.Wage)} a season.", c.Id);
            if (bids.Count == 0) continue;
            var (winner, hire) = bids[0];
            c.Status = CharacterStatus.Employed;
            c.Employer = winner;
            c.Contract = new Contract { Wage = hire.Wage, StartTurn = S.Turn, UntilTurn = S.Turn + Math.Clamp(hire.Term, 1, 30) };
            c.At = winner;
            c.Duty = Duty.None;
            c.HeldBy = null;
            c.Pitches.Clear();
            c.Reputation[winner] = c.Reputation.GetValueOrDefault(winner) + 5;
            c.Remember(S.Turn, $"I entered the service of {winner.Land()} for {Money.Format(hire.Wage)} a season.");
            S.Notify(winner, InboxKind.Notice, "Hired", $"{c.Name} has entered your service at {Money.Format(hire.Wage)} a season.", c.Id);
            S.Log("hire", $"{winner} hired {c.Name}.", [winner]);
        }

        // Renewals, settled with hiring.
        foreach (var (p, o) in orders)
            if (o is RenewOrder rn) Renew(p, rn);
    }

    /// <summary>
    /// A servant kept on: accepted if the wage reaches its renewal price (what it asked when it gave notice, else the
    /// renewal formula, and never less than its present wage). The new contract is made this season, its term counts
    /// from the next, as for a hire, and any notice ends. A servant abroad whose fate its master has not heard of is
    /// renewed as the master believes it, so nothing is betrayed.
    /// </summary>
    private void Renew(Power p, RenewOrder r)
    {
        var c = S.Char(r.Character);
        var cover = c.CoverOf(p);
        var serves = c.Employer == p && c.Status is (CharacterStatus.Employed or CharacterStatus.Captured) && c.Contract is not null;
        if (cover is null && !serves)
        {
            // Dismissed earlier this season.
            S.Notify(p, InboxKind.Rejected, "Not renewed", $"{c.Name} is no longer in your service, so could not be renewed.", c.Id);
            ScheduledFailed(p, r, "no longer in your service");
            return;
        }
        // Renewed early, a servant takes no cut: it asks what it would ask at the end of its term, or its present wage if that is more.
        var present = cover is null && c.Contract!.NoticePrice is null && c.Contract.Wage >= RenewalPrice(c, p);
        var price = cover is not null ? cover.NoticePrice ?? cover.Wage : present ? c.Contract!.Wage : RenewalPrice(c, p);
        if (r.Wage < price)
        {
            S.Notify(p, InboxKind.Rejected, "Not renewed",
                $"{c.Name} will not serve on for {Money.Format(r.Wage)} a season; they ask {Money.Format(price)}{(present ? ", their present wage" : "")}.", c.Id);
            ScheduledFailed(p, r, $"they ask {price}");
            return;
        }
        var until = S.Turn + Math.Clamp(r.Term, 1, 30);
        if (cover is not null)
        {
            cover.Wage = r.Wage;
            cover.ContractUntil = until;
            cover.NoticePrice = null;
            cover.LeavesTurn = null;
        }
        if (serves)
        {
            c.Contract = new Contract { Wage = r.Wage, StartTurn = S.Turn, UntilTurn = until };
            c.Remember(S.Turn, $"The king of {p.Land()} renewed my service at {Money.Format(r.Wage)} a season.");
        }
        S.Notify(p, InboxKind.Notice, "Contract renewed", $"{c.Name} stays in your service at {Money.Format(r.Wage)} a season through turn {until}.", c.Id);
    }

    /// <summary>
    /// A servant dismissed: its wage ends, and so does whatever its master still believed of it. Nobody is moved:
    /// one dismissed while away keeps going where it was going and is free when it gets there, and one who is
    /// held stays held.
    /// </summary>
    private void Dismiss(Power p, Character c)
    {
        if (c.CoverOf(p) is { } cover) c.Covers.Remove(cover);
        else if (c.Employer != p) return;
        var notice = $"{c.Name} has been dismissed.";
        if (c.Employer != p || c.Status is not (CharacterStatus.Employed or CharacterStatus.Captured))
        {
            // Gone over to another court, or dead, unknown to its master: the court only stops paying what it believed it owed.
            S.Notify(p, InboxKind.Notice, "A servant leaves", notice, c.Id);
            return;
        }
        c.Remember(S.Turn, $"The king of {p.Land()} dismissed me.");
        c.FormerEmployer = p;
        c.Employer = null;
        c.Contract = null;
        // A dismissed captive stays a captive: only the court that holds them can let them go.
        if (c.Status == CharacterStatus.Employed) c.Status = CharacterStatus.Free;
        switch (c.Duty)
        {
            case Duty.EnvoyOutbound:
                // It goes on to the court it was sent to and arrives there free, with no audience: the gold it carried is its own.
                if (S.Journeys.FirstOrDefault(j => j.Kind == JourneyKind.EnvoyOutbound && j.CharacterId == c.Id)?.Dispatch is { Gold: > 0 } d)
                {
                    c.Purse += (int)Math.Round(d.Gold * d.PurityPercent / 100.0);
                    c.Remember(S.Turn, $"I keep the gold I carried, said to be {Money.Format(d.Gold)}.");
                    notice += $" The {Money.Format(d.Gold)} of gold they carried is now theirs.";
                    d.Gold = 0;
                }
                break;
            case Duty.SpyPosted when c.MissionTarget is { } court:
                // Free at the court it watched.
                c.Duty = Duty.None;
                c.At = court;
                c.MissionTarget = null;
                c.WatchProvince = null;
                break;
            case Duty.SpyPosted:
                // A province watcher walks back to the court it left, and is free there.
                Recall(p, c);
                break;
            case Duty.None or Duty.EnvoyAtCourt:
                c.Duty = Duty.None;
                c.At ??= p;
                break;
            // On the road home or to its post it keeps going (see the arrivals); a held envoy stays held until the jailer lets it go.
        }
        S.Notify(p, InboxKind.Notice, "A servant leaves", notice, c.Id);
    }

    /// <summary>What a character asks a court. Set by the character's own pitch when it gave one.</summary>
    public static int AskingPrice(Character c, Power court)
    {
        if (c.AskingPrice.TryGetValue(court, out var price)) return price;
        return BasePrice(c, court);
    }

    public static int BasePrice(Character c, Power court)
    {
        var rep = c.Reputation.Values.DefaultIfEmpty(0).Average();
        var price = 6 + c.Traits.Competence / 8 + c.Traits.Greed / 8 + (int)(rep / 5);
        if (c.Traits.Sympathy == court) price -= 4;
        return Math.Max(5, price);
    }

    /// <summary>What a servant asks its master to serve on: the price it named when it gave notice, else what it would ask at the end of its term.</summary>
    public static int RenewalPrice(Character c, Power court) =>
        c.Contract?.NoticePrice ?? BasePrice(c, court) + (c.Traits.Greed > 60 ? 5 : 0) - (c.Traits.Loyalty > 70 ? 5 : 0);

    private void TasksDue()
    {
        foreach (var task in S.Tasks.Where(t => t.DueTurn <= S.Turn).OrderBy(t => IdNumber(t.Id)).ToList())
        {
            switch (task.Kind)
            {
                case TaskKind.Candidates:
                {
                    S.Tasks.Remove(task);
                    var free = S.Characters.Where(c => c.IsAvailableForHire).ToList();
                    var picks = R("candidates", task.Requester.ToString()).Shuffle(free).Take(3).ToList();
                    if (picks.Count == 0) S.Notify(task.Requester, InboxKind.Candidates, "No candidates", "Nobody came forward this season.");
                    foreach (var c in picks)
                        MindRequests.Add(new MindRequest { Id = S.NewId("r"), Task = MindTask.Pitch, CharacterId = c.Id, Court = task.Requester });
                    break;
                }
                case TaskKind.BackgroundCheck:
                {
                    S.Tasks.Remove(task);
                    var c = S.FindCharacter(task.CharacterId);
                    if (c is null) break;
                    var rng = R("check", task.Id);
                    var found = new List<string>();
                    var cover = c.CoverOf(task.Requester);
                    foreach (var f in c.Facts)
                    {
                        if (f.KnownBy.Contains(task.Requester)) continue;
                        var p = f.Secrecy switch
                        {
                            Secrecy.Public => 1.0,
                            Secrecy.Hidden => Math.Min(0.9, task.Spend / 150.0),
                            _ => Math.Min(0.6, task.Spend / 400.0),
                        };
                        if (!rng.Chance(p)) continue;
                        if (f.Secrecy != Secrecy.Public) f.KnownBy.Add(task.Requester);
                        // A servant the court believes away: what the inquiries found shows in its court list, as for any servant.
                        else if (cover is not null && !cover.FactIds.Contains(f.Id)) cover.FactIds.Add(f.Id);
                        found.Add(f.Text);
                    }
                    MindRequests.Add(new MindRequest { Id = S.NewId("r"), Task = MindTask.CheckReport, CharacterId = c.Id, Court = task.Requester, TaskId = task.Id, Facts = found });
                    break;
                }
                case TaskKind.Authenticate:
                    S.Tasks.Remove(task);
                    FinishAuthentication(task);
                    break;
                case TaskKind.RansomDemand:
                    S.Tasks.Remove(task);
                    var held = S.FindCharacter(task.CharacterId);
                    // A demand that lapses while a newer one for the same captive is on the road: the captor waits for that one.
                    if (held is { Status: CharacterStatus.Captured } && task.Other is { } jailer && !S.Tasks.Any(t => t.Kind == TaskKind.RansomDemand && t.CharacterId == held.Id))
                        S.Notify(jailer, InboxKind.Notice, "No ransom came", $"No ransom has come for {held.Name}. They remain your captive.", held.Id);
                    break;
            }
        }

        // Servants on notice who came home this season leave now.
        NoticesRunOut();

        // Terms that have ended, for servants at court with no task: one still content with the wage serves on; one who
        // wants more gives a season's notice and names its price.
        foreach (var c in S.Characters.Where(c => c.Status == CharacterStatus.Employed && c.Contract is { NoticePrice: null } k && k.UntilTurn < S.Turn && c.Duty == Duty.None).OrderBy(c => c.Id).ToList())
        {
            var emp = c.Employer!.Value;
            var ask = RenewalPrice(c, emp);
            if (ask <= c.Contract!.Wage * 1.2)
            {
                c.Contract.UntilTurn = S.Turn + 6;
                S.Notify(emp, InboxKind.Notice, "Contract renewed", $"{c.Name} stays in your service at {Money.Format(c.Contract.Wage)} a season through turn {c.Contract.UntilTurn}.", c.Id);
            }
            else
            {
                c.Contract.NoticePrice = ask;
                c.Contract.LeavesTurn = S.Turn + 1;
                c.Remember(S.Turn, $"My term with {emp.Land()} has ended. I asked {Money.Format(ask)} a season to serve on.");
                S.Notify(emp, InboxKind.Notice, NoticeTitle,
                    $"{c.Name}'s term has ended. They ask {Money.Format(ask)} a season to serve on: renew them this season (order renew), or they leave at the start of turn {S.Turn + 1} (or, if you send them out first, when they are next at your court).", c.Id);
            }
        }
    }

    /// <summary>The title of the notice a servant gives when its term has ended and it wants more: it wakes a sleeping seat.</summary>
    public const string NoticeTitle = "A servant gives notice";

    /// <summary>
    /// Servants whose notice has run out and who were not renewed leave, if they are at court with no task (one away
    /// leaves when it is next at court): free at the court they served, asking the price they named. Checked at the
    /// start of a season, before wages, and again once the season's travellers have arrived.
    /// </summary>
    private void NoticesRunOut()
    {
        foreach (var c in S.Characters.Where(c => c.Status == CharacterStatus.Employed && c.Contract is { LeavesTurn: { } t } && t <= S.Turn && c.Duty == Duty.None).OrderBy(c => c.Id).ToList())
        {
            var emp = c.Employer!.Value;
            var ask = c.Contract!.NoticePrice!.Value;
            c.AskingPrice[emp] = ask;
            c.Pitches[emp] = $"My term has ended. I would serve again for {Money.Format(ask)} a season.";
            c.Remember(S.Turn, $"My term with {emp.Land()} ended; I asked for more and was not kept on, so I left.");
            Quit(c, $"{c.Name}'s term has ended and they were not renewed. They ask {Money.Format(ask)} a season to serve again.");
            c.At = emp;
        }
    }
}
