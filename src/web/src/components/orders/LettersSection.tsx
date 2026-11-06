import { useState } from "react";
import { buyLetter, letter, type Power } from "@amarna/engine";
import { powerName, provinceName } from "../../ui/format.ts";
import type { OrdersContext } from "./use-orders.ts";

/**
 * #592: provinces' offers the court caught on the road and holds (send one on to its claimant or to the king of its
 * people's land, or ask either a price), and those another court offers it for a price. Shown only when there are some.
 */
export function LettersSection({ c }: { c: OrdersContext }) {
  const { v, add } = c;
  const [price, setPrice] = useState<Record<string, string>>({});
  if (v.lettersHeld.length === 0 && v.lettersOffered.length === 0) return null;
  const asked = (province: string): number => Math.max(1, Math.floor(Number(price[province] || 60)));
  return (
    <div className="section">
      <h3>Offers taken on the road</h3>
      {v.lettersHeld.map((h) => {
        const holder: Power | null = v.owner.getOrDefault(h.province, null);
        const to = [h.claimant, ...(holder !== null && holder !== h.claimant && holder !== c.me ? [holder] : [])];
        return (
          <div key={`held-${h.province}`} className="row" style={{ gap: ".3rem", flexWrap: "wrap" }}>
            <small>
              The people of {provinceName(h.province)} to {powerName(h.claimant)}: “{h.words}”
              {h.askedOf !== null ? ` You asked ${powerName(h.askedOf)} ${h.price} shekels for it.` : ""}
            </small>
            {to.map((p) => (
              <button key={`send-${p}`} className="small" onClick={() => add(letter(h.province, "Send", p))}>
                Send it to {powerName(p)}
              </button>
            ))}
            <input aria-label="Price in shekels" type="number" min={1} style={{ width: "5rem" }} value={price[h.province] ?? "60"} onChange={(e) => setPrice({ ...price, [h.province]: e.target.value })} />
            {to.map((p) => (
              <button key={`sell-${p}`} className="small" onClick={() => add(letter(h.province, "Sell", p, asked(h.province)))}>
                Ask {powerName(p)} the price
              </button>
            ))}
          </div>
        );
      })}
      {v.lettersOffered.map((h) => (
        <div key={`offered-${h.province}`} className="row" style={{ gap: ".3rem" }}>
          <small>
            {powerName(h.heldBy)} holds the offer of the people of {provinceName(h.province)} to {powerName(h.claimant)}, for {h.price} shekels.
          </small>
          <button className="small" onClick={() => add(buyLetter(h.province))}>
            Buy it
          </button>
        </div>
      ))}
    </div>
  );
}
