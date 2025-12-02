import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, RefreshCw, Download, TrendingUp, Users, Folder } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { getRealUsefulAnalytics, RealAnalyticsData } from '../../services/realAnalyticsService';
import { toast } from 'sonner';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip as ChartTooltipPlugin,
    Legend as ChartLegendPlugin,
    Title as ChartTitlePlugin,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

// Verify Chart.js components are available
if (!Line || !Bar || !Pie) {
    console.error('Chart.js components are not available. Please install chart.js and react-chartjs-2');
}
import { analyticsApi, ProjectOverview, FolderAnalytics } from '../../services/analyticsApi';
import { chatApi, Conversation } from '../../api/chat';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    ChartTooltipPlugin,
    ChartLegendPlugin,
    ChartTitlePlugin,
);

const CHART_TEXT_COLOR = '#cbd5f0';
const CHART_GRID_COLOR = 'rgba(148, 163, 184, 0.25)';
const CHART_BORDER_COLOR = 'rgba(15, 23, 42, 0.6)';

interface ChartSeriesConfig {
    key: string;
    label: string;
    color: string;
}

interface PreparedChartData {
    data: any[];
    series?: ChartSeriesConfig[];
}

const truncateText = (value: string, maxLength: number = 24) => {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
};

export default function Analytics() {
    const [analyticsData, setAnalyticsData] = useState<RealAnalyticsData | null>(null);
    const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
    const [isLoading, setIsLoading] = useState(true);
    const [projectOverview, setProjectOverview] = useState<ProjectOverview[] | null>(null);
    const [folderAnalytics, setFolderAnalytics] = useState<FolderAnalytics | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get current user ID from JWT token
    useEffect(() => {
        const getCurrentUserId = () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;

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
                setCurrentUserId(userId);
            } catch (error) {
                console.error('Failed to get user ID:', error);
            }
        };
        getCurrentUserId();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchData();
        }
    }, [currentUserId]);

    const fetchData = async () => {
        if (!currentUserId) return;
        
        setIsLoading(true);
        try {
            const [data, overview, folderStats, chatData] = await Promise.all([
                getRealUsefulAnalytics(currentUserId),
                analyticsApi.getProjectOverview(),
                analyticsApi.getFolderAnalytics(),
                chatApi.getConversations().catch((error) => {
                    console.error('Failed to fetch chat conversations:', error);
                    return [];
                })
            ]);
            setAnalyticsData(data);
            setProjectOverview(overview);
            setFolderAnalytics(folderStats);
            // Filter conversations to only show current user's conversations
            const filteredConversations = Array.isArray(chatData) 
                ? chatData.filter(conv => 
                    conv.participants?.some(p => p._id === currentUserId)
                )
                : [];
            setConversations(filteredConversations);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        await fetchData();
        toast.success('Data refreshed');
    };

    const handleExport = () => {
        if (!analyticsData) return;

        const dataStr = JSON.stringify({
            metrics: {
                totalDocuments: analyticsData.totalDocuments,
                totalVersions: analyticsData.totalVersions,
                versionsCreatedToday: analyticsData.versionsCreatedToday,
                activeEditors: analyticsData.activeEditors,
            },
            analytics: analyticsData,
            timestamp: new Date().toISOString()
        }, null, 2);

        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Analytics data exported');
    };

    const DEFAULT_LINE_SERIES: ChartSeriesConfig[] = [
        { key: 'versions', label: 'Versions Created', color: '#3b82f6' },
        { key: 'comments', label: 'Comments Added', color: '#10b981' },
    ];

    const buildZeroedTrend = (days: number = 7) => {
        return Array.from({ length: days }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (days - index - 1));
            return {
                date: date.toLocaleDateString(undefined, { weekday: 'short' }),
                versions: 0,
                comments: 0,
            };
        });
    };

    const getChartData = (): PreparedChartData | null => {
        switch (chartType) {
            case 'line': {
                if (!analyticsData) {
                    return { data: buildZeroedTrend(), series: DEFAULT_LINE_SERIES };
                }

                const sourceTrends = analyticsData.versionTrends || [];
                const baseData = buildZeroedTrend(Math.max(7, sourceTrends.length || 7));
                const trendMap = new Map(
                    sourceTrends.map((trend) => [
                        new Date(trend.date).toLocaleDateString(undefined, { weekday: 'short' }),
                        {
                            versions: trend.versions ?? 0,
                            comments: trend.comments ?? 0,
                        },
                    ]),
                );

                const data = baseData.map((entry) => {
                    const override = trendMap.get(entry.date);
                    return override
                        ? {
                            date: entry.date,
                            versions: override.versions,
                            comments: override.comments,
                        }
                        : entry;
                });

                return {
                    data,
                    series: analyticsData.versionTrends && analyticsData.versionTrends.length > 0
                        ? [
                            { key: 'versions', label: 'Versions Created', color: '#3b82f6' },
                            { key: 'comments', label: 'Comments Added', color: '#10b981' },
                        ]
                        : DEFAULT_LINE_SERIES,
                };
            }
            case 'bar': {
                if (conversations.length > 0) {
                    const data = conversations.slice(0, 8).map((conversation) => ({
                        name: truncateText(formatConversationTitle(conversation)),
                        participants: conversation.participants?.length || 0,
                    }));

                    return {
                        data,
                        series: [
                            { key: 'participants', label: 'Participants', color: '#3b82f6' },
                        ],
                    };
                }

                if (!analyticsData || analyticsData.mostActiveEditors.length === 0) {
                    if (folderAnalytics && folderAnalytics.folderStats.length > 0) {
                        const data = folderAnalytics.folderStats
                            .slice(0, 8)
                            .map((folder) => ({
                                name: truncateText(folder.folderName),
                                documents: folder.totalDocuments,
                                recent: folder.recentDocuments,
                            }));

                        return {
                            data,
                            series: [
                                { key: 'documents', label: 'Total Documents', color: '#3b82f6' },
                                { key: 'recent', label: 'Recent Documents', color: '#10b981' },
                            ],
                        };
                    }

                    return {
                        data: [
                            { name: 'Activity', value: 0 },
                        ],
                        series: [
                            { key: 'value', label: 'Activity', color: '#3b82f6' },
                        ],
                    };
                }

                const data = analyticsData.mostActiveEditors.map((editor) => ({
                    name: editor.userName,
                    versions: editor.versionsCreated,
                    comments: editor.commentsAdded || 0,
                }));

                return {
                    data,
                    series: [
                        { key: 'versions', label: 'Versions Created', color: '#3b82f6' },
                        { key: 'comments', label: 'Comments Added', color: '#10b981' },
                    ],
                };
            }
            case 'pie': {
                if (conversations.length > 0) {
                    const directCount = conversations.filter((conversation) => conversation.type === 'direct').length;
                    const groupCount = conversations.filter((conversation) => conversation.type === 'group').length;
                    const inactiveCount = conversations.filter((conversation) => !conversation.lastMessage).length;

                    let data = [
                        { name: 'Direct Chats', value: directCount },
                        { name: 'Group Chats', value: groupCount },
                        { name: 'Inactive Chats', value: inactiveCount },
                    ];

                    const total = data.reduce((sum, item) => sum + item.value, 0);
                    if (total === 0) {
                        data = [
                            { name: 'Conversations', value: conversations.length },
                            { name: 'Active Chats', value: Math.ceil(conversations.length / 2) },
                            { name: 'Inactive Chats', value: Math.floor(conversations.length / 2) },
                        ];
                    }

                    return { data };
                }

                if (folderAnalytics) {
                    const sharedFolders = folderAnalytics.totalSharedFolders || 0;
                    const privateFolders = Math.max(folderAnalytics.totalFolders - sharedFolders, 0);
                    const data = [
                        { name: 'Shared Folders', value: sharedFolders },
                        { name: 'Private Folders', value: privateFolders },
                        { name: 'Total Documents', value: folderAnalytics.totalDocuments || 0 },
                    ];

                    const total = data.reduce((sum, item) => sum + item.value, 0);
                    if (total > 0) {
                        return { data };
                    }
                }

                if (analyticsData) {
                    const data = [
                        { name: 'Versions Today', value: analyticsData.versionsCreatedToday || 0 },
                        { name: 'Versions This Week', value: analyticsData.versionsCreatedThisWeek || 0 },
                        { name: 'Comments Today', value: analyticsData.commentsCreatedToday || 0 },
                        { name: 'Total Comments', value: analyticsData.totalComments || 0 },
                    ];

                    const total = data.reduce((sum, item) => sum + item.value, 0);
                    if (total > 0) {
                        return { data };
                    }
                }

                return {
                    data: [
                        { name: 'Documents', value: 1 },
                    ],
                };
            }
            default:
                return null;
        }
    };

    const chartData = getChartData();
    const averageDocumentsPerFolder = folderAnalytics
        ? folderAnalytics.averageDocumentsPerFolder.toFixed(1)
        : '0.0';

    const formatConversationTitle = (conversation: Conversation) => {
        if (conversation.name && conversation.name.trim().length > 0) {
            return conversation.name;
        }
        if (conversation.participants && conversation.participants.length > 0) {
            return conversation.participants
                .map((participant) => `${participant.firstName} ${participant.lastName}`.trim())
                .join(', ');
        }
        return 'Conversation';
    };

    const renderChartContent = (prepared: PreparedChartData | null): React.ReactElement => {
        // Check if Chart.js components are available
        if (!Line || !Bar || !Pie) {
            return (
                <div className="flex h-full items-center justify-center text-sm text-red-500 dark:text-red-400">
                    Chart.js is not installed. Please run: npm install chart.js react-chartjs-2
                </div>
            );
        }

        // Build chart config from series
        if (!prepared || !prepared.data || prepared.data.length === 0) {
            return (
                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No chart data available yet. Try collaborating or starting new chats to generate insights.
                </div>
            );
        }

        try {
            switch (chartType) {
                case 'line': {
                    const labels = prepared.data.map((item) => item.date ?? '');
                    const seriesList = prepared.series && prepared.series.length > 0 ? prepared.series : DEFAULT_LINE_SERIES;
                    const datasets = seriesList.map((series) => ({
                        label: series.label,
                        data: prepared.data.map((item) => Number(item[series.key] ?? 0)),
                        borderColor: series.color,
                        backgroundColor: series.color,
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false,
                    }));

                    const options: ChartOptions<'line'> = {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: CHART_TEXT_COLOR,
                                    boxWidth: 12,
                                    boxHeight: 12,
                                },
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                            },
                        },
                        scales: {
                            x: {
                                ticks: { color: CHART_TEXT_COLOR },
                                grid: { color: CHART_GRID_COLOR },
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { color: CHART_TEXT_COLOR },
                                grid: { color: CHART_GRID_COLOR },
                            },
                        },
                    };

                    return <Line data={{ labels, datasets }} options={options} />;
                }
                case 'bar': {
                    const labels = prepared.data.map((item) => item.name ?? '');
                    const seriesList = prepared.series && prepared.series.length > 0
                        ? prepared.series
                        : [{ key: 'value', label: 'Value', color: '#3b82f6' }];
                    const datasets = seriesList.map((series) => ({
                        label: series.label,
                        data: prepared.data.map((item) => Number(item[series.key] ?? 0)),
                        backgroundColor: series.color,
                        borderRadius: 8,
                        maxBarThickness: 48,
                    }));

                    const options: ChartOptions<'bar'> = {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: CHART_TEXT_COLOR,
                                    boxWidth: 12,
                                    boxHeight: 12,
                                },
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                            },
                        },
                        scales: {
                            x: {
                                ticks: { color: CHART_TEXT_COLOR },
                                grid: { color: CHART_GRID_COLOR },
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { color: CHART_TEXT_COLOR },
                                grid: { color: CHART_GRID_COLOR },
                            },
                        },
                    };

                    return <Bar data={{ labels, datasets }} options={options} />;
                }
                case 'pie':
                default: {
                    const labels = prepared.data.map((item) => item.name ?? '');
                    const values = prepared.data.map((item) => Number(item.value ?? 0));
                    const dataset = {
                        label: 'Share',
                        data: values.length > 0 ? values : [1],
                        backgroundColor: prepared.data.map((_, index) => COLORS[index % COLORS.length]),
                        borderColor: CHART_BORDER_COLOR,
                        borderWidth: 1,
                    };

                    const options: ChartOptions<'pie'> = {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: CHART_TEXT_COLOR,
                                    boxWidth: 12,
                                    boxHeight: 12,
                                },
                            },
                            tooltip: {
                                mode: 'nearest',
                                intersect: false,
                            },
                        },
                    };

                    return <Pie data={{ labels, datasets: [dataset] }} options={options} />;
                }
            }
        } catch (error) {
            console.error('Error rendering chart:', error);
            return (
                <div className="flex h-full items-center justify-center text-sm text-red-500 dark:text-red-400">
                    Error rendering chart. Please check the console for details.
                </div>
            );
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">No analytics data available</p>
                    <Button onClick={fetchData} className="mt-4">Try Again</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analytics Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400">Live collaboration and productivity insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/business-analytics">
                            <Button variant="outline">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Business Analytics
                            </Button>
                        </Link>
                        <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={handleExport} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Folders</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{folderAnalytics?.totalFolders || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">{folderAnalytics?.totalSharedFolders || 0} shared</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                            <Folder className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Documents</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{folderAnalytics?.totalDocuments || analyticsData.totalDocuments}</p>
                            <p className="text-xs text-gray-500 mt-1">Avg: {averageDocumentsPerFolder} per folder</p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Versions Today</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analyticsData.versionsCreatedToday}</p>
                            <p className="text-xs text-gray-500 mt-1">{analyticsData.versionsCreatedThisWeek} this week</p>

                        </div>
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                            <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Editors</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analyticsData.activeEditors}</p>
                            <p className="text-xs text-gray-500 mt-1">Collaborating now</p>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                            <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Chart Controls */}
            <Card className="p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Analytics Chart</h2>
                    <div className="flex gap-2 mt-2 md:mt-0">
                        <Button
                            onClick={() => setChartType('line')}
                            variant={chartType === 'line' ? 'default' : 'outline'}
                            size="sm"
                        >
                            Trends
                        </Button>


                        <Button
                            onClick={() => setChartType('pie')}
                            variant={chartType === 'pie' ? 'default' : 'outline'}
                            size="sm"
                        >
                            Distribution
                        </Button>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[400px] w-full">
                    {chartData && chartData.data && Array.isArray(chartData.data) && chartData.data.length > 0 ? (
                        <>{renderChartContent(chartData)}</>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                            No chart data available yet. Try collaborating or starting new chats to generate insights.
                        </div>
                    )}
                </div>
            </Card>

            {/* Folder Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Documents per Folder Chart */}
                {projectOverview && projectOverview.length > 0 && (
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Documents per Folder</h2>
                        </div>
                        <div className="h-[300px] w-full">
                            {projectOverview && projectOverview.length > 0 ? (
                                (() => {
                                    const topFolders = projectOverview.slice(0, 10);
                                    const chartData = {
                                        labels: topFolders.map((folder) => folder.folderName),
                                        datasets: [
                                            {
                                                label: 'Documents',
                                                data: topFolders.map((folder) => folder.totalDocuments),
                                                backgroundColor: '#3b82f6',
                                                borderRadius: 8,
                                                maxBarThickness: 48,
                                            },
                                        ],
                                    };
                                    const chartOptions: ChartOptions<'bar'> = {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                labels: {
                                                    color: CHART_TEXT_COLOR,
                                                    boxWidth: 12,
                                                    boxHeight: 12,
                                                },
                                            },
                                            tooltip: {
                                                mode: 'index',
                                                intersect: false,
                                            },
                                        },
                                        scales: {
                                            x: {
                                                ticks: { color: CHART_TEXT_COLOR, maxRotation: 0, minRotation: 0 },
                                                grid: { color: CHART_GRID_COLOR },
                                            },
                                            y: {
                                                beginAtZero: true,
                                                ticks: { color: CHART_TEXT_COLOR },
                                                grid: { color: CHART_GRID_COLOR },
                                            },
                                        },
                                    };
                                    return <Bar data={chartData} options={chartOptions} />;
                                })()
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                                    No folder data available
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Most Active Folders */}
                {folderAnalytics && folderAnalytics.mostActiveFolders.length > 0 && (
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Active Folders</h2>
                        <div className="space-y-3">
                            {folderAnalytics.mostActiveFolders.map((folder, index) => (
                                <div key={folder.folderId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{folder.folderName}</p>
                                            <p className="text-xs text-gray-500">{folder.recentDocuments} recent documents</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">{folder.totalDocuments}</p>
                                        <p className="text-xs text-gray-500">documents</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Folder Statistics Table */}
            {folderAnalytics && folderAnalytics.folderStats.length > 0 && (
                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Folder Statistics</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Folder Name</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Total Documents</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Recent (7d)</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Comments</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Collaborators</th>
                                    <th className="text-center p-3 text-sm font-medium text-gray-600 dark:text-gray-400">Shared With</th>
                                </tr>
                            </thead>
                            <tbody>
                                {folderAnalytics.folderStats.slice(0, 10).map((folder) => (
                                    <tr key={folder.folderId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="p-3">
                                            <Link to={`/folders/${folder.folderId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                {folder.folderName}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-center text-gray-900 dark:text-gray-100">{folder.totalDocuments}</td>
                                        <td className="p-3 text-center text-green-600 dark:text-green-400">{folder.recentDocuments}</td>
                                        <td className="p-3 text-center text-gray-600 dark:text-gray-400">{folder.totalComments}</td>
                                        <td className="p-3 text-center text-purple-600 dark:text-purple-400">{folder.activeCollaborators}</td>
                                        <td className="p-3 text-center text-orange-600 dark:text-orange-400">{folder.sharedWith}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Additional Insights */}

        </div>
    );
}

