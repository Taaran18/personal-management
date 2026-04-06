"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true); // Start loading to check status
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Check initial lock status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await authApi.getStatus();
        if (status.locked && status.lockout_until) {
          startCountdown(status.lockout_until);
        }
      } catch (e) {
        console.error("Failed to fetch lock status", e);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  // Countdown timer logic
  const startCountdown = (lockoutUntilIso: string) => {
    setLockedOut(true);
    setPin("");
    setError(true);
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(lockoutUntilIso).getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setLockedOut(false);
        setError(false);
        setErrorMessage("");
        setLockoutTimeLeft(null);
        return false; // stop timer
      }
      
      // format to MM:SS
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setLockoutTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      return true; // continue timer
    };

    if (updateTimer()) {
      const interval = setInterval(() => {
        if (!updateTimer()) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  };

  const handleChange = async (val: string) => {
    if (lockedOut) return;
    
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    setError(false);
    setErrorMessage("");

    if (cleaned.length === 6) {
      setLoading(true);
      try {
        const res = await authApi.verifyPin(cleaned);
        if (res.valid) {
          onUnlock();
        } else {
          setError(true);
          if (res.locked && res.lockout_until) {
            startCountdown(res.lockout_until);
          } else {
            setErrorMessage("Incorrect PIN code. Try again.");
            setPin("");
          }
        }
      } catch (err) {
        setError(true);
        setErrorMessage("Network error. Could not verify.");
        setPin("");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && error && !lockedOut) {
      setError(false);
      setErrorMessage("");
      setPin("");
    }
  };

  const digits = Array.from({ length: 6 }, (_, i) => pin[i] || "");

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
      onClick={() => { if (!lockedOut) inputRef.current?.focus(); }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten" />
      </div>

      <div className="relative z-10 flex flex-col items-center animate-fade-in w-full max-w-sm px-6">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl transition-colors duration-500",
          lockedOut ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/20" : "bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/20"
        )}>
          {lockedOut ? <AlertCircle size={32} className="text-white" /> : <Lock size={32} className="text-white" />}
        </div>
        
        <h1 className="text-2xl font-bold mb-2">App Locked</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center h-10">
          {lockedOut 
            ? "Too many failed attempts. System is temporarily locked for security."
            : "Please enter your PIN code to access your personal management system."
          }
        </p>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 top-0 left-0 h-0 w-0 pointer-events-none"
          disabled={loading || lockedOut}
          autoFocus
          autoComplete="off"
        />

        <div className={cn(
          "flex items-center gap-3 mb-8 transition-all duration-300",
          error ? "animate-shake" : "",
          lockedOut ? "opacity-50" : "opacity-100"
        )}>
          {digits.map((digit, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-300",
                digit 
                  ? "bg-pink-500 scale-100 dark:bg-pink-500" 
                  : "bg-gray-200 dark:bg-gray-800 scale-75",
                error && "bg-red-500 dark:bg-red-500"
              )}
            />
          ))}
        </div>

        <div className="h-6 flex items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Verifying...
            </div>
          ) : lockedOut ? (
            <p className="text-sm text-red-500 font-medium bg-red-500/10 px-3 py-1 rounded-full flex items-center gap-2">
              <AlertCircle size={14} /> Try again in {lockoutTimeLeft}
            </p>
          ) : error && errorMessage ? (
            <p className="text-sm text-red-500 font-medium">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
