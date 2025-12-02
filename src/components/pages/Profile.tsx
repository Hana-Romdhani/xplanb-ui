/**
 * Profile.tsx
 * 
 * User Profile Management Page
 * 
 * A comprehensive profile management interface with four main sections:
 * 
 * 1. Profile Tab:
 *    - Display and edit user information (name, email)
 *    - Change password with current password verification
 *    - Avatar display with user initials
 * 
 * 2. Pomodoro History Tab:
 *    - Display Pomodoro timer statistics and analytics
 *    - Show last 30 days of completed sessions
 *    - Today's sessions visualization
 *    - Weekly productivity summary with scores
 *    - Average session length and completion rates
 * 
 * 3. Notifications Tab:
 *    - Configure email notification preferences
 *    - Toggle various notification types (comments, mentions, reminders, etc.)
 *    - Weekly digest settings
 * 
 * 4. Workspace Tab:
 *    - Workspace configuration (name, URL)
 *    - Appearance settings (dark mode toggle)
 *    - View and manage team members
 *    - Display shared folder collaborators
 * 
 * Security:
 * - Password changes require current password verification (backend validated)
 * - JWT-based authentication
 * - Secure password hashing with bcrypt
 * 
 * Data Loading:
 * - Auto-loads user data, Pomodoro stats, and team members on mount
 * - Graceful error handling with fallback states
 */

import { useEffect, useState, useRef } from 'react';
import { Camera, Mail, Loader2, Save, Clock, TrendingUp, Moon, Users, Lock } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { getUserById, updateUser } from '@/lib/services/userService';
import { getInitials } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { pomodoroApi, DailySessionData, PomodoroStats } from '../../api/pomodoro';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useTheme } from '../../lib/contexts/ThemeContext';
import { foldersApi } from '../../api/folders';
import { uploadsApi } from '../../api/uploads';
import { API_URL } from '../../lib/config';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  picture?: string;
  password?: string;
  confirmPassword?: string;
  currentPassword?: string;
  newPassword?: string;
  role?: string;
}

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
}

