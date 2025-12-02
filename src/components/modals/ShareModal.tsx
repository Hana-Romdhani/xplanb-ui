import { useState, useEffect } from 'react';
import { X, Mail, Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner';
import { documentsApi } from '../../api/documents';
import { foldersApi } from '../../api/folders';
import { sendDocumentShareInvitation } from '../../lib/resend';
import { sendFolderShareInvitation } from '../../lib/resend';

interface ShareModalProps {
  itemName: string;
  itemType: 'document' | 'folder';
  itemId: string;
  onClose: () => void;
}

interface SharedUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  access?: string;
}

export default function ShareModal({ itemName, itemType, itemId, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');
  // For documents: only 'view' | 'edit', for folders: 'view' | 'update' | 'edit'
  const [access, setAccess] = useState<'view' | 'update' | 'edit'>(itemType === 'document' ? 'edit' : 'edit');
  const [copied, setCopied] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const shareLink = `${window.location.origin}/${itemType === 'document' ? 'documents' : 'folders'}/${itemId}`;

  useEffect(() => {
    const loadSharedUsers = async () => {
      try {
        if (itemType === 'document') {
          const users = await documentsApi.getSharedUsers(itemId);
          setSharedUsers(users);
        } else {
          // For folders, get the folder data which includes sharedWith
          const folder = await foldersApi.getById(itemId);
          setSharedUsers(folder.sharedWith || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to load shared users:', error);
        setLoading(false);
      }
    };

    loadSharedUsers();
  }, [itemId, itemType]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link. Please copy manually.');
    }
  };

  const handleInvite = async () => {
    if (!email || inviting) return;

    setInviting(true);
    try {
      // Call backend API to share
      let result;
      if (itemType === 'document') {
        // Documents only support 'view' or 'edit' - convert 'update' to 'edit'
        const docAccess = access === 'update' ? 'edit' : (access as 'view' | 'edit');
        result = await documentsApi.shareByEmail(itemId, email, docAccess);
      } else {
        result = await foldersApi.inviteByEmail(itemId, { email, access });
      }

      if (result.success) {
        toast.success(`Invitation sent to ${email}`);

        // Send email via Resend
        try {
          if (itemType === 'document') {
            await sendDocumentShareInvitation(email, {
              documentName: itemName,
              accessLevel: access,
              sharedBy: 'XPlanB Team',
              description: `You've been granted ${access} access to this document. Click the button below to open it.`,
              joinUrl: shareLink,
            });
          } else {
            await sendFolderShareInvitation(email, {
              folderName: itemName,
              accessLevel: access,
              sharedBy: 'XPlanB Team',
              description: `You've been granted ${access} access to this folder. Click the button below to open it.`,
              joinUrl: shareLink,
            });
          }
        } catch (resendError) {
          console.error('Failed to send email via Resend:', resendError);
          // Don't show error since the invitation was successful
        }

        // Reload shared users
        if (itemType === 'document') {
          const users = await documentsApi.getSharedUsers(itemId);
          setSharedUsers(users);
        } else {
          const folder = await foldersApi.getById(itemId);
          setSharedUsers(folder.sharedWith || []);
        }

        setEmail('');
      } else {
        toast.error(result.message || 'Failed to share');
      }
    } catch (error: any) {
      console.error('Failed to invite:', error);
      toast.error(error.message || 'Failed to share');
    } finally {
      setInviting(false);
    }
  };

  const handleAccessChange = async (userId: string, newAccess: string) => {
    try {
      if (newAccess === 'remove') {
        // Remove user from sharing
        if (itemType === 'document') {
          await documentsApi.unshare(itemId, userId);
        } else {
          // For folders, use ignoreAccess if available
          await foldersApi.ignoreAccess?.(itemId, userId);
        }
        toast.success('User removed successfully');
      } else {
        // Update access level
        if (itemType === 'document') {
          // Documents only support 'view' or 'edit'
          const docAccess = newAccess === 'update' ? 'edit' : (newAccess as 'view' | 'edit');
          await documentsApi.share(itemId, userId, docAccess);
        } else {
          await foldersApi.assignAccess(itemId, userId, newAccess);
        }
        toast.success('Access updated successfully');
      }

      // Reload shared users
      if (itemType === 'document') {
        const users = await documentsApi.getSharedUsers(itemId);
        setSharedUsers(users);
      } else {
        const folder = await foldersApi.getById(itemId);
        setSharedUsers(folder.sharedWith || []);
      }
    } catch (error) {
      console.error('Failed to update access:', error);
      toast.error('Failed to update access');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center p-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close if clicking the backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Share "{itemName}"</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Invite People */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Invite people</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !inviting && handleInvite()}
                  className="flex-1"
                  disabled={inviting}
                />
                <Select value={access} onValueChange={(v) => setAccess(v as 'view' | 'update' | 'edit')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Viewer</SelectItem>
                    {itemType === 'folder' && <SelectItem value="update">Update</SelectItem>}
                    <SelectItem value="edit">Edit</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={inviting || !email}>
                  <Mail className="w-4 h-4 mr-2" />
                  {inviting ? 'Inviting...' : 'Invite'}
                </Button>
              </div>
            </div>
          </div>

          {/* People with access */}
          <div className="space-y-3">
            <Label>People with access</Label>
            <div className="space-y-2">
              {sharedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users have access yet
                </p>
              ) : (
                sharedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-foreground">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <Select
                      value={user.access || 'view'}
                      onValueChange={(newAccess) => handleAccessChange(user._id, newAccess)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">Viewer</SelectItem>
                        {itemType === 'folder' && <SelectItem value="update">Update</SelectItem>}
                        <SelectItem value="edit">Edit</SelectItem>
                        <SelectItem value="remove">Remove</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Share link - only for folders */}
          {itemType === 'folder' && (
            <div className="space-y-3">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-gray-50 dark:bg-gray-800"
                />
                <Button onClick={handleCopyLink} variant="outline">
                  {copied ? (
                    <Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Anyone with this link can view this folder
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border bg-gray-50 dark:bg-gray-800">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
