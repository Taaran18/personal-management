"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, LogIn, Loader2 } from "lucide-react";
import { authApi } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the hidden input on mount and when clicking anywhere
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = async (val: string) => {
    // Only allow numbers, max 6 digits
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    setError(false);

    if (cleaned.length === 6) {
      setLoading(true);
      try {
        const res = await authApi.verifyPin(cleaned);
        if (res.valid) {
          onUnlock();
        } else {
          setError(true);
          setPin(""); // Clear to retry
        }
      } catch (err) {
        setError(true);
        setPin("");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && error) {
      setError(false);
      setPin("");
    }
  };

  // Create an array of 6 elements for the visual dots
  const digits = Array.from({ length: 6 }, (_, i) => pin[i] || "");

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten" />
      </div>

      <div className="relative z-10 flex flex-col items-center animate-fade-in w-full max-w-sm px-6">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-pink-500/20">
          <Lock size={32} className="text-white" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">App Locked</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          Please enter your PIN code to access your personal management system.
        </p>

        {/* Hidden Input field */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 top-0 left-0 h-0 w-0 pointer-events-none"
          disabled={loading}
          autoComplete="off"
        />

        {/* Visual PIN circles */}
        <div className={cn(
          "flex items-center gap-3 mb-8 transition-all duration-300",
          error ? "animate-shake" : ""
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

        {/* Status Text */}
        <div className="h-6 flex items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Verifying...
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 font-medium">Incorrect PIN code. Try again.</p>
          ) : null}
        </div>

        {/* Manual submit button (optional fallback, but it auto-submits at 6 digits) */}
        {!loading && !error && pin.length > 0 && pin.length < 6 && (
           <p className="text-xs text-gray-400 mt-4">Keep typing ({6 - pin.length} more digits)</p>
        )}
      </div>
    </div>
  );
}
