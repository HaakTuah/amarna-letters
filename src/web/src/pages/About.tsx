import { useEffect } from "react";

/** How the game works, for a reader new to it. */
export function About() {
  useEffect(() => {
    document.title = "How Amarna Letters works";
  }, []);
  return (
    <div className="page" style={{ maxWidth: "52rem" }}>
        <h1>How it works</h1>
        <p>Each turn is a season. Every seat (a person, a language model or a script) receives the same view and submits secret, simultaneous orders. The engine resolves them from a single seed, so a game can be replayed exactly from its log.</p>
    
        <h2>Physics, not politics</h2>
        <p>The engine enforces movement, combat, production and payment. There are no war declarations, truces or alliance flags. A power at peace is simply one nobody is attacking. Gold, land, troops and people are the only things that change hands.</p>
        <ul>
            <li><strong>Combat</strong> is Diplomacy-style: strength is one plus supports, ties bounce, no dice. Supports can be given to any power. Dislodged units are destroyed.</li>
            <li><strong>Walls</strong> stand on every Great King's capital (level 3), the great fortresses (2), the walled towns (1) and every city-state's city (from none to 3, as the sources give its walls; the lands of the chiefs have none), and can be strengthened for gold and upkeep. They add nothing to a battle: an army that gets within walls not its own takes the city at once only by storming them (a strength above the walls and the defenders together); otherwise it stands inside and must besiege the city, a season for each level of its walls (fewer with support), while the city's king pleads, bargains and sends relief. No city is bought: a city comes under another's power by conquest, or as his vassal by a sealed tablet.</li>
            <li><strong>Terrain</strong> helps a unit that stands its ground: on rough ground (Mira, Lukka, Isuwa, Amurru, Arbela, Kalavasos, Shechem, Jerusalem, the Kaska lands), or behind a mountain pass or a great river the attack must cross (the Cilician Gates, the Taurus and Anti-Taurus, the Amanus and the Syrian Gates, the Lebanon, the Euphrates, the Tigris), it holds with one more, and one more only however many apply. Empty land, walls and the pace of a siege get nothing from the ground. The desert, the Sinai and the Sutean steppe, costs an army supplies for each season it ends there while its king does not hold it; whoever holds it crosses freely.</li>
            <li><strong>The sea</strong>: ships keep to the coasts, and every coast has waters of its own. An army crosses the sea by convoy, a fleet in each sea zone of the way, and lands only where no enemy fleet holds the coast's waters, so an island is guarded by the fleet off its shore. A besieged coastal city is supplied by sea, and worn down more slowly, unless its besieger's fleet blockades it. A few open-sea crossings link Cyprus to the Levant and Anatolia, and the Aegean edge to Egypt; in winter, the second season of each year, they stay open but their storms may sink a fleet and the army it carries.</li>
            <li><strong>Travel and news</strong>: envoys and spies travel a road of provinces, and a journey takes as long as its links' lengths and ground make it; winter closes nothing but makes the open sea and the mountain passes dangerous: a traveller is slowed, and an army or a fleet that crosses may be lost. Once a season a traveller may be stopped on the road: by the troops of a king who closed his roads to its court, by his people if it sneaks through his land, by outlaws, or by storms and the desert. News of distant land travels too: a court sees who holds the land it sees as it is, and elsewhere as late as word or its own people bring it.</li>
            <li><strong>A kingdom falls with its capital</strong>: whoever takes it takes the whole kingdom, and conquered land yields its full worth only after three seasons. A fallen player watches the rest of the game in god view, unless the table turned that off.</li>
            <li><strong>Gold</strong> is counted in shekels (60 to the mina). Provinces pay income each season; troops and servants cost upkeep. Unpaid troops desert.</li>
        </ul>
    
        <h2>Everything passes through an envoy</h2>
        <p>Kings never speak directly. A letter's greeting is sealed on the tablet and arrives exactly as written; the body is spoken by the envoy, in their own words. At the foreign court the host may answer, bribe, offer a job, detain, or seal a tablet. The envoy reports home, to their own advantage. Envoys have hidden traits (loyalty, greed, competence, ambition, courage, sympathies) that decide how they soften, embellish, skim, or defect.</p>
        <p>Gold travels with envoys, arrives late, can be skimmed, and may be debased: you see its weight, not its purity, until you pay for an assay.</p>
    
        <h2>Truth is expensive</h2>
        <ul>
            <li><strong>Sealed tablets</strong> are evidence, not enforcement. Show a copy to a third court to prove a broken oath. Whether they believe it is up to them.</li>
            <li><strong>Forgeries</strong> can be made by a skilled servant. Any court can pay to have a tablet examined; examination never returns the whole truth.</li>
            <li><strong>Spies</strong> report what their competence lets them see, risk capture, and may be turned into double agents.</li>
            <li><strong>Background checks</strong> reveal a candidate's hidden facts with a probability that grows with what you spend. Deep secrets rarely surface.</li>
            <li><strong>Catastrophes</strong> are fully known only to the power they strike. Courts that can see the stricken land hear of it the next season; the others learn of it only through their envoys and spies.</li>
        </ul>
    
        <h2>Winning</h2>
        <p>The winner is whoever grew most relative to their own start (land weighted by its yield, plus gold), so a small island that doubles beats an empire that merely holds. Any season may be the last, from the first: early on it is very unlikely, and it grows likelier with every year, and nobody, not even the table, knows which season it will be; a table that moves the median is told only whether the age is likely to be short or long. A table can also play an open age, with no end, setting by hand the spending limit at which a game with Claude kings pauses. Under the shared-victory house rule (off by default, under Customize), two powers bound by a sworn alliance tablet share the victory if their combined growth beats every rival.</p>
    
        <h2>Script kings</h2>
        <p>A king without a person or a model is a script king, and a script king also stands in for a model king whenever a call fails. Each power has a temperament of its own (Hatti the conqueror, Egypt the giver of gilded gifts, Babylon the proud keeper of the old order, Mitanni the seeker of a patron, Assyria the upstart, Arzawa the opportunist, Alashiya the copper merchant), varied a little in every game: how warlike, cautious, honest, greedy, generous, proud, diplomatic, cunning, vengeful and mercantile it is. It sees only what its seat sees, remembers who wronged it and who kept faith, and before it sends its troops it plays the season out against what its rivals are likely to order, with the same adjudicator the game uses. The god view lists every king's temperament under Standings.</p>
    
        <h2>Spectator mode</h2>
        <p>In games without a human, the god view shows everything the engine knows: every treasury, every character's hidden traits, and the message trail: what each king wrote, what the envoy said abroad, and what it reported home. The timeline steps back through the seasons. Logs export as <code>.jsonl</code> files and replay exactly.</p>
    
        <h2>Reading the map</h2>
        <p>Each power has a colour, an emblem on every city it holds and every unit (Egypt's lotus, Hatti's sun, Babylon's star, Mitanni's winged disc, Assyria's spearhead, Arzawa's crescent, Alashiya's jug) and a border line of its own, so the map reads without colour too. Armies are chariots, fleets are ships, envoys clay tablets, spies eyes, gold an oxhide ingot. Step the timeline and the season's moves are drawn: an arrow for a move, a burst for an attack, a bar where a move bounced, thin dashes for a support, a ring where a province changed hands. Travellers are drawn on the likeliest road at a guessed place: the game knows only when they set out and when they arrive. In a power's view, what it cannot see now is veiled, more thickly the longer ago it last looked; units it saw there are kept as faint outlines with the season it saw them; rumours and spy reports are marked where they came from. Who holds each province is known to every court at once, so it is never veiled; how it changed hands is told only to the courts that lost or gained it, or saw troops march in. Mountains, deserts, passes, river crossings and rich land are drawn; rough ground, the passes and the river crossings help a unit that stands its ground, and the Sinai costs supplies (see Terrain above); rich land is drawn for its own sake. Tap anyone to follow their life.</p>
    
        <h2>Credits</h2>
        <p>The game was inspired by Irving Finkel's <em>Curator's Corner</em> episode 100, “Reading the Pharaoh's private mail with Irving Finkel”, The British Museum (<a href="https://www.youtube.com/watch?v=3MZq_ZQDhJA" rel="noopener" target="_blank">youtube.com/watch?v=3MZq_ZQDhJA</a>), and leans on William L. Moran's <em>The Amarna Letters</em> for the translations of the letters themselves.</p>
    </div>
  );
}
