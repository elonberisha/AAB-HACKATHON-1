'use client';

import { useEffect } from 'react';

/**
 * Public OAuth callback page.
 * Opened in a popup by ChatWidget's Google login.
 * After Supabase processes the session from the URL hash,
 * this page simply closes the popup — the main window's
 * onAuthStateChange handles the rest.
 */
export default function AuthCallbackPage() {
  useEffect(() => {
    // Give Supabase client ~600ms to process the hash/session
    const timer = setTimeout(() => {
      if (window.opener) {
        window.close();
      } else {
        // Not in a popup — redirect home
        window.location.replace('/');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0E1B2C', color: '#F2EFE8',
      fontFamily: 'Geist, system-ui, sans-serif', gap: 12,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a84b" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span style={{ fontSize: 14, opacity: 0.7 }}>Duke u kyçur...</span>
    </div>
  );
}
