import { useEffect, type ReactNode } from "react";

/**
 * A card over the map (a province, the legend, a crossing): its title and close button stay pinned at its top however
 * far it is scrolled, and it also closes on Escape (item 11c+; a tap on the map outside it closes it too, in the page).
 */
export function MapCard({ className, label, head, onClose, children }: { className: string; label: string; head: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={`${className} mapcard map-ui`} role="dialog" aria-label={label}>
      <div className="mapcard-head">
        {head}
        <button className="small" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
