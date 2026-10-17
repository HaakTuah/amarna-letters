namespace Amarna.Engine;

/// <summary>
/// Seeds the small pool of envoys and spies: data first (traits, discrete facts with secrecy
/// levels), personality second (a template persona the narrator may replace once, at creation).
/// </summary>
public static class CharacterFactory
{
    private sealed record Seed(string Name, string Origin, bool Attested);

    // Names attested in the Amarna letters (envoys and officials), then regional name styles.
    private static readonly Seed[] Attested =
    [
        new("Mane", "Thebes", true),
        new("Keliya", "Washukanni", true),
        new("Pirissi", "Washukanni", true),
        new("Tulubri", "Taidu", true),
        new("Haamashshi", "Memphis", true),
        new("Artessupa", "Washukanni", true),
        new("Mazipalali", "Harran", true),
        new("Yanhamu", "Byblos", true),
    ];

    private static readonly Seed[] Styled =
    [
        new("Paser", "Memphis", false),
        new("Nakhtmin", "Thebes", false),
        new("Ili-iddina", "Babylon", false),
        new("Kidin-Adad", "Nippur", false),
        new("Ubaru", "Sippar", false),
        new("Tattamaru", "Hattusa", false),
        new("Pihhuniya", "Kanesh", false),
        new("Ehli-Teshub", "Carchemish", false),
        new("Tehip-tilla", "Arrapha", false),
        new("Ashur-nadin", "Ashur", false),
        new("Sin-iqisham", "Nineveh", false),
        new("Abdi-Milki", "Tyre", false),
        new("Ammistamru", "Ugarit", false),
        new("Kushmeshu", "Enkomi", false),
        new("Piyamaradu", "Apasa", false),
        new("Zitanza", "Lukka", false),
    ];

    private static readonly string[] Callings =
    [
        "merchant", "temple scribe", "charioteer", "interpreter", "physician", "caravan master",
        "palace steward", "priest of Shamash", "soldier", "copper trader",
    ];

    private static readonly string[] Lapses = ["theft", "drunkenness", "insolence to a prince", "losing a royal gift"];
    private static readonly string[] Lovers = ["Ugarit", "Byblos", "Babylon", "Memphis", "Hattusa"];

    public static void Populate(GameState s)
    {
        var rng = Rng.For(s.Seed, 0, "characters");
        var attested = rng.Shuffle(Attested);
        var styled = rng.Shuffle(Styled);
        var pool = attested.Take(Math.Min(7, s.Config.CharacterPoolSize / 2))
            .Concat(styled).Take(s.Config.CharacterPoolSize).ToList();
        pool = rng.Shuffle(pool);

        var employers = new Queue<Power>(Powers.All.SelectMany(p => Enumerable.Repeat(p, s.Config.StartEnvoysPerPower)));
        // Two of the starting envoys are plants, secretly in the pay of another power.
        var plantSlots = rng.Shuffle(Enumerable.Range(0, employers.Count)).Take(2).ToHashSet();
        var slot = 0;

        foreach (var seed in pool)
        {
            var c = Create(s, rng, seed);
            if (employers.Count > 0)
            {
                var p = employers.Dequeue();
                c.Status = CharacterStatus.Employed;
                c.Employer = p;
                c.At = p;
                c.Contract = new Contract { Wage = 6 + c.Traits.Competence / 10, StartTurn = 1, UntilTurn = 1 + 9 };
                c.Reputation[p] = 10;
                if (plantSlots.Contains(slot))
                {
                    var master = rng.Pick(Powers.All.Where(x => x != p).ToList());
                    c.SecretMaster = master;
                    c.Traits.Sympathy = master;
                    c.Traits.SympathyStrength = Math.Max(c.Traits.SympathyStrength, 60);
                    c.Facts.RemoveAll(f => f.Tag == "sympathy");
                    c.Facts.Add(new Fact { Id = s.NewId("f"), Text = $"Is secretly in the pay of {master.Land()}.", Secrecy = Secrecy.Deep, Tag = "plant", KnownBy = [master] });
                }
                slot++;
            }
            else
            {
                c.Status = CharacterStatus.Free;
                c.At = rng.Pick(Powers.All);
            }
            c.Persona = Personas.Template(c);
            s.Characters.Add(c);
        }
    }

