import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SignUp from "./components/auth/SignUp";
import Login from "./components/auth/Login";
import ResetPassword from "./components/auth/ResetPassword";
import PrivateRoute from "./routes/PrivateRoute";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./components/pages/Dashboard";
import Documents from "./components/pages/Documents";
import Folders from "./components/pages/Folders";
import FolderDetail from "./components/pages/FolderDetail";
import DocumentEditor from "./components/pages/DocumentEditor";
import Calendar from "./components/pages/Calendar";
import Chat from "./components/pages/Chat";
import AIAssistant from "./components/pages/AIAssistant";
import Meetings from "./components/pages/Meetings.tsx";
import MeetingRoom from "./components/pages/MeetingRoom.tsx";
import Profile from "./components/pages/Profile";
import Analytics from "./components/pages/Analytics";
import BusinessAnalytics from "./components/pages/BusinessAnalytics";
import OnboardingModal from "./components/modals/OnboardingModal";
import { Toaster } from "./components/ui/sonner";
import { isAuthed, logout } from "./lib/auth";
import { ThemeProvider } from "./lib/contexts/ThemeContext";
import Home from "./components/landingpage/home";
import HistoricalChangesPage from "./components/pages/ContentHistory/HistoricalChangesPage.tsx";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (isAuthed()) {
      setIsAuthenticated(true);
      const onboardingComplete = localStorage.getItem("xplanb_onboarding");
      if (!onboardingComplete) {
        setShowOnboarding(true);
      }
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem("xplanb_auth", "true");
    // Skip onboarding - it's already marked as complete in Login/SignUp components
    setShowOnboarding(false);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    localStorage.removeItem("xplanb_onboarding");
  };

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/home" element={<Home />} />
            <Route
              path="/signup"
              element={
                !isAuthenticated ? (
                  <SignUp onSignUp={handleLogin} />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            {/* Meeting room - accessible without authentication (participants need to join via link) */}
            <Route path="/meet" element={<MeetingRoom />} />
            <Route element={<PrivateRoute />}>
              <Route element={<MainLayout onLogout={handleLogout} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/folders" element={<Folders />} />
                <Route path="/folders/:id" element={<FolderDetail />} />
                <Route path="/documents/:id" element={<DocumentEditor />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route
                  path="/business-analytics"
                  element={<BusinessAnalytics />}
                />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/ai-assistant" element={<AIAssistant />} />
                <Route path="/settings" element={<Profile />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Route>
            </Route>
          </Routes>

          {showOnboarding && (
            <OnboardingModal
              onComplete={() => {
                setShowOnboarding(false);
                localStorage.setItem("xplanb_onboarding", "true");
              }}
            />
          )}

          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}
