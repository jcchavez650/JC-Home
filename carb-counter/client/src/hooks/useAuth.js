import { useCallback, useEffect, useState } from "react";
import { getToken, setToken, meApi, loginApi, signupApi } from "../api.js";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await meApi();
        if (!cancelled) setUser(user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await loginApi(email, password);
    setToken(token);
    setUser(user);
  }, []);

  const signup = useCallback(async (email, password) => {
    const { token, user } = await signupApi(email, password);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return { user, loading, login, signup, logout };
}
