namespace Amarna.Engine;

/// <summary>Seeded catastrophes, fully visible only to the power they strike; rumors for everyone else.</summary>
public sealed partial class TurnEngine
{
    private void WorldEvents()
    {
        foreach (var p in S.Alive.ToList())
        {
            var rng = R("catastrophe", p.ToString());
            if (!rng.Chance(S.Config.CatastropheChance)) continue;
            var owned = S.OwnedBy(p).ToList();
            if (owned.Count == 0) continue;
            var kind = rng.Pick(Enum.GetValues<CatastropheKind>());
            var cat = new Catastrophe { Id = S.NewId("x"), Power = p, Kind = kind, StartTurn = S.Turn + 1 };
            string exact, vague, exaggerated, slight;
            switch (kind)
            {
                case CatastropheKind.Drought:
                    cat.EndTurn = S.Turn + 3;
                    cat.IncomeFactor = 0.5;
                    cat.Text = "the rains failed and the harvest withers across the land";
                    exact = "The rains have failed. For three seasons the whole realm will yield only half its income.";
                    vague = $"Travellers say the harvest has failed in {p.Land()}.";
                    exaggerated = $"It is said that {p.Land()} starves, and its granaries stand empty.";
                    slight = $"Merchants mention a poor harvest in {p.Land()}, though little more.";
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
                    vague = $"Word comes of sickness in {p.Land()}.";
                    exaggerated = $"They say plague has emptied the barracks of {p.Land()} and half the army is dead.";
                    slight = $"Some say a fever passed through {p.Land()}.";
                    break;
                case CatastropheKind.Flood:
                    cat.Province = rng.Pick(owned);
                    cat.EndTurn = S.Turn + 2;
                    cat.IncomeFactor = 0;
                    cat.Text = $"a great flood has drowned the fields of {Map[cat.Province].Name}";
                    exact = $"A flood has drowned the fields of {Map[cat.Province].Name}; it will yield nothing for two seasons.";
                    vague = $"Travellers speak of floods in {p.Land()}.";
                    exaggerated = $"It is said the waters swallowed whole towns in {p.Land()}.";
                    slight = $"There was high water somewhere in {p.Land()}.";
                    break;
                default:
                    cat.Province = rng.Pick(owned);
                    cat.EndTurn = S.Turn + 4;
                    cat.IncomeFactor = 0;
                    cat.Text = $"an earthquake has thrown down the walls and storehouses of {Map[cat.Province].Name}";
                    exact = $"An earthquake has ruined {Map[cat.Province].Name}; it will yield nothing for four seasons.";
                    vague = $"Word comes that the earth shook in {p.Land()}.";
                    exaggerated = $"They say a city of {p.Land()} has fallen into the earth.";
                    slight = $"A tremor was felt in {p.Land()}, it is said.";
                    break;
            }
            S.Catastrophes.Add(cat);
            S.Notify(p, InboxKind.Catastrophe, $"Catastrophe: {kind}", exact);
            S.Log("catastrophe", $"{kind} strikes {p}: {cat.Text}.", [p], "catastrophe");

            foreach (var other in S.Alive.Where(o => o != p))
            {
                var roll = Rng.For(S.Seed, S.Turn, "rumor", $"{cat.Id}:{other}").NextDouble();
                var text = roll < 0.5 ? vague : roll < 0.75 ? exaggerated : slight;
                Rumor(other, p, text);
            }
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
