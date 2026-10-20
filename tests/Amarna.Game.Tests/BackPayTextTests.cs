using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>What a king reads of back pay: the rule, the debt to each of its people, and its treasury line.</summary>
public class BackPayTextTests
{
    [Fact]
    public void The_rulebook_says_that_people_away_are_paid_on_their_return_and_that_back_pay_counts_against_strength()
    {
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("- People away from your court (on a mission, watching as a spy, held or captive) are not paid while away: their wages build up as back pay, paid in gold when they are back at your court. If your treasury cannot pay it all, the rest stays owed and counts as missed pay. Anyone who never comes back is never paid, and if your kingdom falls, what it owed is lost. Back pay owed counts against your strength.", rules);
        Assert.Contains("Strength = 10 x (sum of the base yields of the provinces you hold, land you conquered counted as far as you have absorbed it) + the gold in your treasury - the back pay you owe your people.", rules);
        Assert.Contains("still appears on its mission until word comes, and its back pay builds up in your books as for anyone away.", rules);
        Assert.DoesNotContain("you keep paying its wage", rules);
        Assert.Contains("back pay you already owe them is still paid if they ever stand at your court again", rules);
        Assert.Contains("2. Income, upkeep and wages: your provinces pay their yield in gold; you pay upkeep for every army (30) and fleet (35), 30 more for each army that ended last season in desert land you did not hold (see TERRAIN), and the wages of your people at court; the wages of your people away are added to their back pay.", rules);
        Assert.Contains("Then everyone you see at your court whom you owe back pay is paid it, as far as your treasury allows.", rules);
    }

    [Fact]
    public void A_servant_away_shows_its_back_pay_and_the_treasury_line_the_total()
    {
        var s = GameFactory.NewGame(3);
        var c = s.Characters.First(x => x.Employer == Power.Mitanni);
        c.SecretMaster = null;
        (c.Duty, c.At, c.MissionTarget) = (Duty.EnvoyOutbound, null, Power.Hatti);
        c.BackPay[Power.Mitanni] = 45;
        var v = Views.For(s, Power.Mitanni);
        Assert.Contains("; owed: 45 shekels of back pay", Prompts.Person(v.Court.Single(x => x.Id == c.Id)));
        var situation = Prompts.Situation(v);
        Assert.Contains($"wages {v.Wages} a season (paid to your people at court; for those away they build up as back pay). Back pay owed to your people: 45, paid when they are back at your court. Strength {v.Strength} by your ledger (back pay owed counted against it)", situation);

        // Owed by another court, it is nothing to this one.
        c.BackPay.Remove(Power.Mitanni);
        c.BackPay[Power.Hatti] = 30;
        Assert.DoesNotContain("back pay", Prompts.Person(Views.For(s, Power.Mitanni).Court.Single(x => x.Id == c.Id)));
        Assert.Equal(0, Views.For(s, Power.Mitanni).BackPay);
    }
}
