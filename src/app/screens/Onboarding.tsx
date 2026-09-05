import { useEffect, useState } from "react";
import { Button, FocusWord } from "@ui/components";
import { copy } from "@ui/copy";
import { VERSION } from "../version";

const DEMO = "Reading is the one thing nobody can do for you".split(" ");

const Demo = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % DEMO.length), 380);
    return () => window.clearInterval(id);
  }, []);
  return <FocusWord text={DEMO[index]!} size="preview" />;
};

export const Onboarding = ({ onDone }: { onDone: () => void }) => {
  const [page, setPage] = useState(0);
  const card = copy.onboarding[page]!;
  const last = page === copy.onboarding.length - 1;

  return (
    <main className="onboarding" id="main">
      <div className="onboarding-stage">
        {page === 2 && (
          <div className="onboarding-demo">
            <Demo />
          </div>
        )}
        <article className="onboarding-card" key={page}>
          <h2>{card.title}</h2>
          <hr />
          {card.body.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      </div>

      <div className="onboarding-foot">
        <ol className="dots" aria-hidden="true">
          {copy.onboarding.map((item, i) => (
            <li key={item.title} className={i === page ? "on" : ""} />
          ))}
        </ol>

        <div className="onboarding-actions">
          <Button variant="primary" onClick={() => (last ? onDone() : setPage((p) => p + 1))}>
            {last ? copy.start : copy.next}
          </Button>
          <div className="onboarding-meta">
            <button type="button" className="btn btn-quiet" onClick={onDone}>
              {copy.skip}
            </button>
            <span className="mono">{VERSION}</span>
          </div>
        </div>
      </div>
    </main>
  );
};
