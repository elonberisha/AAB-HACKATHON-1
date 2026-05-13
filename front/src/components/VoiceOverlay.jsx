'use client';

import React from 'react';

/**
 * VoiceOverlay — ChatGPT-style voice UI that fits INSIDE the chat widget.
 * Pure CSS animations — no canvas, no lag.
 * States: connecting | listening | speaking | idle
 */
export default function VoiceOverlay({ active, onClose, status, volumeLevel }) {
  if (!active) return null;

  const vol = Math.min(1, volumeLevel || 0);
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isConnecting = status === 'connecting';

  // Dynamic scale based on volume
  const orbScale = 1 + vol * 0.35;
  const ring1Scale = 1.3 + vol * 0.4;
  const ring2Scale = 1.6 + vol * 0.5;
  const ring3Scale = 1.9 + vol * 0.6;

  const orbColor = isSpeaking ? '#3b82f6' : isListening ? '#e2e8f0' : isConnecting ? '#f59e0b' : '#94a3b8';
  const orbGlow = isSpeaking ? 'rgba(59,130,246,0.4)' : isListening ? 'rgba(226,232,240,0.3)' : isConnecting ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.2)';

  const statusText = {
    connecting: 'Duke u lidhur...',
    listening: 'Duke degjuar...',
    speaking: 'Duke folur...',
    idle: 'Prit...',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'rgba(15, 23, 42, 0.95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'voiceFadeIn 250ms ease',
      borderRadius: 'inherit',
      overflow: 'hidden',
    }}>
      {/* Orb container */}
      <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Ring 3 (outermost) */}
        <div style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          border: `1.5px solid ${orbColor}`,
          opacity: 0.12 + vol * 0.08,
          transform: `scale(${ring3Scale})`,
          transition: 'transform 150ms ease, opacity 150ms ease',
          animation: (isListening || isSpeaking) ? 'voicePulse 2s ease infinite' : isConnecting ? 'voiceSpin 2s linear infinite' : 'none',
        }} />
        {/* Ring 2 */}
        <div style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          border: `1.5px solid ${orbColor}`,
          opacity: 0.18 + vol * 0.12,
          transform: `scale(${ring2Scale})`,
          transition: 'transform 150ms ease, opacity 150ms ease',
          animation: (isListening || isSpeaking) ? 'voicePulse 2s ease 0.3s infinite' : 'none',
        }} />
        {/* Ring 1 */}
        <div style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          border: `2px solid ${orbColor}`,
          opacity: 0.25 + vol * 0.15,
          transform: `scale(${ring1Scale})`,
          transition: 'transform 150ms ease, opacity 150ms ease',
          animation: (isListening || isSpeaking) ? 'voicePulse 2s ease 0.6s infinite' : 'none',
        }} />
        {/* Main orb */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${orbColor}, ${orbColor}dd, ${orbColor}99)`,
          boxShadow: `0 0 ${30 + vol * 40}px ${orbGlow}, 0 0 ${60 + vol * 60}px ${orbGlow}`,
          transform: `scale(${orbScale})`,
          transition: 'transform 100ms ease, box-shadow 100ms ease, background 300ms ease',
          animation: isConnecting ? 'voiceBreathe 1.5s ease infinite' : (isListening || isSpeaking) ? 'none' : 'voiceBreathe 3s ease infinite',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Inner shine */}
          <div style={{
            position: 'absolute', top: '15%', left: '20%',
            width: '35%', height: '35%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)',
          }} />
        </div>
      </div>

      {/* Waveform bars */}
      {(isListening || isSpeaking) && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 24, marginTop: 20 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 3, borderRadius: 2,
              background: isSpeaking ? '#60a5fa' : '#cbd5e1',
              height: Math.max(4, 20 * (0.3 + vol * 0.7)),
              animation: `voiceBar 0.8s ease ${i * 0.12}s infinite alternate`,
              transition: 'height 100ms ease',
            }} />
          ))}
        </div>
      )}

      {/* Status text */}
      <div style={{
        marginTop: (isListening || isSpeaking) ? 12 : 28,
        color: 'rgba(226, 232, 240, 0.7)',
        fontSize: 12,
        letterSpacing: '0.08em',
        fontFamily: 'inherit',
      }}>
        {statusText[status] || statusText.idle}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          marginTop: 24,
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.85)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 150ms, background 150ms',
          boxShadow: '0 2px 12px rgba(239, 68, 68, 0.3)',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>

      <style>{`
        @keyframes voiceFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes voicePulse {
          0%, 100% { opacity: 0.1; transform: scale(var(--s, 1)); }
          50% { opacity: 0.25; transform: scale(calc(var(--s, 1) * 1.08)); }
        }
        @keyframes voiceBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes voiceSpin {
          from { transform: rotate(0deg) scale(1.6); }
          to { transform: rotate(360deg) scale(1.6); }
        }
        @keyframes voiceBar {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
