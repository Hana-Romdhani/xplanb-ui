import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Lightbulb, DollarSign, TrendingUp, ArrowUp, ArrowDown, CheckCircle, AlertTriangle, RefreshCw, Sparkles, Activity, Clock, Zap } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BusinessAnalyticsService, BusinessAnalyticsData } from '../../services/businessAnalyticsService';
import { toast } from 'sonner';

export default function BusinessAnalytics() {
    const [data, setData] = useState<BusinessAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchData(true);
            }, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const analyticsData = await BusinessAnalyticsService.getAllBusinessAnalytics();
            setData(analyticsData);
            setLastUpdated(new Date());
            if (silent) {
                toast.success('Analytics refreshed', { duration: 2000 });
            }
        } catch (error: any) {
            console.error('Failed to fetch business analytics:', error);
            if (!silent) {
                toast.error('Could not load business analytics');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
        if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
        return 'bg-red-100 dark:bg-red-900/20';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
            case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };

    const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

    const getInitials = (name: string) => {
        if (!name) return 'NA';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    };

    // Computed prioritized metrics - MUST be called before any early returns (Rules of Hooks)
    const keyMetrics = useMemo(() => {
        if (!data) return null;

        const productivityScore = data.teamPerformance.topPerformers.averageScore;
        const collaborationScore = data.collaborationHealth.overallScore;
        const recommendationsCount = data.smartRecommendations.length;
        const bottlenecksCount = data.collaborationHealth.bottlenecks.length;
        const costSavingsFormatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(data.roiMetrics.costSavings);
        const topPerformerStrength = data.teamPerformance.topPerformers.users[0]?.strengths[0] || 'Consistent output from top performers.';
        const collaborationRateDelta =
            data.roiMetrics.beforeAfterComparison.after.collaborationRate -
            data.roiMetrics.beforeAfterComparison.before.collaborationRate;

        // Prioritize top performers (top 5)
        const topPerformers = data.teamPerformance.topPerformers.users.slice(0, 5);

        // Prioritize high-priority recommendations
        const priorityRecommendations = data.smartRecommendations
            .filter(r => r.priority === 'high')
            .slice(0, 5);

        // Top productivity scores (top 10)
        const topProductivityScores = data.productivityScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        return {
            productivityScore,
            collaborationScore,
            recommendationsCount,
            bottlenecksCount,
            costSavingsFormatted,
            topPerformerStrength,
            collaborationRateDelta,
            topPerformers,
            priorityRecommendations,
            topProductivityScores,
        };
    }, [data]);

    // Early returns AFTER all hooks
    if (isLoading) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading business analytics...</p>
                </div>
            </div>
        );
    }

    if (!data || !keyMetrics) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Failed to load analytics data</p>
                    <Button onClick={() => fetchData()} className="mt-4">Try Again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Business Analytics Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Real insights for better team performance and business value</p>
                        {lastUpdated && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                        >
                            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                        </Button>
                        <Link to="/analytics">
                            <Button variant="outline" size="sm">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Analytics
                            </Button>
                        </Link>
                        <Button onClick={() => fetchData()} variant="outline" size="sm" disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
                <TabsList className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-white p-2 dark:bg-card">
                    <TabsTrigger
                        value="overview"
                        className="w-auto rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="productivity"
                        className="w-auto rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                        Productivity
                    </TabsTrigger>
                    <TabsTrigger
                        value="collaboration"
                        className="w-auto rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                        Collaboration
                    </TabsTrigger>
                    <TabsTrigger
                        value="roi"
                        className="w-auto rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                        ROI Impact
                    </TabsTrigger>
                    <TabsTrigger
                        value="recommendations"
                        className="w-auto rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                        Recommendations
                    </TabsTrigger>
                </TabsList>
                <div className="flex-1 space-y-6">
                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6 mt-0">
                        <Card className="border border-border/60 bg-white dark:bg-card shadow-sm">
                            <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
                                <div className="space-y-5">
                                    <Badge variant="outline" className="w-fit">
                                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                                        Executive Snapshot
                                    </Badge>
                                    <h2 className="text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
                                        Momentum Overview
                                    </h2>
                                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                                        Track how your workspace is performing today. Monitor productivity momentum, collaboration strength, and ROI wins so you can focus the team on what moves the needle fastest.
                                    </p>
                                    <div className="flex flex-wrap gap-4 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                        <span className="inline-flex items-center gap-2">
                                            <Activity className="h-4 w-4" />
                                            {data.teamPerformance.teamHealth.collaborationScore}% collaboration pulse
                                        </span>
                                        <span className="inline-flex items-center gap-2">
                                            <Lightbulb className="h-4 w-4" />
                                            {keyMetrics.recommendationsCount} smart recommendations
                                        </span>
                                        <span className="inline-flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            {keyMetrics.bottlenecksCount} bottlenecks flagged
                                        </span>
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Card className="rounded-2xl border border-border/70 bg-muted/40 dark:bg-muted/10 p-5 shadow-none">
                                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                            <span>Team Productivity</span>
                                            <Badge variant="outline">{keyMetrics.productivityScore >= 70 ? 'On Track' : 'Needs Focus'}</Badge>
                                        </div>
                                        <div className="mt-4">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-semibold text-gray-900 dark:text-gray-100">{keyMetrics.productivityScore}%</span>
                                                <Trophy className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <Progress value={clampPercentage(keyMetrics.productivityScore)} className="mt-4 h-2" />
                                            <p className="mt-3 text-xs text-muted-foreground">Avg score across top performers</p>
                                        </div>
                                    </Card>
                                    <Card className="rounded-2xl border border-border/70 bg-muted/40 dark:bg-muted/10 p-5 shadow-none">
                                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                            <span>Collaboration Health</span>
                                            <Badge variant="outline">{keyMetrics.collaborationScore >= 70 ? 'Healthy' : 'Monitor'}</Badge>
                                        </div>
                                        <div className="mt-4">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-semibold text-gray-900 dark:text-gray-100">{keyMetrics.collaborationScore}%</span>
                                                <Users className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <Progress value={clampPercentage(keyMetrics.collaborationScore)} className="mt-4 h-2" />
                                            <p className="mt-3 text-xs text-muted-foreground">Shared documents & cross-team work</p>
                                        </div>
                                    </Card>
                                    <Card className="rounded-2xl border border-border/70 bg-muted/40 dark:bg-muted/10 p-5 shadow-none sm:col-span-2">
                                        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">ROI Impact</div>
                                        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase">Time Saved</p>
                                                <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{data.roiMetrics.timeSaved}h</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase">Cost Savings</p>
                                                <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{keyMetrics.costSavingsFormatted}</p>
                                            </div>
                                        </div>
                                        <Separator className="my-4" />
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{keyMetrics.recommendationsCount} smart tips</span>
                                            <span>{data.roiMetrics.efficiencyGain}% efficiency gain</span>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Card className="p-5 border border-border/70 shadow-sm hover:shadow-lg transition-all duration-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 p-3">
                                            <Trophy className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Team Productivity</h3>
                                            <p className="text-xs text-muted-foreground">Latest 7-day trend</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                        {keyMetrics.productivityScore}%
                                    </Badge>
                                </div>
                                <Progress value={clampPercentage(keyMetrics.productivityScore)} className="mt-4 h-2" />
                                <p className="mt-3 text-sm text-muted-foreground">{keyMetrics.topPerformerStrength}</p>
                            </Card>

                            <Card className="p-5 border border-border/70 shadow-sm hover:shadow-lg transition-all duration-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 p-3">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Collaboration Health</h3>
                                            <p className="text-xs text-muted-foreground">Active teamwork & sharing</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                                        {keyMetrics.collaborationScore}%
                                    </Badge>
                                </div>
                                <Progress value={clampPercentage(keyMetrics.collaborationScore)} className="mt-4 h-2" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    {data.collaborationHealth.recommendations[0] || 'Keep momentum by encouraging weekly cross-team syncs.'}
                                </p>
                            </Card>

                            <Card className="p-5 border border-border/70 shadow-sm hover:shadow-lg transition-all duration-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 p-3">
                                            <DollarSign className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Time Saved</h3>
                                            <p className="text-xs text-muted-foreground">Automation & process wins</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="border-transparent bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                                        {data.roiMetrics.timeSaved}h
                                    </Badge>
                                </div>
                                <Progress value={clampPercentage(data.roiMetrics.efficiencyGain)} className="mt-4 h-2" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    Efficiency gain at {data.roiMetrics.efficiencyGain}% this period.
                                </p>
                            </Card>

                            <Card className="p-5 border border-border/70 shadow-sm hover:shadow-lg transition-all duration-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 p-3">
                                            <Lightbulb className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Active Recommendations</h3>
                                            <p className="text-xs text-muted-foreground">AI-powered next steps</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                        {keyMetrics.recommendationsCount}
                                    </Badge>
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">
                                    Tackle high-priority actions to unlock additional {data.roiMetrics.collaborationIncrease}% collaboration boost.
                                </p>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <Card className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Performers</h3>
                                    <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                                        {keyMetrics.topPerformers.length} highlighted
                                    </Badge>
                                </div>
                                <div className="space-y-4">
                                    {keyMetrics.topPerformers.map((performer, index) => (
                                        <div key={index}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-border/60 bg-blue-500/10 text-blue-600 dark:text-blue-200">
                                                        <AvatarFallback>{getInitials(performer.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">{performer.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {performer.strengths[0] || 'High performer'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant="secondary" className={`${getScoreBgColor(performer.score)} border-transparent text-sm`}>
                                                        {performer.score}%
                                                    </Badge>
                                                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Rank #{index + 1}</span>
                                                </div>
                                            </div>
                                            {index !== keyMetrics.topPerformers.length - 1 && (
                                                <Separator className="mt-4 bg-border" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Business Impact</h3>
                                    <Badge variant="outline" className="border-dashed text-xs text-muted-foreground">ROI pulse</Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="rounded-xl border border-border/60 p-4">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Efficiency Gain</span>
                                            <span className="inline-flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                                                <ArrowUp className="h-4 w-4" />
                                                {data.roiMetrics.efficiencyGain}%
                                            </span>
                                        </div>
                                        <Progress value={clampPercentage(data.roiMetrics.efficiencyGain)} className="mt-3 h-2" />
                                    </div>
                                    <div className="rounded-xl border border-border/60 p-4">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Cost Savings</span>
                                            <span className="font-semibold text-green-600 dark:text-green-400">{keyMetrics.costSavingsFormatted}</span>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Completion rate at {data.roiMetrics.documentCompletionRate}%.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border/60 p-4">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Before vs After</span>
                                            <Badge variant="secondary" className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                                {keyMetrics.collaborationRateDelta >= 0 ? '+' : ''}
                                                {keyMetrics.collaborationRateDelta}%
                                            </Badge>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                            <div>
                                                <span className="block text-[11px] uppercase">Document Time</span>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {data.roiMetrics.beforeAfterComparison.after.avgDocumentTime}h
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[11px] uppercase">Completion Rate</span>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {data.roiMetrics.beforeAfterComparison.after.completionRate}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Health Snapshot</h3>
                                    <Badge variant="outline" className="border-dashed text-xs text-muted-foreground">Live status</Badge>
                                </div>
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-border/60 p-4">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Collaboration Score</span>
                                            <Badge variant="secondary" className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                                {data.teamPerformance.teamHealth.collaborationScore}%
                                            </Badge>
                                        </div>
                                        <Progress value={clampPercentage(data.teamPerformance.teamHealth.collaborationScore)} className="mt-3 h-2" />
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
                                        <span>Bottlenecks in review</span>
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">{data.teamPerformance.teamHealth.bottlenecks}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
                                        <span>Recommendations ready</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.teamPerformance.teamHealth.recommendations}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Productivity Tab */}
                    <TabsContent value="productivity" className="space-y-6 mt-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Productivity Scores</h3>
                                <Badge variant="outline" className="text-xs">
                                    Top {keyMetrics.topProductivityScores.length} performers
                                </Badge>
                            </div>
                            <div className="space-y-4">
                                {keyMetrics.topProductivityScores.map((score, index) => (
                                    <Card key={score.userId} className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getScoreBgColor(score.score)}`}>
                                                    <span className={`text-lg font-bold ${getScoreColor(score.score)}`}>
                                                        {score.score}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{score.userName}</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Productivity Score</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Rank #{index + 1}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                                            <div className="text-center">
                                                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{score.metrics.documentsCreated}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Documents</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-semibold text-green-600 dark:text-green-400">{score.metrics.versionsCreated}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Versions</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">{score.metrics.commentsAdded}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Comments</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">{score.metrics.meetingsAttended}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Meetings</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{score.metrics.collaborationScore}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Collaboration</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {score.insights.map((insight, insightIndex) => (
                                                <span key={insightIndex} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                                    {insight}
                                                </span>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Collaboration Tab */}
                    <TabsContent value="collaboration" className="space-y-6 mt-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Collaboration Health</h3>

                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Score</span>
                                    <span className={`text-2xl font-bold ${getScoreColor(data.collaborationHealth.overallScore)}`}>
                                        {data.collaborationHealth.overallScore}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${data.collaborationHealth.overallScore >= 80 ? 'bg-green-500' :
                                            data.collaborationHealth.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${data.collaborationHealth.overallScore}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.collaborationHealth.teamCollaboration.crossTeamWork}%</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Cross-Team Work</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.collaborationHealth.teamCollaboration.sharedDocuments}%</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Shared Documents</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.collaborationHealth.teamCollaboration.activeCollaborations}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Collaborations</div>
                                </div>
                            </div>

                            {data.collaborationHealth.bottlenecks.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Bottlenecks</h4>
                                    <div className="space-y-3">
                                        {data.collaborationHealth.bottlenecks.map((bottleneck, index) => (
                                            <div key={index} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                    <span className="font-medium text-red-800 dark:text-red-300">{bottleneck.description}</span>
                                                </div>
                                                <div className="text-sm text-red-700 dark:text-red-400">
                                                    Affected users: {bottleneck.users.join(', ')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Recommendations</h4>
                                <div className="space-y-2">
                                    {data.collaborationHealth.recommendations.map((recommendation, index) => (
                                        <div key={index} className="flex items-start space-x-2">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* ROI Tab */}
                    <TabsContent value="roi" className="space-y-6 mt-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">ROI Impact</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{data.roiMetrics.timeSaved}h</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Time Saved</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.roiMetrics.efficiencyGain}%</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency Gain</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{data.roiMetrics.collaborationIncrease}%</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Collaboration Increase</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">${data.roiMetrics.costSavings}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Cost Savings</div>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Before vs After Comparison</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Document Time</div>
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="text-lg font-semibold text-red-600 dark:text-red-400">{data.roiMetrics.beforeAfterComparison.before.avgDocumentTime}h</span>
                                            <ArrowDown className="h-4 w-4 text-green-500" />
                                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">{data.roiMetrics.beforeAfterComparison.after.avgDocumentTime}h</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Collaboration Rate</div>
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="text-lg font-semibold text-red-600 dark:text-red-400">{data.roiMetrics.beforeAfterComparison.before.collaborationRate}%</span>
                                            <ArrowUp className="h-4 w-4 text-green-500" />
                                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">{data.roiMetrics.beforeAfterComparison.after.collaborationRate}%</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Completion Rate</div>
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="text-lg font-semibold text-red-600 dark:text-red-400">{data.roiMetrics.beforeAfterComparison.before.completionRate}%</span>
                                            <ArrowUp className="h-4 w-4 text-green-500" />
                                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">{data.roiMetrics.beforeAfterComparison.after.completionRate}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Document Lifecycle</h3>
                            <div className="space-y-4">
                                {data.documentLifecycle.map((stage) => (
                                    <Card key={stage.stage} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{stage.stage}</h4>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stage.count}</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">documents</div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            Average time: {stage.avgTimeInStage}h
                                        </div>
                                        {stage.bottlenecks.length > 0 && (
                                            <div className="space-y-2">
                                                {stage.bottlenecks.map((bottleneck, bottleneckIndex) => (
                                                    <div key={bottleneckIndex} className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-2 rounded">
                                                        <div className="text-sm text-yellow-800 dark:text-yellow-300">{bottleneck.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Recommendations Tab */}
                    <TabsContent value="recommendations" className="space-y-6 mt-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Smart Recommendations</h3>
                                <Badge variant="outline" className="text-xs">
                                    {keyMetrics.priorityRecommendations.length} high-priority
                                </Badge>
                            </div>
                            {keyMetrics.priorityRecommendations.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">No high-priority recommendations at this time.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {keyMetrics.priorityRecommendations.map((recommendation, index) => (
                                        <Card key={index} className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
                                                            {recommendation.priority.toUpperCase()}
                                                        </span>
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                                                            {recommendation.type.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{recommendation.title}</h4>
                                                    <p className="text-gray-600 dark:text-gray-400 mb-2">{recommendation.description}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Action Required</h5>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.action}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Expected Impact</h5>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.impact}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 pt-3 border-t">
                                                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Affected Users</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {recommendation.users.map((user, userIndex) => (
                                                        <span key={userIndex} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 text-xs rounded-full">
                                                            {user}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

