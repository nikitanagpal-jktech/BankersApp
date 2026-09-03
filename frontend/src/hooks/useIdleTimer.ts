import { useEffect, useRef } from 'react';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

export function useIdleTimer(onIdle: () => void, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout>| null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled) {
      timerRef.current = setTimeout(onIdle, IDLE_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [enabled]);
}