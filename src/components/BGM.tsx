import { useEffect, useRef } from 'react';

export const BGM = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const startBGM = () => {
      if (isPlayingRef.current) return;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      isPlayingRef.current = true;

      const playNote = (freq: number, time: number, duration: number) => {
        if (!isPlayingRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + duration * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };

      const scale = [261.63, 293.66, 329.63, 392.00, 440.00]; // C Major Pentatonic
      let nextNoteTime = ctx.currentTime + 0.5;

      const scheduleNotes = () => {
        if (!isPlayingRef.current) return;
        
        while (nextNoteTime < ctx.currentTime + 2.0) {
          const noteFreq = scale[Math.floor(Math.random() * scale.length)];
          const duration = 1 + Math.random() * 2;
          playNote(noteFreq, nextNoteTime, duration);
          
          // Add some harmony sometimes
          if (Math.random() > 0.5) {
            const harmonyFreq = scale[Math.floor(Math.random() * scale.length)] * 0.5;
            playNote(harmonyFreq, nextNoteTime, duration * 1.5);
          }
          
          nextNoteTime += 0.5 + Math.random() * 1.5;
        }
        
        setTimeout(scheduleNotes, 1000);
      };

      scheduleNotes();
    };

    const handleInteraction = () => {
      startBGM();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      isPlayingRef.current = false;
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return null;
};
