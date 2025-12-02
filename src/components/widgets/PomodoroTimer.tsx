import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, X, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { pomodoroApi, PomodoroSession, DailySessionData } from '../../api/pomodoro';

interface PomodoroTimerProps {
  onClose?: () => void;
}

export default function PomodoroTimer({ onClose }: PomodoroTimerProps) {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [dailyStats, setDailyStats] = useState<DailySessionData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const activeSessionRef = useRef<PomodoroSession | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Load daily stats and active session on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load daily sessions (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [dailyData, statsData, activeSession, recentData] = await Promise.all([
        pomodoroApi.getDailySessions(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
        pomodoroApi.getStats('daily'),
        pomodoroApi.getActiveSession(),
        pomodoroApi.getRecentSessions(20),
      ]);

      setDailyStats(dailyData.dailyStats);
      setStats(statsData);
      setSessions(recentData);

      // If there's an active session, restore it
      if (activeSession) {
        activeSessionRef.current = activeSession;
        const elapsed = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
        const remaining = (activeSession.duration * 60) - elapsed;

        if (remaining > 0) {
          setTimeLeft(remaining);
          setIsRunning(true);
          setIsBreak(activeSession.type !== 'work');
          startTimeRef.current = new Date(activeSession.startTime);
        } else {
          // Session expired, stop it
          if (activeSession._id) {
            await pomodoroApi.stopSession(activeSession._id, { interrupted: true });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load Pomodoro data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            handleSessionComplete();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleSessionComplete = async () => {
    setIsRunning(false);

    try {
      // Stop the active session
      if (activeSessionRef.current?._id) {
        await pomodoroApi.stopSession(activeSessionRef.current._id, { interrupted: false });
      }

      // Reload data
      await loadData();

      // Notification
      if (isBreak) {
        toast.success('Break completed! Ready to work?', {
          duration: 5000,
        });
        setTimeLeft(workDuration * 60);
        setIsBreak(false);
      } else {
        toast.success('Work session completed! Time for a break!', {
          duration: 5000,
        });
        setTimeLeft(breakDuration * 60);
        setIsBreak(true);
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
      toast.error('Failed to save session');
    }

    activeSessionRef.current = null;
    startTimeRef.current = null;
  };

  const toggleTimer = async () => {
    if (!isRunning) {
      // Start new session
      try {
        const session = await pomodoroApi.startSession({
          type: isBreak ? 'break' : 'work',
          duration: isBreak ? breakDuration : workDuration,
        });

        activeSessionRef.current = session;
        startTimeRef.current = new Date();
        setIsRunning(true);

        toast.success(`${isBreak ? 'Break' : 'Work'} session started!`);
      } catch (error) {
        console.error('Failed to start session:', error);
        toast.error('Failed to start session');
      }
    } else {
      // Pause - we'll just pause locally, session stays active
      setIsRunning(false);
    }
  };

  const resetTimer = async () => {
    setIsRunning(false);

    // Stop active session if exists
    if (activeSessionRef.current?._id) {
      try {
        await pomodoroApi.stopSession(activeSessionRef.current._id, {
          interrupted: true,
          interruptionReason: 'Timer reset'
        });
        activeSessionRef.current = null;
        startTimeRef.current = null;
        await loadData();
      } catch (error) {
        console.error('Failed to reset session:', error);
      }
    }

    setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = (isBreak ? breakDuration : workDuration) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Get today's stats from dailyStats
  const today = new Date().toISOString().split('T')[0];
  const todayStats = dailyStats.find(d => d.date === today);

  const workSessionsToday = todayStats?.sessionCount || 0;
  const totalMinutesToday = todayStats?.totalMinutes || 0;
  const averageMinutesToday = todayStats?.averageMinutes || 0;

  // Get last 7 days for display
  const last7Days = dailyStats.slice(0, 7);
  const averageWorkTimePerDay = dailyStats.length > 0
    ? dailyStats.reduce((sum, d) => sum + d.totalMinutes, 0) / dailyStats.length
    : 0;

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isBreak ? 'bg-green-500' : 'bg-blue-600'} ${isRunning ? 'animate-pulse' : ''}`} />
          Pomodoro Timer
        </h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="timer" className="flex-1">Timer</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="p-6 space-y-6">
          {/* Timer Display */}
          <div className="text-center space-y-4">
            <p className="text-[14px] text-muted-foreground">
              {isBreak ? '☕ Break Time' : '💼 Work Session'}
            </p>

            <div className="relative">
              <svg className="w-48 h-48 mx-auto transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                  className={isBreak ? 'text-green-500' : 'text-blue-600'}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[48px]">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isRunning ? 'outline' : 'default'}
                size="lg"
                onClick={toggleTimer}
                className="rounded-xl"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={resetTimer}
                className="rounded-xl"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowSettings(!showSettings)}
                className="rounded-xl"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-4 p-4 rounded-xl bg-muted/50">
              <div>
                <Label htmlFor="workDuration">Work Duration (minutes)</Label>
                <Input
                  id="workDuration"
                  type="number"
                  value={workDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setWorkDuration(val);
                    if (!isBreak) setTimeLeft(val * 60);
                  }}
                  className="mt-1.5 rounded-xl"
                  min="1"
                  max="60"
                />
              </div>

              <div>
                <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                <Input
                  id="breakDuration"
                  type="number"
                  value={breakDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBreakDuration(val);
                    if (isBreak) setTimeLeft(val * 60);
                  }}
                  className="mt-1.5 rounded-xl"
                  min="1"
                  max="30"
                />
              </div>
            </div>
          )}

          {/* Today's Progress */}
          <div className="space-y-2">
            <p className="text-[14px] text-muted-foreground">Today's Sessions</p>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 flex-1 rounded transition-colors ${i < workSessionsToday
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-muted'
                    }`}
                  title={i < workSessionsToday ? `Session ${i + 1}` : 'Not completed'}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">
                {workSessionsToday} {workSessionsToday === 1 ? 'session' : 'sessions'} completed
              </span>
              {averageMinutesToday > 0 && (
                <span className="text-muted-foreground">
                  Avg: {averageMinutesToday.toFixed(1)} min/session
                </span>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 rounded-xl text-center">
                  <p className="text-[14px] text-muted-foreground mb-1">Today</p>
                  <p className="text-[28px] font-bold">{workSessionsToday}</p>
                  <p className="text-[12px] text-muted-foreground">sessions</p>
                </Card>

                <Card className="p-4 rounded-xl text-center">
                  <p className="text-[14px] text-muted-foreground mb-1">Total Time</p>
                  <p className="text-[28px] font-bold">{totalMinutesToday}</p>
                  <p className="text-[12px] text-muted-foreground">minutes</p>
                </Card>
              </div>

              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 rounded-xl text-center">
                    <p className="text-[14px] text-muted-foreground mb-1">Avg Session</p>
                    <p className="text-[28px] font-bold">{stats.averageSessionLength.toFixed(1)}</p>
                    <p className="text-[12px] text-muted-foreground">minutes</p>
                  </Card>

                  <Card className="p-4 rounded-xl text-center">
                    <p className="text-[14px] text-muted-foreground mb-1">Productivity</p>
                    <p className="text-[28px] font-bold">{stats.productivityScore}</p>
                    <p className="text-[12px] text-muted-foreground">score</p>
                  </Card>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-muted-foreground">Average Work Time/Day</span>
                  <span className="font-semibold">{averageWorkTimePerDay.toFixed(1)} minutes</span>
                </div>
                <Progress value={Math.min((workSessionsToday / 8) * 100, 100)} className="h-2" />
              </div>

              {last7Days.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[14px] text-muted-foreground">Last 7 Days</p>
                  <div className="space-y-2">
                    {last7Days.map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-muted-foreground">
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[12px] font-medium">
                            {day.sessionCount} {day.sessionCount === 1 ? 'session' : 'sessions'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-muted-foreground">
                            {day.totalMinutes} min
                          </span>
                          <span className="text-[12px] font-medium">
                            Avg: {day.averageMinutes.toFixed(1)} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[14px] text-muted-foreground">Recent Sessions</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {sessions.slice(0, 10).map((session) => (
                    <div
                      key={session._id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${session.type === 'work' ? 'bg-blue-600' : 'bg-green-500'}`} />
                        <span className="text-[14px] capitalize">
                          {session.type === 'work' ? 'Work' : session.type === 'break' ? 'Break' : 'Long Break'}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.completed && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                            Completed
                          </span>
                        )}
                        {session.interrupted && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                            Interrupted
                          </span>
                        )}
                        <span className="text-[12px] text-muted-foreground">
                          {session.duration} min
                        </span>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <p className="text-center text-[14px] text-muted-foreground py-4">
                      No sessions yet. Start your first Pomodoro!
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
