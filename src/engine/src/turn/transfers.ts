/** Land and men changing hands by agreement or levy: cessions, gifts of units, and the levies a king raises. */
import { idiv } from "../core/num.ts";
import { type CedeProvinceOrder, type GiftUnitOrder, type RaiseOrder } from "../model/orders.ts";
import { type Power, powerName } from "../model/power.ts";
import { logEvent, newId, notify, unitAt } from "../model/state.ts";
import { newUnit, unitLabel, keepGone } from "../model/units.ts";
import { upper } from "../rules/wording.ts";
import { forMen, LandData, levySize, menAvailable, menOf } from "../model/land.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    resolveTransfers(cessions: [Power, CedeProvinceOrder][], gifts: [Power, GiftUnitOrder][]): void;
    raise(p: Power, r: RaiseOrder): void;
  }
}

const P = TurnEngine.prototype;

P.resolveTransfers = function (cessions, gifts) {
  const S = this.s;
  const Map = this.map;
  // A capital is ceded last, after the gifts of troops, so that a king ceding his realm may give his troops first.
  const capitals: [Power, CedeProvinceOrder][] = [];
  for (const [p, c] of cessions) {
    if (c.province === this.courtAt(p)) {
      capitals.push([p, c]);
      continue;
    }
    const name = Map.get(c.province).name;
    // The validator refuses a second cession of one province, so land no longer held was lost in movement, or before it
    // out of the king's sight (bug #467): either way word of it comes home by the road.
    if (S.owner.getOrDefault(c.province, null) !== p) {
      this.lostOrder(p, c, c.province, "Cession failed", `${name} was not ceded to ${powerName(c.to)}: you no longer held it when the moves were done.`, "you no longer held it");
      continue;
    }
    const u = unitAt(S, c.province);
    if (u !== null && u.power === p) {
      this.failed(p, c, "Cession failed", `${name} was not ceded to ${powerName(c.to)}: your own troops still stood in it when the moves were done.`, "your own troops stood there", false);
      continue;
    }
    // Item 17++ ("taken up, never thrust on anyone"): a treaty gives the receiver the claim, never the province, unless his
    // troops already stand in it, which is his taking it up.
    if (!S.units.some((x) => x.power === c.to && x.kind === "Army" && x.province === c.province)) {
      this.cededClaim(p, c.to, c.province);
      continue;
    }
    this.setOwner(c.province, c.to);
    this._cededNow.set(c.province, c.to);
    this.tell(p, c.province, "Resolution", "Land ceded", `${Map.get(c.province).name} now belongs to ${powerName(c.to)}: his troops stand in it.`);
    notify(S, c.to, "Resolution", "Land received", `${upper(powerName(p))} has ceded ${Map.get(c.province).name} to you, and your troops there hold it.`);
    logEvent(S, "cession", `${p} ceded ${Map.get(c.province).name} to ${c.to}.`, this.nearOf(c.province, p, c.to));
    // A capital ceded is a capital taken: its archive lies in the city.
    this.takeArchive(c.to, c.province);
  }
  for (const [p, g] of gifts) {
    const u = unitAt(S, g.unit);
    // Bug #600: its king reads how a gift far off went when word of it comes, and knows the unit till then.
    if (u === null || u.power !== p) {
      this.tell(p, g.unit, "Rejected", "Gift of troops failed", `No unit of yours stood in ${Map.get(g.unit).name} when the moves were done, so none was given to ${powerName(g.to)}.`);
      continue;
    }
    keepGone(S, u);
    u.power = g.to;
    this.tell(p, u.province, "Resolution", "Troops given", `Your ${unitLabel(u)} now serves ${powerName(g.to)}.`);
    notify(S, g.to, "Resolution", "Troops received", `${upper(powerName(p))} has placed its ${unitLabel(u)} under your command.`);
    logEvent(S, "gift-unit", `${p} gave ${unitLabel(u)} to ${g.to}.`, [...this.nearOf(u.province, p), g.to]);
  }
  // A king who cedes his own capital this season can receive none: whichever were reckoned first would decide it.
  const ceding = new Set(capitals.map(([p]) => p));
  for (const [p, c] of capitals) {
    if (ceding.has(c.to)) this.failed(p, c, "Cession failed", `${Map.get(c.province).name} was not ceded to ${powerName(c.to)}: ${powerName(c.to)} ceded its own capital the same season.`, "the receiver ceded its own realm", true);
    else this.realmCeded(p, c);
  }
};

