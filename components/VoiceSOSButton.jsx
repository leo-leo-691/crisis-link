'use client';
import { useEffect, useState, useRef } from 'react';

export default function VoiceSOSButton({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [supported,   setSupported]   = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSupported(true);
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (e) => {
        let final = '';
        let interim = '';
        for (const result of e.results) {
          if (result.isFinal) final += result[0].transcript;
          else interim += result[0].transcript;
        }
        setTranscript(final || interim);
        if (final) onTranscript?.(final);
      };

      recognition.onend = () => { setIsListening(false); };
      recognition.onerror = (e) => {
        console.error('[VoiceSOS] error:', e.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center text-2xl
          transition-all duration-300 shadow-lg
          ${isListening
            ? 'bg-emergency shadow-glow-red scale-110'
            : 'bg-white/10 hover:bg-white/20 border border-white/20'
          }
        `}
        aria-label={isListening ? 'Stop recording' : 'Speak your emergency'}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full border-2 border-emergency pulse-ring" />
        )}
        🎙️
      </button>
      <span className="text-xs text-muted">
        {isListening ? '🔴 Listening…' : 'Tap to speak'}
      </span>
      {transcript && (
        <p className="text-xs text-white/70 text-center mt-1 italic max-w-[220px]">"{transcript}"</p>
      )}
    </div>
  );
}
