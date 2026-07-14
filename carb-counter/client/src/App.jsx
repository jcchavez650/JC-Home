import { useState } from "react";
import "./App.css";
import { ForkKnife, ChartBar, SignOut } from "@phosphor-icons/react";
import FoodInput from "./components/FoodInput.jsx";
import QuestionFlow from "./components/QuestionFlow.jsx";
import ResultCard from "./components/ResultCard.jsx";
import DailyLog from "./components/DailyLog.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import Report from "./components/Report.jsx";
import useCarbCounter from "./hooks/useCarbCounter.js";
import useDailyLog from "./hooks/useDailyLog.js";
import useAuth from "./hooks/useAuth.js";

export default function App() {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Carb Counter</h1>
        {auth.user ? (
          <button type="button" className="signout-btn" onClick={auth.logout}>
            <SignOut size={16} weight="bold" aria-hidden />
            Sign out
          </button>
        ) : (
          <p>Snap a photo or enter a weight — AI does the rest.</p>
        )}
      </header>

      {auth.loading ? (
        <div className="card loading-card" role="status">
          <div className="spinner" aria-hidden />
        </div>
      ) : auth.user ? (
        <SignedInApp />
      ) : (
        <AuthScreen onLogin={auth.login} onSignup={auth.signup} />
      )}
    </div>
  );
}

function SignedInApp() {
  const [tab, setTab] = useState("track");
  const cc = useCarbCounter();
  const log = useDailyLog(true);
  const [logged, setLogged] = useState(false);
  const [logError, setLogError] = useState(null);

  async function handleLog() {
    setLogError(null);
    try {
      await log.addEntry(cc.result);
      setLogged(true);
    } catch (err) {
      setLogError(err.message);
    }
  }

  function handleReset() {
    setLogged(false);
    setLogError(null);
    cc.reset();
  }

  const onTrackTab = tab === "track";

  return (
    <>
      <main className="app-main">
        {onTrackTab ? (
          <>
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
              <>
                <ResultCard result={cc.result} onLog={handleLog} onReset={handleReset} logged={logged} />
                {logError && (
                  <p className="form-error" role="alert">
                    {logError}
                  </p>
                )}
              </>
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
          </>
        ) : (
          <Report />
        )}
      </main>

      <nav className="tab-bar" aria-label="Main navigation">
        <button
          type="button"
          className={`tab-bar-item ${onTrackTab ? "tab-bar-item-active" : ""}`}
          aria-current={onTrackTab ? "page" : undefined}
          onClick={() => setTab("track")}
        >
          <ForkKnife size={22} weight={onTrackTab ? "fill" : "regular"} aria-hidden />
          Track
        </button>
        <button
          type="button"
          className={`tab-bar-item ${!onTrackTab ? "tab-bar-item-active" : ""}`}
          aria-current={!onTrackTab ? "page" : undefined}
          onClick={() => setTab("report")}
        >
          <ChartBar size={22} weight={!onTrackTab ? "fill" : "regular"} aria-hidden />
          Report
        </button>
      </nav>
    </>
  );
}
