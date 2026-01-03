import { useRef, useCallback, useEffect } from 'react';

export function useNotificationSound(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize AudioContext on first user interaction
  const initAudio = useCallback(() => {
    if (isInitializedRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      isInitializedRef.current = true;
    } catch (e) {
      console.warn('AudioContext not supported:', e);
    }
  }, []);

  // Play notification sound using Web Audio API
  const playNotification = useCallback(async () => {
    if (!enabled) return;
    
    // Initialize on first play attempt (user gesture)
    if (!audioContextRef.current) {
      initAudio();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      // Create a pleasant notification tone
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant notification frequency pattern
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.1); // C6
      oscillator.frequency.setValueAtTime(1319, ctx.currentTime + 0.2); // E6

      // Gentle volume envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.25);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Failed to play notification sound:', e);
    }
  }, [enabled, initAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playNotification, initAudio };
}
