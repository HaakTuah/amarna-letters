namespace Amarna.Engine;

/// <summary>
/// Inventory tablets: gold an envoy carries comes with an inventory sealed by the court that sent it, which the receiving
/// court keeps in its archive. An envoy that kept some of the gold may swap the inventory for one it forges, stating only
/// what is left, under the forgery rules: it needs the forger's skill, and is found out only when the tablet is examined.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>Whether a character has the hand to fake a seal (the forger's skill, as for a forgery ordered by a king).</summary>
    public bool CanForge(Character c) => c.Traits.Competence >= S.Config.ForgeMinCompetence;

    /// <summary>Whether an envoy that chose to swap the inventory really does: it kept some of the gold, and it has the skill.</summary>
    private bool Swaps(Character c, int kept, bool swap) => swap && kept > 0 && CanForge(c);

    /// <summary>What the inventory a host is shown states: what was sent, or, if the envoy swapped it, what its forgery states.</summary>
    public int InventoryStated(PendingAudience a, int skim, bool swap) =>
        Swaps(S.Char(a.EnvoyId), Math.Clamp(skim, 0, a.Dispatch.Gold), swap) ? Weighed(a, skim) : a.Dispatch.Gold;

    /// <summary>
    /// The inventory of the gold an envoy brings, put in the receiving court's archive: sealed by the court that sent the
    /// gold, dated when it was sealed, or the envoy's forgery stating less.
    /// </summary>
    private TabletCopy Inventory(Character envoy, Power sealer, Power receiver, int stated, int sealedTurn, bool forged, string source)
    {
        var tablet = new Tablet
        {
            Id = S.NewId("t"),
            Text = $"The inventory of the gold {sealer} sends to {receiver}: {Money.Format(stated)}.",
            ProposedBy = sealer,
            Seals = [sealer],
            CreatedTurn = sealedTurn,
            SealedTurn = sealedTurn,
            Inventory = true,
            Forged = forged,
            ForgerId = forged ? envoy.Id : null,
            ForgerEmployer = forged ? envoy.Employer : null,
            ForgerSkill = forged ? envoy.Traits.Competence : 0,
        };
        S.Tablets.Add(tablet);
        var copy = new TabletCopy { Id = S.NewId("k"), TabletId = tablet.Id, Holder = receiver, AcquiredTurn = S.Turn, Source = source };
        S.Copies.Add(copy);
        return copy;
    }

    /// <summary>
    /// What an envoy that kept some of the gold and chose to swap the inventory remembers: the swap, with the secret it
    /// leaves (a deep one, as for a forgery), or that it lacked the hand and handed over the true inventory.
    /// </summary>
    /// <returns>The outcome for the record of the mission, or null if it did not swap.</returns>
    private string? SwapInventory(Character c, Power sealer, Power receiver, int kept, int stated, bool swap)
    {
        if (!swap || kept <= 0) return null;
        if (!CanForge(c))
        {
            c.Remember(S.Turn, $"I meant to put a forged inventory in place of the one {sealer.Land()} sealed, but my hand could not fake the seal; I handed over the true one.");
            return null;
        }
        c.Remember(S.Turn, $"I put an inventory I forged myself, stating {Money.Format(stated)}, in place of the one {sealer.Land()} sealed, so that nobody would miss the gold I kept.");
        c.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Forged the inventory of the gold {sealer.Land()} sent to {receiver.Land()}, to hide what was kept.", Secrecy = Secrecy.Deep, Tag = "inventory-forgery" });
        S.Log("inventory-swapped", $"{c.Name} swapped the inventory of the gold {sealer} sent to {receiver} for a forgery stating {Money.Format(stated)}.", [], "inventory-swapped");
        return $"replaced the inventory with a forgery stating {stated} shekels";
    }

    /// <summary>
    /// A forged inventory found out and traced, as a forgery is: to the hand of the envoy who brought it. Every court hears
    /// it, and the envoy is known for it.
    /// </summary>
    private string InventoryExposed(Power examiner, Tablet tablet, Character forger)
    {
        var bearer = $"{forger.Name}{(tablet.ForgerEmployer is { } lord ? $", envoy of {lord}," : "")}";
        foreach (var p in Powers.All) forger.Reputation[p] = forger.Reputation.GetValueOrDefault(p) - 30;
        forger.Facts.Add(new Fact { Id = S.NewId("f"), Text = $"Exposed as the forger of an inventory of gold bearing the seal of {string.Join(" and ", tablet.Seals.Select(x => x.Land()))}.", Secrecy = Secrecy.Public, Tag = "forger" });
        foreach (var p in S.Alive.Where(p => p != examiner))
            Rumor(p, examiner, $"The scribes of {examiner} declare that the inventory of gold bearing the seal of {string.Join(" and ", tablet.Seals)}, brought by {bearer} was forged by {forger.Name}.");
        S.Log("forgery-exposed", $"{examiner} publicly traced a forged inventory to {forger.Name}.", signal: "forgery-exposed");
        return $" The scribes trace it to the hand of {forger.Name}, who brought it.";
    }
}
