import { createContext, useContext, useState } from "react";
import SessionTimeout from "../../components/SessionTimeout";
import * as otpAuth from "../../lib/useOtpAuth";

/**
 * Shared OTP-login auth provider factory for the four role portals
 * (admin / teacher / student / parent).
 *
 * Each portal differs only in:
 *  - the localStorage key prefix,
 *  - the expected role, and
 *  - the error message shown when the wrong role signs in.
 *
 * The parent portal additionally tracks the active child; pass `extra` as
 * `{ hook, keys }` — `hook` is called during render (may use hooks) and must
 * return `{ value, onLogout }` to extend the context value and clean up on
 * logout; `keys` adds extra localStorage keys (e.g. the parent's active-child
 * key) that are cleared on logout too.
 *
 * The returned `AuthProvider` / `useAuth` are per-portal (each portal keeps
 * its own React context, so role state can never leak across portals).
 */
export function createRoleAuthContext({ role, keysPrefix, errorDetail, extra = null }) {
  const KEYS = {
    access: `${keysPrefix}_access`,
    refresh: `${keysPrefix}_refresh`,
    user: `${keysPrefix}_user`,
    ...(extra?.keys || {}),
  };
  const extraHook = extra?.hook || null;

  function isTokenValid(token) {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  function loadStoredUser() {
    const access = localStorage.getItem(KEYS.access);
    const refresh = localStorage.getItem(KEYS.refresh);
    const raw = localStorage.getItem(KEYS.user);
    if (!raw) return null;
    // Accept session only if the access token OR the refresh token is still valid
    if (isTokenValid(access) || isTokenValid(refresh)) {
      try { return JSON.parse(raw); } catch { /* fall through */ }
    }
    // Stale — wipe everything so the login page shows
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    return null;
  }

  function clearKeys() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  }

  const AuthContext = createContext(null);

  function AuthProvider({ children }) {
    const [user, setUser] = useState(loadStoredUser);
    const extras = extraHook
      ? extraHook({ user, keys: KEYS, clearKeys })
      : { value: {}, onLogout: () => {} };

    async function requestOtp(identifier, password) {
      const data = await otpAuth.requestOtp(identifier, password);
      if (data.user_type !== role) {
        throw { response: { data: { detail: errorDetail } } };
      }
      return data;
    }

    async function verifyOtp(userId, otp) {
      const data = await otpAuth.verifyOtp(userId, otp);
      if (data.user?.user_type !== role) {
        throw { response: { data: { detail: errorDetail } } };
      }
      localStorage.setItem(KEYS.access, data.access);
      localStorage.setItem(KEYS.refresh, data.refresh);
      localStorage.setItem(KEYS.user, JSON.stringify(data.user));
      setUser(data.user);
      return data;
    }

    async function resendOtp(userId) {
      return otpAuth.resendOtp(userId);
    }

    function logout() {
      clearKeys();
      setUser(null);
      extras.onLogout();
    }

    return (
      <AuthContext.Provider value={{ user, requestOtp, verifyOtp, resendOtp, logout, ...extras.value }}>
        {user && <SessionTimeout logout={logout} />}
        {children}
      </AuthContext.Provider>
    );
  }

  const useAuth = () => useContext(AuthContext);
  return { AuthProvider, useAuth };
}
