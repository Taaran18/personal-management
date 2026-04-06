import axios from "axios";

// Using the same axios instance base pattern as other api files
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

export const authApi = {
  verifyPin: async (pin_code: string) => {
    const res = await api.post<{ valid: boolean }>("/auth/verify-pin", { pin_code });
    return res.data;
  },
};
