namespace Amarna.Engine;

/// <summary>
/// Seeded catastrophes, known exactly only to the power they strike. A court that can see the stricken land
/// hears of it the next season; distant courts learn of it only through their envoys and spies.
/// </summary>
public sealed partial class TurnEngine
{
    private void WorldEvents()
    {
        // What each court could see before the season's catastrophes (a plague takes a unit, and with it some sight).
        var sight = S.Alive.ToDictionary(p => p, p => Views.Sight(S, Map, p));
        foreach (var p in S.Alive.ToList())
        {
            var rng = R("catastrophe", p.ToString());
            if (!rng.Chance(S.Config.CatastropheChance)) continue;
            var owned = S.OwnedBy(p).ToList();
            if (owned.Count == 0) continue;
            var kind = rng.Pick(Enum.GetValues<CatastropheKind>());
            var cat = new Catastrophe { Id = S.NewId("x"), Power = p, Kind = kind, StartTurn = S.Turn + 1 };
            string exact, plain;
            switch (kind)
            {
                case CatastropheKind.Drought:
                    cat.EndTurn = S.Turn + 3;
                    cat.IncomeFactor = 0.5;
                    cat.Text = "the rains failed and the harvest withers across the land";
                    exact = "The rains have failed. For three seasons the whole realm will yield only half its income.";
                    plain = $"Travellers say the harvest has failed in {p.Land()}.";
                    break;
                case CatastropheKind.Plague:
                    cat.EndTurn = S.Turn + 2;
                    cat.IncomeFactor = 0.75;
                    cat.Text = "the hand of Nergal lies on the land: plague kills soldiers and peasants";
                    var victim = S.Units.Where(u => u.Power == p).OrderBy(u => u.Id).ToList();
                    var lost = victim.Count > 0 ? rng.Pick(victim) : null;
                    if (lost is not null) S.Units.Remove(lost);
                    exact = "The hand of Nergal is on the land. Plague will cut income by a quarter for two seasons"
                            + (lost is not null ? $", and it has destroyed your {lost.Label}." : ".");
                    plain = $"Word comes of sickness in {p.Land()}.";
                    break;
                case CatastropheKind.Flood:
                    cat.Province = rng.Pick(owned);
                    cat.EndTurn = S.Turn + 2;
                    cat.IncomeFactor = 0;
                    cat.Text = $"a great flood has drowned the fields of {Map[cat.Province].Name}";
                    exact = $"A flood has drowned the fields of {Map[cat.Province].Name}; it will yield nothing for two seasons.";
                    plain = $"Travellers speak of floods in {p.Land()}.";
                    break;
                default:
                    cat.Province = rng.Pick(owned);
                    cat.EndTurn = S.Turn + 4;
                    cat.IncomeFactor = 0;
                    cat.Text = $"an earthquake has thrown down the walls and storehouses of {Map[cat.Province].Name}";
                    exact = $"An earthquake has ruined {Map[cat.Province].Name}; it will yield nothing for four seasons.";
                    plain = $"Word comes that the earth shook in {p.Land()}.";
                    break;
            }
            S.Catastrophes.Add(cat);
            S.Notify(p, InboxKind.Catastrophe, $"Catastrophe: {kind}", exact);
            S.Log("catastrophe", $"{kind} strikes {p}: {cat.Text}.", [p], "catastrophe");

            // Courts that can see the stricken land hear of it next season, as a plain fact; nobody else does.
            var stricken = cat.Province is { } one ? [one] : owned;
            foreach (var other in S.Alive.Where(o => o != p && stricken.Any(sight[o].Contains)))
                S.Notify(other, InboxKind.Notice, "News from nearby", plain);
        }

        // Long stays abroad breed attachment to the host court.
        foreach (var c in S.Characters.Where(c => c.At is { } at && c.Employer is { } e && at != e && c.TurnsAbroad >= 2 && c.TurnsAbroad % 2 == 0))
        {
            var host = c.At!.Value;
            if (c.Traits.Sympathy is null || c.Traits.Sympathy == host)
            {
                c.Traits.Sympathy = host;
                c.Traits.SympathyStrength = Math.Min(100, c.Traits.SympathyStrength + 8);
            }
            c.Traits.Loyalty = Math.Max(0, c.Traits.Loyalty - 3);
        }
    }
}