    private static Character Create(GameState s, Rng rng, Seed seed)
    {
        var c = new Character
        {
            Id = s.NewId("c"),
            Name = seed.Name,
            Origin = seed.Origin,
            Calling = rng.Pick(Callings),
            Traits = new Traits
            {
                Loyalty = rng.Range(15, 95),
                Greed = rng.Range(5, 95),
                Competence = rng.Range(20, 95),
                Ambition = rng.Range(5, 95),
                Courage = rng.Range(10, 95),
            },
        };
        if (rng.Chance(0.35))
        {
            c.Traits.Sympathy = rng.Pick(Powers.All);
            c.Traits.SympathyStrength = rng.Range(30, 80);
        }

        void Add(string text, Secrecy secrecy, string tag) =>
            c.Facts.Add(new Fact { Id = s.NewId("f"), Text = text, Secrecy = secrecy, Tag = tag });

        Add($"Born in {c.Origin}.", Secrecy.Public, "origin");
        Add($"Served as a {c.Calling}.", Secrecy.Public, "calling");
        if (seed.Attested) Add("Known by name at more than one royal court.", Secrecy.Public, "renown");

        var hidden = new List<(string, string)>();
        if (c.Traits.Greed > 55) hidden.Add(($"Owes {rng.Range(2, 9) * 30} shekels to a {rng.Pick(Powers.All).Adjective()} trader.", "debt"));
        if (c.Traits.Loyalty < 45) hidden.Add(($"Was dismissed from a former post for {rng.Pick(Lapses)}.", "dismissed"));
        if (c.Traits.Courage < 35) hidden.Add(("Once fled from a battle and hid it.", "coward"));
        hidden.Add(($"Has a brother serving in the army of {rng.Pick(Powers.All).Land()}.", "brother"));
        hidden.Add(($"Keeps a lover in {rng.Pick(Lovers)}.", "lover"));
        foreach (var (text, tag) in rng.Shuffle(hidden).Take(2)) Add(text, Secrecy.Hidden, tag);

        if (c.Traits.Sympathy is { } sym) Add($"Secretly sympathizes with {sym.Land()}.", Secrecy.Deep, "sympathy");
        else if (c.Traits.Ambition > 70) Add("Dreams of ruling a city of their own one day.", Secrecy.Deep, "ambition");

        return c;
    }
}

public static class Personas
{
    /// <summary>A persona prompt from traits and facts, used until (or instead of) the narrator's version.</summary>
    public static string Template(Character c)
    {
        var t = c.Traits;
        var parts = new List<string>
        {
            t.Loyalty >= 65 ? "steadfast to whoever treats you fairly" : t.Loyalty <= 35 ? "loyal mostly to yourself" : "loyal while it is worth your while",
            t.Greed >= 65 ? "fond of gold and quick to see a profit" : t.Greed <= 30 ? "indifferent to riches" : "glad of a gift",
            t.Competence >= 65 ? "shrewd and observant" : t.Competence <= 35 ? "careless with details" : "capable enough",
            t.Ambition >= 65 ? "eager to be noticed by kings" : t.Ambition <= 30 ? "content with a quiet life" : "hopeful of advancement",
            t.Courage >= 65 ? "bold, unafraid to carry hard words" : t.Courage <= 35 ? "timid before powerful men and eager to please them" : "careful with powerful men",
        };
        var want = t.Ambition >= 65 ? "rank and the favour of a great king"
            : t.Greed >= 65 ? "gold, enough to never serve again"
            : t.Loyalty >= 65 ? "to serve well and be trusted"
            : "to come home safely with something to show for it";
        var secrets = c.Facts.Where(f => f.Secrecy != Secrecy.Public).Select(f => f.Text).ToList();
        var text = $"You are {c.Name}, born in {c.Origin}, once a {c.Calling}. You are {string.Join("; ", parts)}. What you want most: {want}.";
        if (secrets.Count > 0) text += $" Things about yourself you do not volunteer: {string.Join(" ", secrets)}";
        text += " You speak in the formal manner of a royal messenger of the Late Bronze Age.";
        return text;
    }
}
