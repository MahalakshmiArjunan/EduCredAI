import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("vidya_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("vidya_token");
    if (t && !user) {
      setLoading(true);
      api.get("/auth/me").then((r) => {
        setUser(r.data);
        localStorage.setItem("vidya_user", JSON.stringify(r.data));
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("vidya_token", r.data.token);
    localStorage.setItem("vidya_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const signup = async (payload) => {
    const r = await api.post("/auth/signup", payload);
    localStorage.setItem("vidya_token", r.data.token);
    localStorage.setItem("vidya_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("vidya_token");
    localStorage.removeItem("vidya_user");
    setUser(null);
    window.location.href = "/login";
  };

  return <AuthCtx.Provider value={{ user, login, signup, logout, loading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
