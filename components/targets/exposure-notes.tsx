import { Notice } from "@/components/ui/notice";

type Props = { readonly notes: string[]; readonly warnings: string[] };

/** Shows, in plain words, how "total exposure" targets turn into what is actually bought. */
export function ExposureNotes({ notes, warnings }: Props) {
  if (notes.length === 0 && warnings.length === 0) return null;
  return (
    <div className="space-y-3 border-t border-line p-5">
      {notes.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">What this means for your trades</p>
          <ul className="mt-2 space-y-1 text-sm">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <Notice tone="warning">
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}
