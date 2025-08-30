// src/services/authService.js
import { useAuth } from "@clerk/clerk-react";

export function useAuthService() {
  const { getToken, signOut } = useAuth();

  const fetchToken = async () => {
    try {
      const token = await getToken(); // Get session token from Clerk
      return token;
    } catch (err) {
      console.error("Error getting token:", err);
      return null;
    }
  };

  const logout = async () => {
    try {
      await signOut(); // Clerk sign out
      window.location.href = "/sign-in"; // Redirect after logout
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return { getToken: fetchToken, logout };
}
