'use client';
import { useEffect, useRef } from 'react';

export function useAudioAlerts() {
  const audioCtx = useRef(null);

  useEffect(() => {
    // initialize on Interaction to prevent autoplay policy blocks
    const initAudio = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, []);

  const playTone = (freq, type, duration, vol) => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  };

  const playAlert = (severity) => {
    if (severity === 'LOW' || severity === 'Low') {
      playTone(440, 'sine', 0.5, 0.5);
    } else if (severity === 'MEDIUM' || severity === 'Medium') {
      playTone(550, 'triangle', 0.8, 0.6);
      setTimeout(() => playTone(650, 'triangle', 0.8, 0.6), 200);
    } else if (severity === 'HIGH' || severity === 'High') {
      playTone(880, 'square', 1, 0.8);
      setTimeout(() => playTone(1100, 'square', 1, 0.8), 300);
    } else if (severity === 'CRITICAL' || severity === 'Critical') {
      // Continuous alarm simulation
      for(let i=0; i<5; i++) {
        setTimeout(() => playTone(1200, 'sawtooth', 0.3, 1), i * 400);
      }
    }
  };

  return playAlert;
}
