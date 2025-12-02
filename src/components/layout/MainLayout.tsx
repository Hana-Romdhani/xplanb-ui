import { ReactNode, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PomodoroTimer from '../widgets/PomodoroTimer';

interface MainLayoutProps {
  children?: ReactNode;
  onLogout: () => void;
}

export default function MainLayout({ children, onLogout }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPomodoro, setShowPomodoro] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('pomodoro_timer_visible');
    return saved === 'true';
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('pomodoro_timer_visible', showPomodoro.toString());

    // Listen for storage events to sync across tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pomodoro_timer_visible') {
        setShowPomodoro(e.newValue === 'true');
      }
    };

    // Listen for custom event to show timer
    const handleShowTimer = () => {
      setShowPomodoro(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('showPomodoroTimer', handleShowTimer);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('showPomodoroTimer', handleShowTimer);
    };
  }, [showPomodoro]);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onShowPomodoro={() => setShowPomodoro(true)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onLogout={onLogout} onShowPomodoro={() => setShowPomodoro(true)} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children || <Outlet />}
        </main>

        {/* Persistent Pomodoro Timer - Floating Widget */}
        {showPomodoro && (
          <div className="fixed bottom-6 right-6 z-40 shadow-2xl">
            <PomodoroTimer onClose={() => setShowPomodoro(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
