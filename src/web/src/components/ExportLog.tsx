/**
 * The game's export, with its filters (Engine and models, "Logging and replay"): by default everything; each box left
 * unticked leaves its part out. What is sensitive is never recorded, so it is no box here.
 */
import { useState } from "react";
import { Everything, type ExportParts } from "@amarna/game";

const Boxes: [keyof ExportParts, string, string][] = [
  ["calls", "Model calls", "What each model was asked and answered, with its notes, plans and ledger (and a model king's own pages season by season), its tokens, cost and errors"],
  ["shadows", "Shadow scripts", "The script characters' choices beside the model characters'"],
  ["audits", "Audits", "Decisions a lower rung took, put also to the rung above"],
  ["humanWords", "Human players' words", "Unticked, in a game a human played, every text is blanked (models quote what they read), so the export can be shared and still replays"],
];

export function ExportLog({ onExport }: { onExport: (parts: ExportParts) => void }) {
  const [parts, setParts] = useState<ExportParts>(Everything);
  return (
    <details>
      <summary>Export log</summary>
      {Boxes.map(([key, name, title]) => (
        <label key={key} title={title}>
          <input type="checkbox" checked={parts[key]} onChange={(e) => setParts({ ...parts, [key]: e.target.checked })} /> {name}
        </label>
      ))}
      <button onClick={() => onExport(parts)}>Export</button>
    </details>
  );
}
