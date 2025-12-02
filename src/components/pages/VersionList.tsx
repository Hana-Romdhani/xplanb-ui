/**
 * VersionList Component
 * 
 * Composant pour afficher et gérer les versions d'un document
 * Permet de lister, prévisualiser et restaurer des versions antérieures
 * 
 * Emplacement: src/components/documents/VersionList/VersionList.tsx
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, RotateCcw, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface VersionListProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestore?: (versionId: string) => void;
}

interface DocumentVersion {
  _id: string;
  version: number;
  content: any;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  description?: string;
  createdAt: string;
}

const VersionList: React.FC<VersionListProps> = ({
  documentId,
  isOpen,
  onClose,
  onVersionRestore,
}) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Récupérer les versions du document
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch versions');
      return response.json();
    },
    enabled: isOpen && !!documentId,
  });

  // Restaurer une version
  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to restore version');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      onVersionRestore?.(selectedVersion?._id || '');
      onClose();
    },
  });

  // Supprimer une version
  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete version');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
    },
  });

  // Gérer la restauration d'une version
  const handleRestoreVersion = (version: DocumentVersion) => {
    if (confirm(`Are you sure you want to restore version ${version.version}? This will create a new version with the current content.`)) {
      setSelectedVersion(version);
      restoreVersionMutation.mutate(version._id);
    }
  };

  // Gérer la suppression d'une version
  const handleDeleteVersion = (versionId: string) => {
    if (confirm('Are you sure you want to delete this version?')) {
      deleteVersionMutation.mutate(versionId);
    }
  };

  // Prévisualiser une version
  const handlePreviewVersion = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setIsPreviewOpen(true);
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Obtenir la couleur du badge selon le type de version
  const getVersionBadgeColor = (version: DocumentVersion) => {
    if (version.description?.includes('Auto-saved')) {
      return 'bg-gray-100 text-gray-800';
    }
    if (version.description?.includes('Manual')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (version.description?.includes('restore')) {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-green-100 text-green-800';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Versions</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading versions...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No versions available
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {versions.map((version: DocumentVersion) => (
                    <div
                      key={version._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Version {version.version}</span>
                            <Badge className={getVersionBadgeColor(version)}>
                              {version.description || 'Manual save'}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          Created by {version.createdBy.firstName} {version.createdBy.lastName} • {formatDate(version.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewVersion(version)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(version)}
                          disabled={restoreVersionMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVersion(version._id)}
                          disabled={deleteVersionMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de prévisualisation */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              Preview Version {selectedVersion?.version}
            </DialogTitle>
          </DialogHeader>

          {selectedVersion && (
            <div className="space-y-4">
              <div className="text-sm text-gray-500">
                Created by {selectedVersion.createdBy.firstName} {selectedVersion.createdBy.lastName} • {formatDate(selectedVersion.createdAt)}
              </div>

              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="prose max-w-none">
                  {selectedVersion.content?.blocks?.map((block: any, index: number) => (
                    <div key={index} className="mb-4">
                      {block.type === 'header' && (
                        <h1 className="text-2xl font-bold">{block.data.text}</h1>
                      )}
                      {block.type === 'paragraph' && (
                        <p>{block.data.text}</p>
                      )}
                      {block.type === 'list' && (
                        <ul className="list-disc pl-6">
                          {block.data.items.map((item: string, itemIndex: number) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {block.type === 'code' && (
                        <pre className="bg-gray-100 p-4 rounded">
                          <code>{block.data.code}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleRestoreVersion(selectedVersion);
                    setIsPreviewOpen(false);
                  }}
                  disabled={restoreVersionMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore This Version
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VersionList;
