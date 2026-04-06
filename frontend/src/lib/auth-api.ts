import axios from "axios";

// Using the same axios instance base pattern as other api files
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

export interface AuthResponse {
  valid: boolean;
  locked?: boolean;
  lockout_until?: string | null;
}

export const authApi = {
  getStatus: async () => {
    const res = await api.get<{ locked: boolean; lockout_until: string | null }>("/auth/status");
    return res.data;
  },
  verifyPin: async (pin_code: string) => {
    const res = await api.post<AuthResponse>("/auth/verify-pin", { pin_code });
    return res.data;
  },
};
