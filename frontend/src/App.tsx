import { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage';
import ChatPage from './components/ChatPage';

type Page = 'landing' | 'chat';

function getInitialPage(): Page {
  return window.location.pathname === '/chat' ? 'chat' : 'landing';
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);

  function goToChat() {
    window.history.pushState({}, '', '/chat');
    setPage('chat');
    window.scrollTo(0, 0);
  }

  function goToLanding() {
    window.history.pushState({}, '', '/');
    setPage('landing');
    window.scrollTo(0, 0);
  }

  // Handle browser back/forward
  useEffect(() => {
    const handler = () => setPage(getInitialPage());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (page === 'chat') return <ChatPage onBack={goToLanding} />;
  return <LandingPage onApply={goToChat} />;
}
