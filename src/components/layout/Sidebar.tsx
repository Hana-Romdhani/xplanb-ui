import { Link, useLocation } from "react-router-dom";
import {
  Home,
  FileText,
  Folder,
  Calendar,
  MessageSquare,
  Sparkles,
  Settings,
  ChevronLeft,
  Video,
  BarChart3,
} from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import Logo from "../../../assets/xplanb_logo-removebg-preview.png";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onShowPomodoro?: () => void;
}

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Folders", href: "/folders", icon: Folder },

  /*   { name: 'Documents', href: '/documents', icon: FileText },
   */ { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Meetings", href: "/meetings", icon: Video },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
];

export default function Sidebar({
  isOpen,
  onToggle,
  onShowPomodoro,
}: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-white dark:bg-card border-r border-border transition-all duration-300",
          isOpen ? "w-64" : "w-0 lg:w-16"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {isOpen && (
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white-600 rounded-lg flex items-center justify-center">
                <img
                  src={ Logo}
                  alt="XPlanB logo"
                  className="w-10 h-auto"
                />{" "}
              </div>
              <span className="text-[18px]">XPlanB</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="rounded-xl"
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5 transition-transform",
                !isOpen && "rotate-180"
              )}
            />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl transition-colors group",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
