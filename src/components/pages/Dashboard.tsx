import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Folder, Star, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { getDashboardStats, getFavoriteDocuments, FavoriteDocument } from '@/lib/services/dashboardService';
import { DashboardStats } from '@/lib/services/dashboardService';
import { getUserById } from '@/lib/services/userService';
import { documentsApi, Document } from '../../api/documents';
import { foldersApi } from '../../api/folders';
import { toast } from 'sonner';

interface RecentDocument {
  _id: string;
  Title: string;
  folderName?: string;
  updatedDate: string;
  folderId?: string;
}

export default function Dashboard() {
  const [userName, setUserName] = useState('John');
  const [stats, setStats] = useState<DashboardStats>({ totalDocuments: 0, totalFolders: 0, totalCollaborators: 0 });
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState<FavoriteDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add a fallback timeout in case data never loads
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 15000); // 15 second fallback

    loadDashboardData();

    return () => clearTimeout(timeout);
  }, []);

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

  // Load recent documents
  const loadRecentDocuments = async (): Promise<RecentDocument[]> => {
    try {
      // Fetch documents and folders
      const [docsData, foldersData] = await Promise.all([
        documentsApi.getAll(),
        foldersApi.getAll(1, 100)
      ]);

      // Create folder map for quick lookup
      const folderMap = new Map<string, typeof foldersData[0]>();
      foldersData.forEach(folder => {
        folderMap.set(folder._id, folder);
      });

      // Process documents with folder information and sort by updatedDate
      const processedDocs: RecentDocument[] = docsData
        .map(doc => {
          const folderIdString = typeof doc.folderId === 'string'
            ? doc.folderId
            : (doc.folderId as any)?._id?.toString();
          const folder = folderIdString ? folderMap.get(folderIdString) : null;

          return {
            _id: doc._id,
            Title: doc.Title || 'Untitled Document',
            folderName: folder?.Name || 'Uncategorized',
            updatedDate: doc.updatedDate || doc.createdDate,
            folderId: folderIdString || undefined,
          };
        })
        .filter(doc => !doc.Title.includes('Error Loading Document')) // Filter out error documents
        .sort((a, b) => {
          // Sort by updatedDate, most recent first
          return new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime();
        })
        .slice(0, 5); // Get top 5 most recent

      return processedDocs;
    } catch (error: any) {
      if (isConnectionError(error)) {
        console.warn('Backend connection unavailable. Returning empty recent documents.');
        return [];
      }
      throw error;
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Get user info from token
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
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
          setUserName(userData.firstName || 'User');
        } catch (error: any) {
          if (isConnectionError(error)) {
            console.warn('Backend connection unavailable. Using default user name.');
          } else {
            console.error('Failed to get user info:', error);
          }
        }
      }

      // Load all dashboard data with individual error handling
      const [dashboardStats, favoriteDocs, recentDocsResult] = await Promise.allSettled([
        getDashboardStats(),
        getFavoriteDocuments(),
        loadRecentDocuments()
      ]);

      if (dashboardStats.status === 'fulfilled') {
        setStats(dashboardStats.value);
      } else {
        const error = dashboardStats.reason;
        if (isConnectionError(error)) {
          console.warn('Backend connection unavailable. Dashboard stats will be empty.');
          setStats({ totalDocuments: 0, totalFolders: 0, totalCollaborators: 0 });
        } else {
          console.error('Failed to load stats:', error);
        }
      }

      if (recentDocsResult.status === 'fulfilled') {
        setRecentDocuments(recentDocsResult.value);
      } else {
        const error = recentDocsResult.reason;
        if (isConnectionError(error)) {
          console.warn('Backend connection unavailable. Recent documents will be empty.');
          setRecentDocuments([]);
        } else {
          console.error('Failed to load recent documents:', error);
        }
      }

      if (favoriteDocs.status === 'fulfilled') {
        setFavoriteDocuments(favoriteDocs.value);
      } else {
        const error = favoriteDocs.reason;
        if (isConnectionError(error)) {
          console.warn('Backend connection unavailable. Favorite documents will be empty.');
          setFavoriteDocuments([]);
        } else {
          console.error('Failed to load favorite documents:', error);
        }
      }
    } catch (error: any) {
      if (isConnectionError(error)) {
        console.warn('Backend connection unavailable. Dashboard will show empty state.');
      } else {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };


  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] mb-2">Welcome back, {userName}</h1>
        <p className="text-muted-foreground">Here's what's happening in your workspace today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-muted-foreground mb-1">Total Documents</p>
              <p className="text-[28px]">{stats.totalDocuments}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-muted-foreground mb-1">Active Folders</p>
              <p className="text-[28px]">{stats.totalFolders}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-purple-600">
              <Folder className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-muted-foreground mb-1">Collaborators</p>
              <p className="text-[28px]">{stats.totalCollaborators}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <Card className="lg:col-span-2 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px]">Recent Documents</h2>
            <Link to="/documents">
              <Button variant="ghost" size="sm" className="rounded-lg">
                View all
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <Link
                  key={doc._id}
                  to={`/documents/${doc._id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{doc.Title}</p>
                      <p className="text-[14px] text-muted-foreground truncate">
                        {doc.folderName || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-[14px] text-muted-foreground flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatTimeAgo(doc.updatedDate)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">No recent documents</p>
                <Link to="/documents">
                  <Button variant="outline" size="sm" className="rounded-xl mt-2">
                    Create your first document
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Favorites */}
        <Card className="p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px]">Favorites</h2>
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>

          <div className="space-y-3">
            {/* Favorite Documents */}
            {favoriteDocuments.length > 0 ? (
              <div className="space-y-2">
                {favoriteDocuments.map((doc) => (
                  <Link
                    key={doc._id}
                    to={`/documents/${doc._id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{doc.Title || 'Untitled Document'}</p>
                        <p className="text-[14px] text-muted-foreground">{doc.folderName || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-muted-foreground ml-2">
                      {formatTimeAgo(doc.updatedDate)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No favorite documents yet</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Link to="/documents" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl">
                View all documents
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 rounded-xl">
        <h2 className="text-[20px] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/documents/new">
            <Button className="rounded-xl">
              <FileText className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </Link>
          <Link to="/folders">
            <Button variant="outline" className="rounded-xl">
              <Folder className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline" className="rounded-xl">
              Start Conversation
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
