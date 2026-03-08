import { api } from "../../../api/axios";
import type { AuthResponse } from "../types/AuthResponse";

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });

  return res.data;
};
