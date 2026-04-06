"use client";

import { useEffect, useState } from "react";
import LockScreen from "./LockScreen";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check session storage on mount
    const isUnlocked = sessionStorage.getItem("app_unlocked") === "true";
    setUnlocked(isUnlocked);
    setMounted(true);
  }, []);

  const handleUnlock = () => {
    sessionStorage.setItem("app_unlocked", "true");
    setUnlocked(true);
  };

  // Prevent hydration mismatch by not rendering anything until we know the auth state
  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        {/* Simple blank screen or subtle loader during initial load */}
      </div>
    );
  }

  if (!unlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return <>{children}</>;
}
