/** The adjudicator tests' board: units and orders set up by chaining; each file adds the run its rules need. */
import { AdjudicationResult, Dict, type Order, type Power, type Unit, convoy, first, move, newUnit, support } from "@amarna/engine";

export class Board {
  units: Unit[] = [];
  walls: Dict<string, number> = new Dict<string, number>();
  owners: Dict<string, Power | null> = new Dict<string, Power | null>();
  orders: Dict<string, Order> = new Dict<string, Order>();

  a(p: Power, at: string): this {
    this.units.push(newUnit({ id: "u" + this.units.length, power: p, kind: "Army", province: at }));
    return this;
  }
  f(p: Power, at: string): this {
    this.units.push(newUnit({ id: "u" + this.units.length, power: p, kind: "Fleet", province: at }));
    return this;
  }
  move(at: string, to: string): this {
    this.orders.set(at, move(at, to));
    return this;
  }
  support(at: string, supported: string, to: string | null = null): this {
    this.orders.set(at, support(at, supported, to));
    return this;
  }
  convoy(at: string, army: string, to: string): this {
    this.orders.set(at, convoy(at, army, to));
    return this;
  }

  where(r: AdjudicationResult, startProvince: string): string | null {
    let u = first(this.units, (x) => x.province === startProvince);
    return r.newPositions.tryGet(u.id) ?? null;
  }
}
