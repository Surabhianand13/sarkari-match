import { Figure } from "@/components/figure";
import type { FigureSpec } from "@/lib/figure";
import type { QuestionImage } from "@/lib/question-images";

// The figure a question is about, shown above the question: a drawn Venn or geometry figure, or an uploaded picture.
export function QuestionFigure({ figure, image }: { figure?: FigureSpec | null; image?: QuestionImage | null }) {
  if (figure) return <Figure figure={figure} />;
  if (image) {
    return (
      <figure className="my-3 rounded-2xl border border-border bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/question-images/${image.id}`} alt={image.alt} className="mx-auto block h-auto max-h-96 w-auto max-w-full" loading="lazy" />
      </figure>
    );
  }
  return null;
}
