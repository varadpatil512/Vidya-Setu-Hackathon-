import { createContext, useContext, useEffect, useState } from 'react';
import api, { getToken, setToken, authAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authAPI.getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await authAPI.register(payload);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const googleAuth = async (payload) => {
    const res = await authAPI.googleLogin(payload);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const quickLogin = async (role = 'STUDENT') => {
    let email = 'student@vidyasetu.dev';
    if (role === 'TEACHER') email = 'teacher@vidyasetu.dev';
    if (role === 'ADMIN') email = 'admin@vidyasetu.dev';
    return login(email, 'password123');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleAuth, quickLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