P.raise = function (p, r) {
  const S = this.s;
  const prov = this.map.get(r.province);
  const kind = r.kind.toLowerCase();
  // In the rulebook's words: only in a province of your homeland that you still hold and that is empty when the moves were done.
  // Land the king itself ceded this season was not lost in movement: the notice says which.
  const to = this._cededNow.tryGet(prov.id);
  const why =
    S.owner.getOrDefault(prov.id, null) === p
      ? unitAt(S, prov.id) !== null
        ? `troops still stood in ${prov.name} when the moves were done`
        : null
      : to !== undefined
        ? `you ceded ${prov.name} to ${powerName(to)} last season, before the levy`
        : `you no longer held ${prov.name} when the moves were done`;
  if (why !== null) {
    const text = `No ${kind} was raised in ${prov.name}: ${why}. No gold was paid.`;
    // Only land lost in movement is others' doing, and its word comes home by the road (bug #467): a province the seat
    // still holds that is not empty holds its own unit (any other troops there would have taken it), and a cession is its own.
    this.levyFailed(p, r, prov.id, text, S.owner.getOrDefault(prov.id, null) !== p && !this._cededNow.has(prov.id) ? why : null);
    return;
  }
  // Sized by the men the province has (item 11a+): a full levy where it can, else every man at home; its price, pay and
  // food are in proportion.
  // Item 17++: a share of the men at home, less what the province hides of it; an amount, the men asked.
  const men = levySize(S, prov.id, r.kind, r.share != null ? idiv(idiv(menAvailable(S, prov.id) * r.share, 100) * (100 - this.hiddenIn(prov.id)), 100) : (r.men ?? null));
  if (men <= 0) {
    // A share that came to fewer than a levy's least is told as that, never as a land without men.
    const short = r.share != null && menAvailable(S, prov.id) >= LandData.levyLeast;
    const why = short ? `the share you asked of its men came to fewer than a levy takes (${LandData.levyLeast} at least); ask a larger share or a number of men` : `it has too few men of fighting age left (${LandData.levyLeast} at least are needed)`;
    // Its notice and a sleeping seat's wake come by the road from a far province (bug #517).
    this.levyFailed(p, r, prov.id, `No ${kind} was raised in ${prov.name}: ${why}. No gold was paid.`, short ? "the share asked came to fewer men than a levy takes" : "too few men of fighting age");
    return;
  }
  const cost = forMen(r.kind === "Army" ? S.config.armyCost : S.config.fleetCost, r.kind, men);
  // The levy's gold pays the province's own men and smiths: it goes into its people's purse (item 9+a). #587: far off, from
  // the province's coffer, and what it lacks on a bill carried home, its people paid when the bill is.
  if (this.isFar(p, prov.id)) {
    const paid = this.payFar(p, prov.id, cost);
    if (paid === null) {
      this.levyFailed(p, r, prov.id, `No ${kind} was raised in ${prov.name}: ${this.noCredit(p, prov.id)}.`, "too little gold there");
      return;
    }
    this.spendAt(prov.id, paid.coffer);
  } else if (!this.pay(p, cost, `a new ${kind} in ${prov.name}`, r, "none was raised")) return;
  else this.spendAt(prov.id, cost);
  // Its men come from the province's men of fighting age (item 10+a).
  this.levyMen(prov.id, men);
  const u = newUnit({ id: newId(S, "u"), power: p, kind: r.kind, province: prov.id, home: prov.id, men, since: S.turn });
  S.units.push(u);
  this.tell(p, prov.id, "Resolution", "Levy raised", `A new ${kind} stands in ${prov.name}${men !== menOf(r.kind) ? `, ${men} men strong${men < (r.men ?? menOf(r.kind)) ? ", every man of fighting age the province could give" : ""}` : ""}.`
);
  if (r.share != null) logEvent(S, "levy", `${p} raised a ${kind} in ${prov.name} by a share of its men.`, this.nearOf(prov.id, p), "levy-share");
  this.levyRaised(p, u);
};
