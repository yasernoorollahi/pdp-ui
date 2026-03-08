import { useState } from "react";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "./AuthContext";
import { login as loginApi } from "../api/auth.api";
import type { AuthResponse } from "../types/AuthResponse";
import type { User } from "../models/User";

interface DecodedToken {
  sub: string;
  roles: string[];
  exp: number;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthResponse | null>(null);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);

    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);

    // decode JWT
    const decoded = jwtDecode<DecodedToken>(res.accessToken);

    const newUser: User = {
      id: 1, // فعلاً چون از backend نمیاد
      email: decoded.sub,
      roles: decoded.roles,
    };

    setUser(newUser);
    setTokens(res);
  };
 
  const logout = () => {
    localStorage.clear();
    setUser(null);
    setTokens(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        tokens,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
