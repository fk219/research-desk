import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { register, login, demoLogin, logout, getMe } from "../service/auth.api";
import { setUser, setLoading, setError } from "../auth.slice";

const SESSION_ENDED_KEY = "research-desk:session-ended:v1";

const hasEndedSession = () => {
  try {
    return window.localStorage.getItem(SESSION_ENDED_KEY) === "1";
  } catch {
    return false;
  }
};

const setSessionEnded = (ended) => {
  try {
    if (ended) {
      window.localStorage.setItem(SESSION_ENDED_KEY, "1");
    } else {
      window.localStorage.removeItem(SESSION_ENDED_KEY);
    }
  } catch {
    // Storage may be unavailable; the in-memory logout still applies.
  }
};

export const useAuth = () => {
  const dispatch = useDispatch();

  const handleRegister = useCallback(
    async ({ username, email, password }) => {
      try {
        dispatch(setLoading(true));
        await register({ username, email, password });
        return { ok: true };
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Registration failed. Try again.";
        dispatch(setError(message));
        return { ok: false, message };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch],
  );

  const handleLogin = useCallback(
    async ({ email, password }) => {
      try {
        dispatch(setLoading(true));
        const data = await login({ email, password });
        setSessionEnded(false);
        dispatch(setUser(data.user));
        return { ok: true, user: data.user };
      } catch (error) {
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed. Try again.";
        dispatch(setError(message));
        return { ok: false, message };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch],
  );

  const handleDemo = useCallback(
    async () => {
      try {
        dispatch(setLoading(true));
        const data = await demoLogin();
        setSessionEnded(false);
        dispatch(setUser(data.user));
        return { ok: true, user: data.user };
      } catch (error) {
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "The demo desk could not be opened. Try again.";
        dispatch(setError(message));
        return { ok: false, message };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch],
  );

  const handleGetMe = useCallback(async () => {
    if (hasEndedSession()) {
      dispatch(setUser(null));
      dispatch(setError(null));
      dispatch(setLoading(false));
      return;
    }

    try {
      dispatch(setLoading(true));
      const data = await getMe();
      dispatch(setUser(data?.user || null));
    } catch (error) {
      dispatch(setUser(null));
      dispatch(
        setError(
          error.response?.data?.message || "Failed fetching user data.",
        ),
      );
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const handleLocalSignOut = useCallback(() => {
    setSessionEnded(true);
    dispatch(setUser(null));
    dispatch(setError(null));
    dispatch(setLoading(false));
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    // Revoke the server-side session first, then clear the local desk. The
    // local state is cleared even if the request fails or the cookie is gone.
    try {
      await logout();
    } catch {
      // Nothing else to do: the UI must not stay in a signed-in state.
    }

    handleLocalSignOut();
    return { ok: true };
  }, [handleLocalSignOut]);

  return {
    handleRegister,
    handleLogin,
    handleDemo,
    handleGetMe,
    handleLogout,
    handleLocalSignOut,
  };
};
