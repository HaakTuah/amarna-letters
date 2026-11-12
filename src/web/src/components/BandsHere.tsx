import type { MapScene, SceneBand } from "../map/scene.ts";

/** How old the word of a band is, said as the map's marks say it ("as your people last told of it, 2 seasons ago"). */
const toldAgo = (age: number): string => `as your people last told of it, ${age} season${age === 1 ? "" : "s"} ago`;

/** One band as the province card tells it: its men, its chief if his name is known, and how old the word is. */
export const bandLine = (b: SceneBand): string =>
  `${b.ship ? "A pirate crew" : "A band"} of ${b.men.toLocaleString("en")} men${b.chief !== "" ? `, led by ${b.chief},` : ""} works here${b.age > 0 ? `: ${toldAgo(b.age)}` : ""}.`;

/**
 * The bands and pirate crews the seat knows of in a province, the freshest word first (#631): what the map tells only in a
 * campfire's hover title, which a phone has not. The scene holds only the bands a seat knows of, so this tells no more.
 */
export function BandsHere({ scene, id }: { scene: MapScene; id: string }) {
  const here = scene.bands.filter((b) => b.province === id).sort((a, b) => a.age - b.age);
  return (
    <>
      {here.map((b, i) => (
        <p className="small" key={i}>
          {bandLine(b)}
        </p>
      ))}
    </>
  );
}
