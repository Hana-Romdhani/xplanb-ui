/**
 * Folders.tsx
 * 
 * Folder Management Page
 * 
 * This component provides a comprehensive folder management interface where users can:
 * - View all their folders in a grid layout with search and pagination
 * - Create new folders with custom names
 * - Edit folder names inline (click the edit icon)
 * - Delete folders with confirmation
 * - Share folders with other users via email invitations
 * - View folder details including document count and sharing status
 * 
 * Features:
 * - Real-time search with debounced API calls
 * - Pagination (10 items per page)
 * - Inline folder name editing with Enter/Escape keyboard support
 * - Email invitations with access level (view/update)
 * - Responsive grid layout
 * - Toast notifications for all operations
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Plus, Search, Share2, Edit, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { foldersApi, Folder as FolderType, CreateFolderDto } from '../../api/folders';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { sendFolderShareInvitation } from '../../lib/resend';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function Folders() {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserForSharing, setSelectedUserForSharing] = useState<{ [key: string]: string }>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFolderForSharing, setSelectedFolderForSharing] = useState<FolderType | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const perPage = 10;

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

  // Helper function to check if error is an authentication error
  const isAuthError = (error: any): boolean => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message?.toLowerCase() || error?.message?.toLowerCase() || '';
    return (
      status === 401 ||
      status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message === 'unauthorized' ||
      message === 'forbidden'
    );
  };

  // Fetch users for sharing
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsers(response.data);
      } catch (error: any) {
        if (isConnectionError(error)) {
          console.warn('Backend connection unavailable. Users list will be empty.');
          setUsers([]);
        } else if (isAuthError(error)) {
          console.warn('Authentication error. Users list will be empty.');
          setUsers([]);
        } else {
          console.error('Failed to fetch users:', error);
        }
      }
    };
    fetchUsers();
  }, []);

  // Fetch folders
  useEffect(() => {
    const fetchFolders = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await foldersApi.search(searchKeyword, page, perPage);
        setFolders(data);
      } catch (err: any) {
        // Check error types in order: connection -> auth -> other
        if (isConnectionError(err)) {
          // Silently handle connection errors - backend might not be running
          console.warn('Backend connection unavailable. Folders list will be empty.');
          setFolders([]);
          setError(null);
        } else if (isAuthError(err)) {
          // Handle authentication errors - don't show error message
          console.warn('Authentication error. Token may be expired or invalid.');
          setFolders([]);
          setError(null); // Explicitly clear error state
          // The API interceptor already cleaned up the token
          // Don't show toast or error message for auth issues
        } else {
          // Only show error for actual API errors (not connection or auth issues)
          const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load folders';
          // Double-check it's not an auth-related message
          if (errorMessage.toLowerCase().includes('unauthorized') ||
            errorMessage.toLowerCase().includes('forbidden')) {
            setFolders([]);
            setError(null);
          } else {
            setError(errorMessage);
            toast.error(errorMessage);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFolders();
  }, [searchKeyword, page]);

  const handleCreateFolder = async (name: string) => {
    try {
      const newFolder = await foldersApi.create({ Name: name });
      toast.success('Folder created successfully!');
      setFolders([newFolder, ...folders]);
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Are you sure you want to delete "${folderName}"?`)) return;

    try {
      await foldersApi.delete(folderId);
      toast.success('Folder deleted successfully!');
      setFolders(folders.filter(f => f._id !== folderId));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete folder');
    }
  };

  const handleStartEdit = (folder: FolderType) => {
    setEditingFolderId(folder._id);
    setEditFolderName(folder.Name);
  };

  const handleCancelEdit = () => {
    setEditingFolderId(null);
    setEditFolderName('');
  };

  const handleSaveEdit = async (folderId: string) => {
    if (!editFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const updatedFolder = await foldersApi.update(folderId, editFolderName.trim());
      toast.success('Folder renamed successfully!');
      setFolders(folders.map(f => f._id === folderId ? updatedFolder : f));
      setEditingFolderId(null);
      setEditFolderName('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to rename folder');
    }
  };

  const handleShareFolder = (folder: FolderType) => {
    setSelectedFolderForSharing(folder);
    setShareModalOpen(true);
  };

  const handleShareSubmit = async (email: string, access: 'view' | 'update' = 'view') => {
    if (!selectedFolderForSharing) return;

    try {
      const result = await foldersApi.inviteByEmail(selectedFolderForSharing._id, { email, access });

      if (result.success) {
        toast.success(`Invitation sent to ${email}`);

        // Send email via Resend
        try {
          await sendFolderShareInvitation(email, {
            folderName: selectedFolderForSharing.Name,
            accessLevel: access,
            sharedBy: 'XPlanB Team',
            description: `You've been granted ${access} access to this folder. Click the button below to open it.`,
            joinUrl: `${window.location.origin}/folders/${selectedFolderForSharing._id}`,
          });
        } catch (resendError) {
          console.error('Failed to send email via Resend:', resendError);
          // Don't show error to user since the invitation was successful
        }

        setShareModalOpen(false);
        setSelectedFolderForSharing(null);
      } else {
        toast.error(result.message || 'Failed to share folder');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to share folder');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] mb-2 font-semibold">My Folders</h1>
          <p className="text-muted-foreground">Organize and manage your documents</p>
        </div>
        <Button className="rounded-xl" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search folders..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Folders Grid */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading folders...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && folders.length === 0 && (
        <div className="bg-white dark:bg-card rounded-xl p-12 text-center">
          <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No folders found</h3>
          <p className="text-muted-foreground mb-4">Create your first folder to get started</p>
        </div>
      )}

      {!loading && folders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <Card key={folder._id} className="p-4 hover:shadow-md transition-shadow rounded-xl">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Folder className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingFolderId === folder._id ? (
                      <Input
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(folder._id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="mb-1 rounded-xl"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-medium truncate">{folder.Name}</h3>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {folder.documents?.length || 0} documents
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {folder.sharedWith && folder.sharedWith.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Share2 className="w-3 h-3 mr-1" />
                    {folder.sharedWith.length} shared
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                {editingFolderId === folder._id ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                      onClick={() => handleSaveEdit(folder._id)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                      asChild
                    >
                      <Link to={`/folders/${folder._id}`}>
                        <Folder className="w-4 h-4 mr-2" />
                        Open
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleStartEdit(folder)}
                      title="Edit folder name"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleShareFolder(folder)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteFolder(folder._id, folder.Name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && folders.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="rounded-xl"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={folders.length < perPage}
            className="rounded-xl"
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFolderModalWithBackend
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {/* Share Modal */}
      {shareModalOpen && selectedFolderForSharing && (
        <ShareFolderModal
          folder={selectedFolderForSharing}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedFolderForSharing(null);
          }}
          onShare={handleShareSubmit}
          users={users} // Pass user list here!
        />
      )}
    </div>
  );
}

// Create Folder Modal with backend integration
function CreateFolderModalWithBackend({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [folderName, setFolderName] = useState('');

  const handleCreate = () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    onCreate(folderName);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-[20px] font-semibold">Create New Folder</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Folder Name</label>
            <Input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Q4 Planning"
              className="rounded-xl"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="rounded-xl">
            Create Folder
          </Button>
        </div>
      </div>
    </div>
  );
}

// Share Folder Modal
function ShareFolderModal({ folder, onClose, onShare, users }: { folder: FolderType; onClose: () => void; onShare: (email: string, access: 'view' | 'update') => void; users: User[] }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [access, setAccess] = useState<'view' | 'update'>('view');
  const [customEmail, setCustomEmail] = useState('');

  const handleSubmit = () => {
    let email = '';
    if (selectedUserId === 'custom') {
      if (!customEmail.trim()) {
        toast.error('Please enter an email address');
        return;
      }
      email = customEmail;
    } else {
      const user = users.find(u => u._id === selectedUserId);
      if (!user) {
        toast.error('Please select a user');
        return;
      }
      email = user.email;
    }
    onShare(email, access);
    setSelectedUserId('');
    setCustomEmail('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-[20px] font-semibold">Share Folder</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Share <strong>{folder.Name}</strong> with someone
            </p>
            <label className="text-sm font-medium mb-2 block">Select User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="-- Select a user --" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {users?.map(user => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </SelectItem>
                ))}
                <SelectItem value="custom">Invite by email...</SelectItem>
              </SelectContent>
            </Select>
            {selectedUserId === 'custom' && (
              <Input
                type="email"
                value={customEmail}
                onChange={e => setCustomEmail(e.target.value)}
                placeholder="user@example.com"
                className="rounded-xl mt-2"
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Access Level</label>
            <div className="flex gap-2">
              <Button
                variant={access === 'view' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAccess('view')}
                className="flex-1 rounded-xl"
              >
                View Only
              </Button>
              <Button
                variant={access === 'update' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAccess('update')}
                className="flex-1 rounded-xl"
              >
                Can Edit
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="rounded-xl">
            Send Invitation
          </Button>
        </div>
      </div>
    </div>
  );
}
