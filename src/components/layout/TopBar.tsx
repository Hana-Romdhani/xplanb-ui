import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, Settings, Mic, Loader2, Moon, Sun, Home, FileText, Folder, Calendar, MessageSquare, Sparkles, Video, BarChart3 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { notificationsApi, Notification } from '../../api/notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { getUserById } from '../../lib/services/userService';
import { getInitials } from '../../lib/utils';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { API_URL } from '../../lib/config';

interface TopBarProps {
  onLogout: () => void;
  onShowPomodoro?: () => void;
}

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  picture?: string;
  avatar?: string;
}

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Folders', href: '/folders', icon: Folder },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Meetings', href: '/meetings', icon: Video },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function TopBar({ onLogout, onShowPomodoro }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Helper function to check if error is a connection error
  const isConnectionError = (error: any): boolean => {
    return (
      error?.code === 'ERR_NETWORK' ||
      error?.code === 'ECONNREFUSED' ||
      error?.message?.includes('ERR_CONNECTION_REFUSED') ||
      error?.message?.includes('Network Error') ||
      !error?.response
    );
  };

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await notificationsApi.getUnread();
        setNotifications(data);
        setUnreadCount(data.length);
      } catch (error: any) {
        if (isConnectionError(error)) {
          // Silently handle connection errors - backend might not be running
          console.warn('Backend connection unavailable. Notifications will not be loaded.');
          setNotifications([]);
          setUnreadCount(0);
        } else {
          console.error('Error loading notifications:', error);
        }
      }
    };

    const loadUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setUserLoading(false);
          return;
        }

        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        const userId = decoded.id || decoded._id || decoded.userId;

        const userData = await getUserById(userId);
        setUser(userData);
      } catch (error: any) {
        if (isConnectionError(error)) {
          // Silently handle connection errors - backend might not be running
          console.warn('Backend connection unavailable. User data will not be loaded.');
          setUser(null);
        } else {
          console.error('Error loading user:', error);
        }
      } finally {
        setUserLoading(false);
      }
    };

    loadNotifications();
    loadUser();

    // Reload notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadUser();
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  const handleVoiceSearch = () => {
    setIsVoiceSearching(!isVoiceSearching);
    if (!isVoiceSearching) {
      toast.success('Voice search started. Speak now...');
      // Simulate voice search
      setTimeout(() => {
        setSearchQuery('Product Roadmap');
        setOpen(true);
        setIsVoiceSearching(false);
        toast.success('Search complete!');
      }, 2000);
    } else {
      toast.info('Voice search stopped');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && open) {
      const filtered = navigation.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        setSearchQuery('');
        setOpen(false);
        navigate(filtered[0].href);
      }
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-2xl relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search documents, folders, or tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-0 cursor-pointer"
            />
          </div>
          {/* <Button
            variant={isVoiceSearching ? 'default' : 'ghost'}
            size="icon"
            onClick={handleVoiceSearch}
            className="rounded-xl"
          >
            <Mic className={`w-4 h-4 ${isVoiceSearching ? 'animate-pulse' : ''}`} />
          </Button> */}
        </div>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-card border border-border rounded-xl shadow-lg z-50 max-h-[300px] overflow-y-auto">
            {navigation.filter(item =>
              item.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).length > 0 ? (
              <div className="p-2">
                {navigation.filter(item =>
                  item.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        setSearchQuery('');
                        setOpen(false);
                        navigate(item.href);
                      }}
                      className="w-full flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-3 ml-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-xl"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px]">
                {unreadCount}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              <div className="space-y-2 p-2 max-h-[400px] overflow-y-auto">
                {notifications.slice(0, 5).map((notif, index) => (
                  <div
                    key={notif._id}
                    className={`p-3 rounded-lg ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'} text-[14px] cursor-pointer`}
                    onClick={() => {
                      notificationsApi.markAsRead(notif._id);
                      setNotifications(notifications.filter(n => n._id !== notif._id));
                      setUnreadCount(unreadCount - 1);

                      // Navigate based on notification type
                      if (notif.type === 'meeting_invitation' && notif.metadata?.meetingRoomId) {
                        const params = new URLSearchParams({
                          room: notif.metadata.meetingRoomId,
                          title: notif.metadata.meetingTitle || notif.title,
                        });
                        navigate(`/meet?${params.toString()}`);
                      } else if (notif.documentId) {
                        navigate(`/documents/${notif.documentId}`);
                      } else if (notif.folderId) {
                        navigate(`/folders/${notif.folderId}`);
                      }
                    }}
                  >
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-[13px]">{notif.message}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-xl">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={(() => {
                    if (!user) return undefined;
                    const avatarUrl = user.avatar || user.picture;
                    if (!avatarUrl) return undefined;
                    return avatarUrl.startsWith('http')
                      ? avatarUrl
                      : `${API_URL.replace('/api', '')}${avatarUrl}`;
                  })()}
                  alt={user ? `${user.firstName} ${user.lastName}` : 'User'}
                />
                <AvatarFallback className="bg-blue-600 text-white">
                  {user ? getInitials(user.firstName, user.lastName) : userLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '?'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div>
                {userLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[12px] text-muted-foreground">Loading...</span>
                  </div>
                ) : user ? (
                  <>
                    <p>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User'}</p>
                    <p className="text-[12px] text-muted-foreground">{user.email || 'No email'}</p>
                  </>
                ) : (
                  <>
                    <p>User</p>
                    <p className="text-[12px] text-muted-foreground">No data</p>
                  </>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            {/*   <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
