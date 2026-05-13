'use client';

import { useEffect } from 'react';
import { supabasePublic } from '@/lib/supabase';

export default function AuthCallbackPage() {
  useEffect(() => {
    // Listen for SIGNED_IN — fires automatically when Supabase
    // detects the access_token in the URL hash on this page load
    const { data: { subscription } } = supabasePublic.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        subscription.unsubscribe();
        if (window.opener) {
          window.close();
        } else {
          window.location.replace('/');
        }
      }
    });

    // Fallback: if event never fires, close after 4s anyway
    const fallback = setTimeout(() => {
      subscription.unsubscribe();
      if (window.opener) window.close();
      else window.location.replace('/');
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0E1B2C', color: '#F2EFE8',
      fontFamily: 'Geist, system-ui, sans-serif', gap: 14,
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4a84b" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span style={{ fontSize: 13, opacity: 0.6 }}>Duke u kyçur...</span>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
