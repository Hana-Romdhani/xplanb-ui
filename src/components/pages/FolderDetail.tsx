import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FileText, Plus, ChevronRight, Home, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { foldersApi, Folder } from '../../api/folders';
import { documentsApi, Document } from '../../api/documents';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { getInitials } from '../../lib/utils';
import { API_URL } from '../../lib/config';

export default function FolderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollaboratorsDialog, setShowCollaboratorsDialog] = useState(false);

  const loadFolderAndDocuments = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Load folder details
      const folderData = await foldersApi.getById(id);
      setFolder(folderData);

      // Load documents in folder
      const docsData = await documentsApi.getByFolderId(id);
      setDocuments(docsData);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load folder:', error);
      toast.error('Failed to load folder');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    loadFolderAndDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCreateDocument = async () => {
    if (!id) return;

    try {
      // Create document directly in this folder
      const newDoc = await documentsApi.create({
        Title: 'Untitled Document',
        folderId: id,
      });
      toast.success('Document created successfully');
      navigate(`/documents/${newDoc._id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document');
    }
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Folder not found</p>
          <Button onClick={() => navigate('/folders')} className="mt-4 rounded-xl">
            Back to Folders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">
                <Home className="w-4 h-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="w-4 h-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/folders">Folders</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="w-4 h-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{folder.Name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-[24px] mb-1 font-semibold">{folder.Name}</h1>
            <p className="text-muted-foreground">{documents.length} documents</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Compact Collaborators */}
          {folder.sharedWith && folder.sharedWith.length > 0 && (
            <>
              <div
                onClick={() => setShowCollaboratorsDialog(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-[12px] text-muted-foreground mr-1">Collaborators:</span>
                <div className="flex items-center gap-1.5">
                  {folder.sharedWith.slice(0, 3).map((user) => {
                    const fullName = `${user.firstName} ${user.lastName}`;
                    const initials = getInitials(user.firstName, user.lastName);
                    const avatarUrl = user.avatar || user.picture;

                    return (
                      <Avatar key={user._id} className="w-7 h-7 border-2 border-white dark:border-gray-800">
                        <AvatarImage
                          src={avatarUrl ?
                            (avatarUrl.startsWith('http')
                              ? avatarUrl
                              : `${API_URL.replace('/api', '')}${avatarUrl}`)
                            : undefined
                          }
                          alt={fullName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {folder.sharedWith.length > 3 && (
                    <span className="text-[11px] text-muted-foreground ml-1">
                      +{folder.sharedWith.length - 3}
                    </span>
                  )}
                </div>
              </div>
              <Dialog open={showCollaboratorsDialog} onOpenChange={setShowCollaboratorsDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Collaborators</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {folder.sharedWith.map((user) => {
                      const fullName = `${user.firstName} ${user.lastName}`;
                      const initials = getInitials(user.firstName, user.lastName);
                      const avatarUrl = user.avatar || user.picture;

                      return (
                        <div
                          key={user._id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage
                              src={avatarUrl ?
                                (avatarUrl.startsWith('http')
                                  ? avatarUrl
                                  : `${API_URL.replace('/api', '')}${avatarUrl}`)
                                : undefined
                              }
                              alt={fullName}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Button className="rounded-xl" onClick={handleCreateDocument}>
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card className="p-12 rounded-xl text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">Create your first document to get started</p>
          <Button onClick={handleCreateDocument} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Create Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Link key={doc._id} to={`/documents/${doc._id}`}>
              <Card className="p-5 rounded-xl hover:shadow-lg transition-shadow group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <h3 className="mb-2 line-clamp-2 font-medium">{doc.Title}</h3>

                {doc.contentType && doc.contentType.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {doc.contentType.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-[12px] rounded-lg">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-[14px] text-muted-foreground">
                  Modified {new Date(doc.updatedDate).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
