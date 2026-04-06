import { useEffect, useState } from 'react';
import Hero from './Hero';
import FeatureSection from './FeatureSection';
import BeforeAfter from './BeforeAfter';
import ProductCards from './ProductCards';
import FinalCTA from './FinalCTA';
import TechStack from './TechStack';
import LoanBotLogo from './LoanBotLogo';
import { useNavigate } from 'react-router-dom';

interface Props {
  onApply: () => void;
}

export default function LandingPage({ onApply }: Props) {
  const navigate = useNavigate();
  const [navVisible, setNavVisible] = useState(false);
  const loggedInUser = (() => {
    try { return JSON.parse(localStorage.getItem('loanbot_user') || '{}'); } catch { return {}; }
  })();
  const isLoggedIn = !!loggedInUser?.loggedIn;

  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY >= window.innerHeight);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="min-h-screen text-[var(--color-primary)] font-sans antialiased"
      style={{ background: '#0B1120' }}
    >
      {/* ── Navbar (hidden until scrolled past hero) ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4"
        style={{
          background: 'rgba(11,17,32,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          opacity: navVisible ? 1 : 0,
          transform: navVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: navVisible ? 'all' : 'none',
          transition: 'transform 0.4s ease, opacity 0.4s ease',
        }}
      >
        <LoanBotLogo iconSize={38} wordmarkSize={24} />

        <div className="hidden md:flex gap-8 text-sm font-medium" style={{ color: '#8892a4' }}>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#why-loanbot" className="hover:text-white transition-colors">Why LoanBot</a>
          <a href="#tech-stack" className="hover:text-white transition-colors">Tech Stack</a>
        </div>

        <div className="flex gap-4 items-center">
          {isLoggedIn ? (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold"
                style={{
                  width: '28px', height: '28px',
                  background: 'linear-gradient(135deg, #6d5ce7, #b8ff4f)',
                  color: '#fff',
                }}
              >
                {loggedInUser.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm font-medium hidden md:block" style={{ color: '#fff' }}>
                {loggedInUser.name?.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={onApply}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:scale-105 transition-transform"
              style={{
                background: '#ffffff',
                color: '#0B1120',
                boxShadow: '0 0 16px rgba(255,255,255,0.35)',
              }}
            >
              Apply for Loan
            </button>
          )}
        </div>
      </nav>

      <main>
        <Hero onApply={onApply} />
        <FeatureSection />
        <BeforeAfter />
        <ProductCards />
        <FinalCTA onApply={onApply} />
        <TechStack />
      </main>

      <footer
        className="py-12 border-t text-center text-sm"
        style={{
          background: '#020617',
          borderColor: 'rgba(255,255,255,0.05)',
          color: '#8892a4',
        }}
      >
        <p>© 2026 LoanBot AI — Powered by LangGraph + Groq. Built for Matrix 3.0 Hackathon.</p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="#" className="hover:text-white transition-colors">RBI Compliance</a>
          <a href="#" className="hover:text-white transition-colors">API Docs</a>
          <a href="#" className="hover:text-white transition-colors">KYC Policy</a>
        </div>
      </footer>
    </div>
  );
}
