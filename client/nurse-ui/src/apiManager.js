import { useAuthService } from "./authService";
import axios from "axios";
import { useCallback } from "react";

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api";

export function useApiManager() {
  const { getToken } = useAuthService();

  const apiCall = useCallback(async (endpoint, options = {}) => {
    ('API Call:', endpoint, options);

    const token = await getToken();
    const headers = {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : "",
    };

    const response = await axios({
      url: `${API_BASE_URL}/${endpoint}`,
      method: options.method || "GET",
      data: options.data || null,
      headers,
    });

    return response.data;
  }, [getToken]); // dependency on getToken

  return { apiCall };
}

