import { Notice } from "@/components/ui/notice";

/** Explains, in plain words, how "total exposure" targets became the trades below (e.g. why Apple isn't bought up to 20%). */
export function PlanNotes({ notes }: { readonly notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <Notice>
      <p className="font-medium">Your targets count what your ETFs already hold</p>
      <ul className="mt-1 space-y-1">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </Notice>
  );
}
