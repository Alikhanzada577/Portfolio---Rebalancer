"use client";

import { SaveStatus } from "@/components/targets/save-status";
import { RiskSettings } from "@/components/targets/risk-settings";
import { SymbolSearch } from "@/components/targets/symbol-search";
import { TargetsTable } from "@/components/targets/targets-table";
import { ExposureNotes } from "@/components/targets/exposure-notes";
import { TargetModeField } from "@/components/targets/target-mode-field";
import { useTargetsEditor, type Settings } from "@/components/targets/use-targets-editor";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { TargetRow } from "@/lib/target-rows";

type Props = {
  readonly accountId: string;
  /** Saved targets first, then any holdings without one (blank = not managed). */
  readonly initialRows: TargetRow[];
  /** Current weight of each holding and of cash, in percent of (cash + holdings). */
  readonly currentWeights: Record<string, number>;
  /** Total exposure per symbol (direct + via ETFs), percent of the account. */
  readonly exposureWeights: Record<string, number>;
  readonly etfWeights: Record<string, Record<string, number>>;
  readonly etfSymbols: string[];
  readonly settings: Settings;
};

/** Composes the targets editor from its parts. All state lives in useTargetsEditor. */
export function TargetsEditor({ accountId, initialRows, currentWeights, exposureWeights, etfWeights, etfSymbols, settings }: Props) {
  const editor = useTargetsEditor({ accountId, initialRows, currentWeights, exposureWeights, etfWeights, etfSymbols, settings });

  return (
    <div className="space-y-6">
      <Panel title="What a target means" description="Pick how percentages are measured. This changes what the table below shows and what gets bought.">
        <TargetModeField value={editor.mode} onChange={editor.setMode} />
      </Panel>

      <Panel title="Targets" description="Whatever you don't allocate stays in cash. Leave a row blank to keep it out of the rebalance; enter 0 only to sell the position." flush>
        <TargetsTable
          rows={editor.rows}
          summary={editor.summary}
          currentWeights={editor.weights}
          targetLabel={editor.mode === "exposure" ? "Target % (total)" : "Target %"}
          onChange={editor.setPct}
          onRemove={editor.remove}
        />
        <ExposureNotes notes={editor.notes} warnings={editor.warnings} />
        <div className="flex flex-wrap items-center gap-3 border-t border-line p-5">
          <SymbolSearch accountId={accountId} existing={editor.existingSymbols} onPick={editor.addSymbol} />
          <Button variant="secondary" onClick={editor.useCurrentWeights}>
            Use current weights as targets
          </Button>
        </div>
      </Panel>

      <Panel title="Rules" description="How far a holding can drift, and how much cash to keep back.">
        <RiskSettings band={editor.band} buffer={editor.buffer} onBand={editor.setBand} onBuffer={editor.setBuffer} />
      </Panel>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={editor.submit} disabled={!editor.canSubmit}>
          {editor.save.kind === "saving" ? "Saving…" : "Save targets"}
        </Button>
        <SaveStatus state={editor.save} summary={editor.summary} accountId={accountId} />
      </div>
    </div>
  );
}
