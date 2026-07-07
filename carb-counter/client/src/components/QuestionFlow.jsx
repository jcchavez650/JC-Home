import { useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";

export default function QuestionFlow({ foodGuess, questions, onSubmit, busy }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => questions.map((q) => ({ question: q.question, answer: "" })));

  const total = questions.length;
  const current = questions[index];
  const isLast = index === total - 1;

  function setAnswer(value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = { question: current.question, answer: value };
      return next;
    });
  }

  function goNext() {
    if (isLast) {
      onSubmit(answers);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function goBack() {
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="card question-flow">
      <div className="progress-row">
        {index > 0 && (
          <button type="button" className="icon-button" onClick={goBack} aria-label="Previous question">
            <ArrowLeft size={20} weight="bold" aria-hidden />
          </button>
        )}
        <div className="progress-track" aria-hidden>
          <div className="progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <span className="progress-label">
          Question {index + 1} of {total}
        </span>
      </div>

      {foodGuess && <p className="food-guess-label">Analyzing: {foodGuess}</p>}

      <fieldset className="question-fieldset">
        <legend>{current.question}</legend>
        {current.type === "choice" && current.options?.length ? (
          <div className="choice-grid">
            {current.options.map((opt) => (
              <button
                type="button"
                key={opt}
                className={`choice-pill ${answers[index].answer === opt ? "choice-pill-active" : ""}`}
                onClick={() => setAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            className="text-answer"
            value={answers[index].answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer"
          />
        )}
      </fieldset>

      <div className="question-actions">
        <button type="button" className="btn btn-ghost" onClick={goNext} disabled={busy}>
          Skip
        </button>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={goNext}
          disabled={busy || !answers[index].answer}
        >
          {isLast ? "Get My Carb Count" : "Next"}
        </button>
      </div>
    </div>
  );
}
