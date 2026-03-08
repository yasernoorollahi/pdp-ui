import type { User } from "../models/User";
import type { AuthResponse } from "./AuthResponse";

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  tokens: AuthResponse | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};
