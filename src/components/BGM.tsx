import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const BGM = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const rainGainRef = useRef<GainNode | null>(null);
  const isRaining = useStore(state => state.isRaining);

  useEffect(() => {
    if (rainGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      rainGainRef.current.gain.linearRampToValueAtTime(isRaining ? 0.2 : 0, now + 2);
    }
  }, [isRaining]);

  useEffect(() => {
    const startBGM = () => {
      if (isPlayingRef.current) return;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      isPlayingRef.current = true;

      // Rain/Wind noise
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1000;
      
      const rainGain = ctx.createGain();
      rainGain.gain.value = isRaining ? 0.2 : 0;
      rainGainRef.current = rainGain;
      
      noiseSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(ctx.destination);
      noiseSource.start();

      const playNote = (freq: number, time: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) => {
        if (!isPlayingRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        // Add a lowpass filter for a warmer sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + duration * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };

      // Expanded scales for richer BGM
      const scales = {
        day: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C Major Pentatonic
        night: [220.00, 246.94, 261.63, 329.63, 349.23, 440.00], // A Minor
        rain: [293.66, 329.63, 349.23, 440.00, 493.88, 587.33] // D Minor
      };
      
      const chords = {
        day: [
          [261.63, 329.63, 392.00], // C
          [349.23, 440.00, 523.25], // F
          [392.00, 493.88, 587.33], // G
        ],
        night: [
          [220.00, 261.63, 329.63], // Am
          [293.66, 349.23, 440.00], // Dm
          [329.63, 392.00, 493.88], // Em
        ],
        rain: [
          [293.66, 349.23, 440.00], // Dm
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63], // Am
        ]
      };
      
      let nextNoteTime = ctx.currentTime + 0.5;
      let nextChordTime = ctx.currentTime + 1.0;

      const scheduleNotes = () => {
        if (!isPlayingRef.current) return;
        
        const state = useStore.getState();
        const isDay = state.time % 24000 < 12000;
        const currentMood = state.isRaining ? 'rain' : (isDay ? 'day' : 'night');
        const currentScale = scales[currentMood];
        const currentChords = chords[currentMood];
        
        // Melody
        while (nextNoteTime < ctx.currentTime + 2.0) {
          if (Math.random() > 0.3) { // 30% chance of silence for more ambient feel
            const noteFreq = currentScale[Math.floor(Math.random() * currentScale.length)];
            const duration = 1 + Math.random() * 3;
            playNote(noteFreq, nextNoteTime, duration, 'sine', 0.1);
          }
          nextNoteTime += 0.5 + Math.random() * 2.0;
        }
        
        // Chords (Pad)
        while (nextChordTime < ctx.currentTime + 4.0) {
          const chord = currentChords[Math.floor(Math.random() * currentChords.length)];
          const duration = 6 + Math.random() * 4;
          
          chord.forEach(freq => {
            playNote(freq * 0.5, nextChordTime, duration, 'triangle', 0.05);
          });
          
          nextChordTime += 6.0;
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
