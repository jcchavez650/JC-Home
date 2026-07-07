import { useState } from "react";
import "./App.css";
import FoodInput from "./components/FoodInput.jsx";
import QuestionFlow from "./components/QuestionFlow.jsx";
import ResultCard from "./components/ResultCard.jsx";
import DailyLog from "./components/DailyLog.jsx";
import useCarbCounter from "./hooks/useCarbCounter.js";
import useDailyLog from "./hooks/useDailyLog.js";

export default function App() {
  const cc = useCarbCounter();
  const log = useDailyLog();
  const [logged, setLogged] = useState(false);

  function handleLog() {
    log.addEntry(cc.result);
    setLogged(true);
  }

  function handleReset() {
    setLogged(false);
    cc.reset();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Carb Counter</h1>
        <p>Snap a photo or enter a weight — AI does the rest.</p>
      </header>

      <main className="app-main">
        {cc.phase === cc.PHASES.INPUT && <FoodInput onSubmit={cc.submitInput} />}

        {(cc.phase === cc.PHASES.IDENTIFYING || cc.phase === cc.PHASES.ESTIMATING) && (
          <div className="card loading-card" role="status" aria-live="polite">
            <div className="spinner" aria-hidden />
            <p>{cc.phase === cc.PHASES.IDENTIFYING ? "Identifying your food..." : "Calculating carbs..."}</p>
          </div>
        )}

        {cc.phase === cc.PHASES.QUESTIONS && (
          <QuestionFlow
            foodGuess={cc.foodGuess}
            questions={cc.questions}
            onSubmit={cc.submitAnswers}
            busy={false}
          />
        )}

        {cc.phase === cc.PHASES.RESULT && cc.result && (
          <ResultCard result={cc.result} onLog={handleLog} onReset={handleReset} logged={logged} />
        )}

        {cc.phase === cc.PHASES.ERROR && (
          <div className="card error-card" role="alert">
            <p>{cc.error || "Something went wrong."}</p>
            <button type="button" className="btn btn-primary" onClick={cc.reset}>
              Try Again
            </button>
          </div>
        )}

        {cc.phase === cc.PHASES.INPUT && (
          <DailyLog entries={log.entries} totals={log.totals} onRemove={log.removeEntry} />
        )}
      </main>
    </div>
  );
}
