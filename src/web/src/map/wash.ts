/**
 * Zoom shapes the realms' colours (item 17+++, "zoom shapes what you see and hear"; the owner, 31 October 2026: "if I
 * zoom in on the map, I like how Imperator makes the state color more and more transparent and you see the ground and
 * effects under more clearly"). Zoomed out the realms' colours are full, so the board reads as realms at a glance; zoomed in
 * they thin to a wash, and then almost to nothing but their borders (the realm bands) and banners (the emblems on the city
 * seals), so the ground, the season and the figures show through. Only the realms' own colour thins: the views (the mood of
 * the land) keep theirs at every zoom, since colour is what they show.
 *
 * The factor multiplies the realm colour's opacity. It moves in steps, so the realms' layer is painted again only when a
 * zoom crosses one, never at every settle.
 */

/** Screen pixels a map unit takes where the colours are full, and where they have thinned to their least. */
const Full = 0.45;
const Least = 3;
/** The factor at each end: fuller than today's wash when the whole board is in view, nearly gone when zoomed right in. */
const FullFactor = 1.6;
const LeastFactor = 0.2;
/** Steps between the ends. */
const Steps = 8;

/** The realms' colour factor at a zoom (screen pixels per map unit), in {@link Steps} steps from full to least. */
export function washAt(scale: number): number {
  const t = Math.min(1, Math.max(0, Math.log(scale / Full) / Math.log(Least / Full)));
  const step = Math.round(t * Steps) / Steps;
  return Math.round(1000 * (FullFactor + (LeastFactor - FullFactor) * step)) / 1000;
}
