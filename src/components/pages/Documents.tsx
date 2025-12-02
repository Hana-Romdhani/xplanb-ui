/**
 * Documents.tsx
 * 
 * Document Management and Browsing Page
 * 
 * Main document browsing interface with advanced filtering and organization:
 * 
 * Features:
 * - Dual view modes: Grid layout for visual browsing, List view for detailed information
 * - Search functionality across all documents
 * - Filter by document type (all, Word, Excel, PDF, etc.)
 * - Sort by modification date, name, or other criteria
 * - Group documents by folder with expandable sections
 * - Create new documents with folder assignment
 * - Navigate to document editor for editing
 * - Display document metadata (last modified, folder location)
 * 
 * Organization:
 * - Documents are grouped by folder for better organization
 * - Folders can be expanded/collapsed to show/hide documents
 * - Visual indicators for document types and status
 * - Quick access to document actions via context menu
 * 
 * User Experience:
 * - Responsive design adapting to screen size
 * - Loading states with skeletons
 * - Error handling with user-friendly messages
 * - Toast notifications for actions
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, LayoutGrid, LayoutList, Plus, Search, Star, Folder as FolderIcon, Loader2, MoreVertical, FolderInput } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { documentsApi, Document } from '../../api/documents';
import { foldersApi } from '../../api/folders';

interface DocumentWithFolder extends Document {
  folderName?: string;
  formattedModified?: string;
  collaboratorsCount?: number;
}

interface GroupedDocuments {
  [folderId: string]: {
    folderName: string;
    folderId: string | null;
    documents: DocumentWithFolder[];
  };
}

export default function Documents() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('modified');
  const [groupedDocuments, setGroupedDocuments] = useState<GroupedDocuments>({});
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Array<{ _id: string; Name: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
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
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
  };

  // Get current user ID
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

  // Fetch folders for document creation
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const foldersData = await foldersApi.getAll(1, 100);
        setAvailableFolders(foldersData);
        // Auto-select first folder if available and none selected
        if (foldersData.length > 0 && !selectedFolderId) {
          setSelectedFolderId(foldersData[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch folders:', error);
      }
    };
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch documents and folders
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch documents and folders in parallel
        const [docsData, foldersData] = await Promise.all([
          documentsApi.getAll(),
          foldersApi.getAll(1, 100) // Get all folders
        ]);

        // Create folder map for quick lookup
        const folderMap = new Map<string, typeof foldersData[0]>();
        foldersData.forEach(folder => {
          folderMap.set(folder._id, folder);
        });

        // Helper function to extract folderId string from populated or non-populated folderId
        const extractFolderId = (folderId: any): string | null => {
          if (!folderId) return null;
          if (typeof folderId === 'string') return folderId;
          if (typeof folderId === 'object' && folderId._id) {
            return String(folderId._id);
          }
          return String(folderId);
        };

        // Process documents with folder information
        const processedDocs: DocumentWithFolder[] = docsData.map(doc => {
          const folderIdString = extractFolderId(doc.folderId);
          const folder = folderIdString ? folderMap.get(folderIdString) : null;
          const collaboratorsCount = doc.sharedWith?.length || 0;

          // Ensure Title is always a valid string
          const documentTitle = doc.Title?.trim() || 'Untitled Document';

          // Replace error titles with default
          const finalTitle = documentTitle === 'Error Loading Document'
            ? 'Untitled Document'
            : documentTitle;

          if (documentTitle === 'Error Loading Document') {
            console.warn('Document with error title found, replacing with default:', doc._id);
          }

          return {
            ...doc,
            Title: finalTitle,
            folderId: folderIdString || undefined, // Ensure folderId is a string
            folderName: folder?.Name || 'Uncategorized',
            formattedModified: formatTimeAgo(doc.updatedDate || doc.createdDate),
            collaboratorsCount: collaboratorsCount,
          };
        });

        // Group documents by folder
        const grouped: GroupedDocuments = {};
        processedDocs.forEach(doc => {
          const folderId = doc.folderId || 'uncategorized';
          const folderName = doc.folderName || 'Uncategorized';

          if (!grouped[folderId]) {
            grouped[folderId] = {
              folderName,
              folderId: doc.folderId || null,
              documents: [],
            };
          }
          grouped[folderId].documents.push(doc);
        });

        // Sort documents within each folder
        Object.keys(grouped).forEach(folderId => {
          grouped[folderId].documents.sort((a, b) => {
            if (sortBy === 'modified') {
              return new Date(b.updatedDate || b.createdDate).getTime() -
                new Date(a.updatedDate || a.createdDate).getTime();
            } else if (sortBy === 'created') {
              return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
            } else {
              return a.Title.localeCompare(b.Title);
            }
          });
        });

        setGroupedDocuments(grouped);

        // Expand all folders by default
        setExpandedFolders(new Set(Object.keys(grouped)));
      } catch (error: any) {
        console.error('Failed to fetch documents:', error);
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sortBy]);

  // Filter and search documents
  const filteredGroupedDocuments: GroupedDocuments = {};

  Object.keys(groupedDocuments).forEach(folderId => {
    const folderGroup = groupedDocuments[folderId];
    const filtered = folderGroup.documents.filter(doc => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        doc.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.folderName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.contentType?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      // Type filter
      if (filterType === 'shared') {
        // Show documents that are shared with others
        return doc.sharedWith && doc.sharedWith.length > 0;
      }
      if (filterType === 'recent') {
        // Show documents modified in the last 7 days
        const daysSinceModified = (Date.now() - new Date(doc.updatedDate || doc.createdDate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceModified < 7;
      }
      if (filterType === 'archived') {
        // Show only archived documents
        return doc.archived === true;
      }
      // 'all' filter - show all non-archived documents by default
      if (filterType === 'all') {
        return doc.archived !== true;
      }

      return true;
    });

    if (filtered.length > 0) {
      filteredGroupedDocuments[folderId] = {
        ...folderGroup,
        documents: filtered,
      };
    }
  });

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleToggleFavorite = async (doc: DocumentWithFolder, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      toast.error('Please log in to favorite documents');
      return;
    }

    try {
      const isFavorited = doc.favoritedBy?.includes(currentUserId);

      if (isFavorited) {
        await documentsApi.unfavorite(doc._id);
        toast.success('Document removed from favorites');
      } else {
        await documentsApi.favorite(doc._id);
        toast.success('Document added to favorites');
      }

      // Refresh documents to update favorite status
      const docsData = await documentsApi.getAll();
      const foldersData = await foldersApi.getAll(1, 100);

      const folderMap = new Map<string, typeof foldersData[0]>();
      foldersData.forEach(folder => {
        folderMap.set(folder._id, folder);
      });

      const extractFolderId = (folderId: any): string | null => {
        if (!folderId) return null;
        if (typeof folderId === 'string') return folderId;
        if (typeof folderId === 'object' && folderId._id) {
          return String(folderId._id);
        }
        return String(folderId);
      };

      const processedDocs: DocumentWithFolder[] = docsData.map(doc => {
        const folderIdString = extractFolderId(doc.folderId);
        const folder = folderIdString ? folderMap.get(folderIdString) : null;
        const collaboratorsCount = doc.sharedWith?.length || 0;

        // Ensure Title is always a valid string
        const documentTitle = doc.Title?.trim() || 'Untitled Document';

        // Replace error titles with default
        const finalTitle = documentTitle === 'Error Loading Document'
          ? 'Untitled Document'
          : documentTitle;

        if (documentTitle === 'Error Loading Document') {
          console.warn('Document with error title found, replacing with default:', doc._id);
        }

        return {
          ...doc,
          Title: finalTitle,
          folderId: folderIdString || undefined,
          folderName: folder?.Name || 'Uncategorized',
          formattedModified: formatTimeAgo(doc.updatedDate || doc.createdDate),
          collaboratorsCount: collaboratorsCount,
        };
      });

      const grouped: GroupedDocuments = {};
      processedDocs.forEach(doc => {
        const folderId = doc.folderId || 'uncategorized';
        const folderName = doc.folderName || 'Uncategorized';

        if (!grouped[folderId]) {
          grouped[folderId] = {
            folderName,
            folderId: doc.folderId || null,
            documents: [],
          };
        }
        grouped[folderId].documents.push(doc);
      });

      Object.keys(grouped).forEach(folderId => {
        grouped[folderId].documents.sort((a, b) => {
          if (sortBy === 'modified') {
            return new Date(b.updatedDate || b.createdDate).getTime() -
              new Date(a.updatedDate || a.createdDate).getTime();
          } else if (sortBy === 'created') {
            return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
          } else {
            return a.Title.localeCompare(b.Title);
          }
        });
      });

      setGroupedDocuments(grouped);
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      toast.error(error?.response?.data?.message || 'Failed to update favorite status');
    }
  };

  const isDocumentFavorited = (doc: DocumentWithFolder): boolean => {
    if (!currentUserId || !doc.favoritedBy) return false;
    return doc.favoritedBy.includes(currentUserId);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading documents...</span>
        </div>
      </div>
    );
  }

  async function handleCreate() {
    if (!newDocName.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    if (!selectedFolderId) {
      toast.error('Please select a folder');
      return;
    }
    setCreatingDoc(true);
    try {
      const newDoc = await documentsApi.create({
        Title: newDocName,
        folderId: selectedFolderId
      });
      setShowCreateModal(false);
      setNewDocName('');
      setSelectedFolderId(availableFolders.length > 0 ? availableFolders[0]._id : '');
      setCreatingDoc(false);
      navigate(`/documents/${newDoc._id}`);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to create document';
      toast.error(errorMsg);
      setCreatingDoc(false);
    }
  }

  async function handleMoveDocument(documentId: string, newFolderId: string, currentFolderId: string) {
    if (newFolderId === currentFolderId) return;

    try {
      await documentsApi.update(documentId, { folderId: newFolderId });
      toast.success('Document moved successfully');

      // Force refresh by refetching all data
      setLoading(true);
      const [docsData, foldersData] = await Promise.all([
        documentsApi.getAll(),
        foldersApi.getAll(1, 100)
      ]);

      // Helper function to extract folderId string from populated or non-populated folderId
      const extractFolderId = (folderId: any): string | null => {
        if (!folderId) return null;
        if (typeof folderId === 'string') return folderId;
        if (typeof folderId === 'object' && folderId._id) {
          return String(folderId._id);
        }
        return String(folderId);
      };

      const folderMap = new Map<string, typeof foldersData[0]>();
      foldersData.forEach(folder => {
        folderMap.set(folder._id, folder);
      });

      const processedDocs: DocumentWithFolder[] = docsData.map(doc => {
        const folderIdString = extractFolderId(doc.folderId);
        const folder = folderIdString ? folderMap.get(folderIdString) : null;
        const collaboratorsCount = doc.sharedWith?.length || 0;

        // Ensure Title is always a valid string
        const documentTitle = doc.Title?.trim() || 'Untitled Document';

        // Replace error titles with default
        const finalTitle = documentTitle === 'Error Loading Document'
          ? 'Untitled Document'
          : documentTitle;

        return {
          ...doc,
          Title: finalTitle,
          folderId: folderIdString || undefined, // Ensure folderId is a string
          folderName: folder?.Name || 'Uncategorized',
          formattedModified: formatTimeAgo(doc.updatedDate || doc.createdDate),
          collaboratorsCount: collaboratorsCount,
        };
      });

      const grouped: GroupedDocuments = {};
      processedDocs.forEach(doc => {
        const folderId = doc.folderId || 'uncategorized';
        const folderName = doc.folderName || 'Uncategorized';

        if (!grouped[folderId]) {
          grouped[folderId] = {
            folderName,
            folderId: doc.folderId || null,
            documents: [],
          };
        }
        grouped[folderId].documents.push(doc);
      });

      Object.keys(grouped).forEach(folderId => {
        grouped[folderId].documents.sort((a, b) => {
          if (sortBy === 'modified') {
            return new Date(b.updatedDate || b.createdDate).getTime() -
              new Date(a.updatedDate || a.createdDate).getTime();
          } else if (sortBy === 'created') {
            return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
          } else {
            return a.Title.localeCompare(b.Title);
          }
        });
      });

      setGroupedDocuments(grouped);
      setExpandedFolders(new Set(Object.keys(grouped)));
      setLoading(false);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to move document';
      toast.error(errorMsg);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] mb-2">Documents</h1>
          <p className="text-muted-foreground">Manage and organize all your documents</p>
        </div>
        <Link to="/folders">
          <Button variant="outline" className="rounded-xl mr-2">
            <FolderIcon className="w-4 h-4 mr-2" />
            View Folders
          </Button>
        </Link>
        <Button className="rounded-xl" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4 rounded-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="recent">Recent (7 days)</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="modified">Last Modified</SelectItem>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-border rounded-xl">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-l-xl rounded-r-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-r-xl rounded-l-none"
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Documents Grouped by Folder */}
      {Object.keys(filteredGroupedDocuments).length === 0 ? (
        <Card className="p-12 text-center rounded-xl">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery
              ? 'No documents match your search'
              : filterType === 'shared'
                ? 'No shared documents found'
                : filterType === 'recent'
                  ? 'No recent documents found'
                  : filterType === 'archived'
                    ? 'No archived documents found'
                    : 'No documents found'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredGroupedDocuments).map(([folderId, group]) => {
            const isExpanded = expandedFolders.has(folderId);
            const folderLink = group.folderId ? `/folders/${group.folderId}` : '#';

            return (
              <div key={folderId} className="space-y-3">
                {/* Folder Header */}
                <div className="flex items-center justify-between">
                  <Link
                    to={folderLink}
                    className="flex items-center gap-2 group hover:text-primary transition-colors"
                  >
                    <FolderIcon className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">{group.folderName}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({group.documents.length} {group.documents.length === 1 ? 'document' : 'documents'})
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFolder(folderId)}
                    className="rounded-lg"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </div>

                {/* Documents in Folder */}
                {isExpanded && (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.documents.map((doc) => (
                        <div key={doc._id} className="relative">
                          <Link to={`/documents/${doc._id}`}>
                            <Card className="p-5 rounded-xl hover:shadow-lg transition-shadow group cursor-pointer h-full">
                              <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-lg -mt-1"
                                    onClick={(e) => handleToggleFavorite(doc, e)}
                                  >
                                    <Star className={`w-4 h-4 ${isDocumentFavorited(doc) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-lg -mt-1 -mr-1"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl w-56">
                                      <DropdownMenuLabel className="flex items-center gap-2">
                                        <FolderInput className="w-4 h-4" />
                                        Move to Folder
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {availableFolders.map((folder) => (
                                        <DropdownMenuItem
                                          key={folder._id}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleMoveDocument(doc._id, folder._id, doc.folderId || 'uncategorized');
                                          }}
                                          disabled={folder._id === doc.folderId}
                                          className="cursor-pointer"
                                        >
                                          <FolderIcon className="w-4 h-4 mr-2" />
                                          {folder.Name}
                                          {folder._id === doc.folderId && (
                                            <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                                          )}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              <h3 className="mb-2 line-clamp-2 font-semibold">{doc.Title || 'Untitled Document'}</h3>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {doc.contentType?.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[12px] rounded-lg">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>

                              <div className="flex items-center justify-between text-[14px] text-muted-foreground">
                                <span>{doc.formattedModified}</span>
                                <span>{doc.collaboratorsCount || 0} {doc.collaboratorsCount === 1 ? 'collaborator' : 'collaborators'}</span>
                              </div>
                            </Card>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card className="rounded-xl overflow-hidden">
                      <div className="divide-y divide-border">
                        {group.documents.map((doc) => (
                          <div
                            key={doc._id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                          >
                            <Link to={`/documents/${doc._id}`} className="flex items-center space-x-4 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="truncate font-medium">{doc.Title || 'Untitled Document'}</p>
                                </div>
                                <p className="text-[14px] text-muted-foreground">{group.folderName}</p>
                              </div>
                            </Link>

                            <div className="flex items-center space-x-6 text-[14px] text-muted-foreground">
                              <div className="flex gap-1.5">
                                {doc.contentType?.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[12px] rounded-lg">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <span className="w-32 text-right">{doc.formattedModified}</span>
                              <span className="w-32 text-right">
                                {doc.collaboratorsCount || 0} {doc.collaboratorsCount === 1 ? 'collaborator' : 'collaborators'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleToggleFavorite(doc, e)}
                              >
                                <Star className={`w-4 h-4 ${isDocumentFavorited(doc) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-56">
                                  <DropdownMenuLabel className="flex items-center gap-2">
                                    <FolderInput className="w-4 h-4" />
                                    Move to Folder
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {availableFolders.map((folder) => (
                                    <DropdownMenuItem
                                      key={folder._id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleMoveDocument(doc._id, folder._id, doc.folderId || 'uncategorized');
                                      }}
                                      disabled={folder._id === doc.folderId}
                                      className="cursor-pointer"
                                    >
                                      <FolderIcon className="w-4 h-4 mr-2" />
                                      {folder.Name}
                                      {folder._id === doc.folderId && (
                                        <span className="ml-auto text-xs text-muted-foreground">(current)</span>
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for new document */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-[20px] font-semibold">Create New Document</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setNewDocName(''); setSelectedFolderId(availableFolders.length > 0 ? availableFolders[0]._id : ''); }} className="rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Document Name</label>
                <Input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g., Q4 Planning"
                  className="rounded-xl"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Select Folder *</label>
                {availableFolders.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    No folders available. Please <Link to="/folders" className="text-primary hover:underline">create a folder</Link> first.
                  </div>
                ) : (
                  <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue placeholder="-- Select a folder --" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availableFolders.map((folder) => (
                        <SelectItem key={folder._id} value={folder._id}>
                          <div className="flex items-center gap-2">
                            <FolderIcon className="w-4 h-4" />
                            {folder.Name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[12px] text-muted-foreground mt-1">
                  All documents must belong to a folder
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end space-x-3">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); setNewDocName(''); setSelectedFolderId(availableFolders.length > 0 ? availableFolders[0]._id : ''); }} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="rounded-xl" disabled={creatingDoc || !newDocName.trim() || !selectedFolderId}>
                {creatingDoc ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
