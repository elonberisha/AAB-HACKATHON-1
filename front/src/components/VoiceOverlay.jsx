'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * VoiceOverlay — ChatGPT-style voice interface
 * Full-screen overlay with animated orb that reacts to audio levels.
 * States: idle → connecting → listening → speaking → idle
 */
export default function VoiceOverlay({ active, onClose, status, volumeLevel }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const volumeRef = useRef(0);

  // Smooth volume transitions
  useEffect(() => {
    volumeRef.current = volumeLevel || 0;
  }, [volumeLevel]);

  // Canvas animation loop
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let time = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const vol = volumeRef.current;
      const baseRadius = Math.min(w, h) * 0.18;
      time += 0.02;

      // Determine color based on status
      const isListening = status === 'listening';
      const isSpeaking = status === 'speaking';
      const isConnecting = status === 'connecting';

      // Outer glow rings
      const rings = isSpeaking ? 4 : isListening ? 3 : 2;
      for (let r = rings; r >= 1; r--) {
        const scale = 1 + r * 0.3 + vol * r * 0.15;
        const radius = baseRadius * scale;
        const alpha = (0.08 - r * 0.015) * (1 + vol * 0.5);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);

        if (isSpeaking) {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        } else if (isListening) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        }
        ctx.fill();
      }

      // Main orb — morphing blob shape
      const points = 128;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const noiseScale = isConnecting ? 0.3 : (isListening || isSpeaking) ? 0.6 : 0.15;
        const noise =
          Math.sin(angle * 3 + time * 2) * 0.08 * (1 + vol * noiseScale) +
          Math.sin(angle * 5 - time * 1.5) * 0.05 * (1 + vol * noiseScale * 0.8) +
          Math.sin(angle * 7 + time * 3) * 0.03 * (1 + vol * noiseScale * 0.5) +
          Math.sin(angle * 2 - time) * 0.06 * vol;

        const radius = baseRadius * (1 + noise + vol * 0.2);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Gradient fill
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.5);
      if (isSpeaking) {
        grad.addColorStop(0, 'rgba(96, 165, 250, 0.95)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.85)');
        grad.addColorStop(1, 'rgba(37, 99, 235, 0.7)');
      } else if (isListening) {
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.5, 'rgba(226, 232, 240, 0.85)');
        grad.addColorStop(1, 'rgba(148, 163, 184, 0.7)');
      } else if (isConnecting) {
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.8)');
        grad.addColorStop(1, 'rgba(217, 119, 6, 0.6)');
      } else {
        grad.addColorStop(0, 'rgba(148, 163, 184, 0.6)');
        grad.addColorStop(0.5, 'rgba(100, 116, 139, 0.5)');
        grad.addColorStop(1, 'rgba(71, 85, 105, 0.4)');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner highlight
      const innerGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.2, cy - baseRadius * 0.2, 0,
        cx, cy, baseRadius * 0.8
      );
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Waveform bars (only when active)
      if (isListening || isSpeaking) {
        const barCount = 5;
        const barWidth = 3;
        const barGap = 6;
        const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
        const startX = cx - totalWidth / 2;
        const maxBarHeight = 24;

        for (let i = 0; i < barCount; i++) {
          const barVol = Math.max(0.15, vol);
          const h = maxBarHeight * barVol *
            (0.5 + 0.5 * Math.sin(time * 4 + i * 1.2));
          const x = startX + i * (barWidth + barGap);
          const y = cy + baseRadius + 30;

          ctx.beginPath();
          ctx.roundRect(x, y - h / 2, barWidth, h, 1.5);
          ctx.fillStyle = isSpeaking
            ? 'rgba(96, 165, 250, 0.8)'
            : 'rgba(255, 255, 255, 0.6)';
          ctx.fill();
        }
      }

      // Connecting spinner
      if (isConnecting) {
        const spinAngle = time * 3;
        const spinRadius = baseRadius + 20;
        for (let i = 0; i < 3; i++) {
          const a = spinAngle + (i * Math.PI * 2) / 3;
          const dotX = cx + Math.cos(a) * spinRadius;
          const dotY = cy + Math.sin(a) * spinRadius;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 191, 36, ${0.8 - i * 0.2})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, status]);

  if (!active) return null;

  const statusText = {
    connecting: 'Duke u lidhur...',
    listening: 'Duke degjuar...',
    speaking: 'Duke folur...',
    idle: 'Prit...',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15, 23, 42, 0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'voiceFadeIn 300ms ease',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: '60%',
          maxWidth: 500, maxHeight: 400,
        }}
      />

      <div style={{
        marginTop: -20,
        textAlign: 'center',
        color: 'rgba(226, 232, 240, 0.8)',
        fontSize: 14,
        fontFamily: 'inherit',
        letterSpacing: '0.05em',
      }}>
        {statusText[status] || statusText.idle}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          bottom: 48,
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.9)',
          border: 'none',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 150ms, background 150ms',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)',
        }}
        onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>

      <style>{`
        @keyframes voiceFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
