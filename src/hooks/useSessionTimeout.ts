import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export const useSessionTimeout = () => {
  const navigate = useNavigate();

  const handleTimeout = useCallback(async () => {
    toast.warning("Session expired due to inactivity. Please log in again.");
    await apiClient.auth.signOut();
    navigate("/auth");
  }, [navigate]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleTimeout, TIMEOUT_MS);
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [handleTimeout]);
};
