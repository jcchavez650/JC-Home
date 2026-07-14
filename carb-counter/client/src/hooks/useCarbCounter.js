import { useCallback, useState } from "react";
import { identifyFood, estimateCarbs } from "../api.js";

const PHASES = {
  INPUT: "input",
  IDENTIFYING: "identifying",
  QUESTIONS: "questions",
  ESTIMATING: "estimating",
  RESULT: "result",
  ERROR: "error",
};

export default function useCarbCounter() {
  const [phase, setPhase] = useState(PHASES.INPUT);
  const [error, setError] = useState(null);
  const [inputData, setInputData] = useState(null);
  const [foodGuess, setFoodGuess] = useState("");
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setPhase(PHASES.INPUT);
    setError(null);
    setInputData(null);
    setFoodGuess("");
    setQuestions([]);
    setResult(null);
  }, []);

  const submitInput = useCallback(async (data) => {
    setInputData(data);
    setPhase(PHASES.IDENTIFYING);
    setError(null);
    try {
      const res = await identifyFood(data);
      setFoodGuess(res.food_guess || "");
      const qs = (res.questions || []).slice(0, 5);
      setQuestions(qs);
      setPhase(qs.length ? PHASES.QUESTIONS : PHASES.ESTIMATING);
      if (!qs.length) {
        const est = await estimateCarbs({ ...data, foodGuess: res.food_guess, answers: [] });
        setResult(est);
        setPhase(PHASES.RESULT);
      }
    } catch (err) {
      setError(err.message);
      setPhase(PHASES.ERROR);
    }
  }, []);

  const submitAnswers = useCallback(
    async (answers) => {
      setPhase(PHASES.ESTIMATING);
      setError(null);
      try {
        const est = await estimateCarbs({ ...inputData, foodGuess, answers });
        setResult(est);
        setPhase(PHASES.RESULT);
      } catch (err) {
        setError(err.message);
        setPhase(PHASES.ERROR);
      }
    },
    [inputData, foodGuess]
  );

  return {
    phase,
    PHASES,
    error,
    foodGuess,
    questions,
    result,
    submitInput,
    submitAnswers,
    reset,
  };
}