export default function Profile() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats | null>(null);
  const [dailySessions, setDailySessions] = useState<DailySessionData[]>([]);
  const [pomodoroLoading, setPomodoroLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  useEffect(() => {
    loadUser();
    loadPomodoroData();
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setTeamLoading(true);
      const members = await foldersApi.getSharedUsers();
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      // Don't show error toast, just log it
    } finally {
      setTeamLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
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
      setOriginalUser({ ...userData });
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPomodoroData = async () => {
    try {
      setPomodoroLoading(true);

      // Load last 30 days of Pomodoro data - don't filter by date to get all sessions
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Fetch data - use getRecentSessions to get all sessions including interrupted ones
      const [dailyData, statsData, recentData] = await Promise.all([
        pomodoroApi.getDailySessions(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
        pomodoroApi.getStats('weekly'),
        pomodoroApi.getRecentSessions(100), // Get more recent sessions
      ]);

      // If dailyData has no results but recentData does, manually build daily stats from recent sessions
      if (dailyData.dailyStats.length === 0 && recentData.length > 0) {
        // Group recent sessions by date
        const grouped: { [date: string]: any[] } = {};
        recentData
          .filter(s => s.type === 'work' && s.endTime) // Filter for completed work sessions
          .forEach(session => {
            const dateKey = new Date(session.startTime).toISOString().split('T')[0];
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push(session);
          });

        // Convert to dailyStats format
        const manualStats = Object.entries(grouped).map(([date, sessions]) => {
          const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
          const avgSessionLength = sessions.length > 0 ? totalMinutes / sessions.length : 0;

          return {
            date,
            sessionCount: sessions.length,
            totalMinutes,
            averageMinutes: Math.round(avgSessionLength * 10) / 10,
            sessions: sessions.map(s => ({
              id: s._id,
              duration: s.duration,
              startTime: s.startTime,
              endTime: s.endTime,
            }))
          };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setDailySessions(manualStats);
      } else {
        setDailySessions(dailyData.dailyStats);
      }

      setPomodoroStats(statsData);
    } catch (error) {
      console.error('Error loading Pomodoro data:', error);
      // Don't show error toast, just log it (Pomodoro is optional)
    } finally {
      setPomodoroLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('access_token');
      const base64Url = token!.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      const userId = decoded.id || decoded._id || decoded.userId;

      await updateUser(userId, user);
      toast.success('Profile updated successfully!');
      setOriginalUser({ ...user });
      // Trigger a custom event to refresh user data in TopBar
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF, or WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Upload the image
      const uploadResponse = await uploadsApi.uploadImage(file);

      if (uploadResponse.success === 1 && uploadResponse.file?.url) {
        // Construct full URL
        const baseUrl = API_URL.replace('/api', '');
        const avatarUrl = uploadResponse.file.url.startsWith('http')
          ? uploadResponse.file.url
          : `${baseUrl}${uploadResponse.file.url}`;

        // Update user with new avatar URL
        const token = localStorage.getItem('access_token');
        const base64Url = token!.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        const userId = decoded.id || decoded._id || decoded.userId;

        // Update both avatar and picture fields for compatibility
        await updateUser(userId, {
          avatar: avatarUrl,
          picture: avatarUrl,
        });

        // Update local state
        if (user) {
          setUser({ ...user, avatar: avatarUrl, picture: avatarUrl });
          setOriginalUser({ ...user, avatar: avatarUrl, picture: avatarUrl });
        }

        toast.success('Avatar updated successfully!');

        // Trigger a custom event to refresh user data in TopBar
        window.dispatchEvent(new CustomEvent('userProfileUpdated'));
      } else {
        throw new Error(uploadResponse.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handlePasswordUpdate = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const base64Url = token!.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      const userId = decoded.id || decoded._id || decoded.userId;

      await updateUser(userId, {
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword,
      });

      toast.success('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        'Failed to update password. Please check your current password.';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="p-8 rounded-xl">
          <p className="text-center text-muted-foreground">User not found</p>
        </Card>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = getInitials(user.firstName, user.lastName);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="p-8 rounded-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
            />
            <div className="relative group">
              <Avatar className="w-24 h-24 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage
                  src={(() => {
                    const avatarUrl = user.avatar || user.picture;
                    if (!avatarUrl) return undefined;
                    return avatarUrl.startsWith('http')
                      ? avatarUrl
                      : `${API_URL.replace('/api', '')}${avatarUrl}`;
                  })()}
                  alt={fullName}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[32px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleAvatarClick}>
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-[28px] mb-2">{fullName}</h1>
            <p className="text-muted-foreground mb-4">{user.email}</p>

            <div className="flex flex-wrap gap-4 text-[14px] text-muted-foreground">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {user.email}
              </div>
              <div className="flex items-center">
                <Badge variant="secondary">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="rounded-xl bg-muted/50 p-1 w-full md:w-auto">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Profile</TabsTrigger>
          <TabsTrigger value="pomodoro" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Pomodoro History</TabsTrigger>
          <TabsTrigger value="workspace" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Workspace</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
          <Card className="p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <Camera className="w-6 h-6 text-blue-600" />
              <h2 className="text-[20px] font-semibold">Profile Information</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={user.firstName}
                    onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={user.lastName}
                    onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleUpdate} className="rounded-xl">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-blue-600" />
              <h2 className="text-[20px] font-semibold">Change Password</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <Button onClick={handlePasswordUpdate} className="rounded-xl">
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Pomodoro Tab */}
        <TabsContent value="pomodoro" className="space-y-6">
          <Card className="p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold">Pomodoro History</h2>
                  <p className="text-[14px] text-muted-foreground">Your productivity tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pomodoroLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.setItem('pomodoro_timer_visible', 'true');
                    window.dispatchEvent(new Event('showPomodoroTimer'));
                  }}
                  className="rounded-xl"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Open Timer
                </Button>
              </div>
            </div>

            {pomodoroLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : pomodoroStats && dailySessions.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-[12px] text-muted-foreground mb-1">Total Sessions</p>
                    <p className="text-[24px] font-bold">{pomodoroStats.totalSessions}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-[12px] text-muted-foreground mb-1">Completed</p>
                    <p className="text-[24px] font-bold">{pomodoroStats.completedSessions}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-[12px] text-muted-foreground mb-1">Total Work Time</p>
                    <p className="text-[24px] font-bold">{pomodoroStats.totalWorkTime}</p>
                    <p className="text-[10px] text-muted-foreground">minutes</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-[12px] text-muted-foreground mb-1">Avg Session</p>
                    <p className="text-[24px] font-bold">{pomodoroStats.averageSessionLength.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">minutes</p>
                  </div>
                </div>

                {/* Today's Sessions */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayStats = dailySessions.find(d => d.date === today);
                  const todaySessionCount = todayStats?.sessionCount || 0;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[14px] font-medium">Today's Sessions</p>
                        <span className="text-[12px] text-muted-foreground">
                          {todaySessionCount} {todaySessionCount === 1 ? 'session' : 'sessions'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-10 flex-1 rounded transition-colors ${i < todaySessionCount
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : 'bg-muted'
                              }`}
                            title={i < todaySessionCount ? `Session ${i + 1}` : 'Not completed'}
                          />
                        ))}
                      </div>
                      {todayStats && (
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                          <span>{todayStats.totalMinutes} minutes today</span>
                          <span>Avg: {todayStats.averageMinutes.toFixed(1)} min/session</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Last 14 Days */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium">Last 14 Days</p>
                    <span className="text-[12px] text-muted-foreground">
                      {dailySessions.slice(0, 14).reduce((sum, d) => sum + d.sessionCount, 0)} total sessions
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {dailySessions.slice(0, 14).map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-[12px] font-medium min-w-[100px]">
                            {new Date(day.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="flex gap-1 flex-1 max-w-[200px]">
                            {Array.from({ length: Math.min(day.sessionCount, 8) }).map((_, i) => (
                              <div
                                key={i}
                                className="h-6 w-6 rounded bg-blue-600 dark:bg-blue-500"
                                title={`Session ${i + 1}`}
                              />
                            ))}
                            {day.sessionCount > 8 && (
                              <div className="h-6 px-2 rounded bg-blue-400 dark:bg-blue-600 flex items-center justify-center text-[10px] text-white font-medium">
                                +{day.sessionCount - 8}
                              </div>
                            )}
                            {day.sessionCount === 0 && (
                              <span className="text-[12px] text-muted-foreground italic">No sessions</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-[12px]">
                          <span className="text-muted-foreground min-w-[60px] text-right">
                            {day.totalMinutes} min
                          </span>
                          <span className="font-medium min-w-[70px] text-right">
                            Avg: {day.averageMinutes.toFixed(1)} min
                          </span>
                        </div>
                      </div>
                    ))}
                    {dailySessions.length === 0 && (
                      <p className="text-center text-[14px] text-muted-foreground py-4">
                        No Pomodoro sessions yet. Start your first session to see your history here!
                      </p>
                    )}
                  </div>
                </div>

                {/* Weekly Summary */}
                {pomodoroStats && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-[14px] font-semibold">Weekly Summary</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-[12px] text-muted-foreground">Productivity Score</p>
                        <p className="text-[20px] font-bold">{pomodoroStats.productivityScore}/100</p>
                      </div>
                      <div>
                        <p className="text-[12px] text-muted-foreground">Avg Work Time/Day</p>
                        <p className="text-[20px] font-bold">
                          {dailySessions.length > 0
                            ? (dailySessions.reduce((sum, d) => sum + d.totalMinutes, 0) / Math.min(dailySessions.length, 7)).toFixed(0)
                            : '0'}{' '}
                          min
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-[14px] text-muted-foreground">
                  No Pomodoro sessions yet
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Start using the Pomodoro Timer to track your productivity
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-6">
          <Card className="p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <Moon className="w-6 h-6 text-blue-600" />
              <h2 className="text-[20px] font-semibold">Appearance</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-[14px] text-muted-foreground">
                  Toggle dark mode theme
                </p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </Card>

          <Card className="p-6 rounded-xl">
            <h2 className="text-[20px] font-semibold mb-6">Team Members</h2>

            {teamLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers.length > 0 ? (
              <div className="space-y-3 mb-4">
                {teamMembers.map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getInitials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-[14px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Collaborator</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-[14px] text-muted-foreground">
                  No team members yet
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Share folders with others to build your team
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
