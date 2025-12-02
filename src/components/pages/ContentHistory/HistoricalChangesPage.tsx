import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommitHorizontal, History, MousePointerClick, Calendar, User, Clock, ArrowLeft, Download, RotateCcw, X, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getDocumentVersions } from "@/services/versionService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

export default function HistoricalChangesPage() {
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
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decodedToken = jwtDecode<{ id: string }>(token);
      setUserId(decodedToken.id);
    }
  }, [userId]);

  // Fetch all document versions
  const { data: versions, isLoading: versionsLoading, error: versionsError } = useQuery({
    queryKey: ['documentVersions', id],
    queryFn: () => getDocumentVersions(id || ""),
    enabled: !!id,
  });


  // Set first version as selected by default
  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[0]);
    }
  }, [versions, selectedVersion]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      fullDate: date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const toggleVersionExpansion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/documents/${id}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore version');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Version Restored",
        description: `Successfully restored version ${selectedVersion?.version}. Redirecting to editor...`,
        duration: 3000,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['documentVersions', id] });
      queryClient.invalidateQueries({ queryKey: ['editor', id] });
      
      // Navigate back to the editor after a short delay
      setTimeout(() => {
        navigate(`/editor/${id}`);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error restoring version:', error);
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore version. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRestoring(false);
    },
  });

  const handleRestore = async (version: DocumentVersion) => {
    if (!version || !version._id) {
      toast({
        title: "Invalid Version",
        description: "Cannot restore this version. Version data is missing.",
        variant: "destructive",
      });
      return;
    }

    // Confirm restoration
    const confirmed = window.confirm(
      `Are you sure you want to restore version ${version.version}?\n\n` +
      `This will create a backup of the current version and restore the selected version.\n` +
      `Description: ${version.description || 'No description'}\n` +
      `Created: ${formatDate(version.createdAt).fullDate}`
    );

    if (!confirmed) {
      return;
    }

    setIsRestoring(true);
    setSelectedVersion(version);
    
    try {
      await restoreVersionMutation.mutateAsync(version._id);
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const handleDownload = (version: DocumentVersion) => {
    // TODO: Implement download functionality
    console.log("Download functionality to be implemented for version:", version.version);
  };

  const handleViewVersion = (version: DocumentVersion) => {
    setSelectedVersion(version);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex">
      <SideBar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
          <Link
                  to={`/editor/${id}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="font-medium">Back to Editor</span>
          </Link>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <History className="h-5 w-5 text-white" />
            </div>
            <div>
                    <h1 className="text-xl font-bold text-gray-900">Document History</h1>
                    <p className="text-sm text-gray-500">
                      {versions ? `${versions.length} versions available` : 'Loading versions...'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="date" 
                    placeholder="Filter by date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 w-48"
                  />
                </div>
                
                {selectedVersion && (
                  <Button 
                    onClick={() => handleDownload(selectedVersion)}
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                </Button>
                )}
                
                {selectedVersion && (
                  <Button 
                    onClick={() => handleRestore(selectedVersion)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore Version
                </Button>
                )}
              </div>
            </div>
        </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {versionsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading versions...</span>
                </div>
              ) : versionsError ? (
                <Card className="shadow-lg border-0 bg-white">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <X className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Versions</h3>
                    <p className="text-gray-500 mb-6">
                      Failed to load document versions. Please try again.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              ) : versions && versions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Versions List */}
                  <div className="lg:col-span-1">
                    <Card className="shadow-lg border-0 bg-white">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                        <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <GitCommitHorizontal className="h-5 w-5" />
                          Version History
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-96">
                          <div className="space-y-1">
                            {versions.map((version: DocumentVersion, index: number) => (
                              <div
                                key={version._id}
                                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                                  selectedVersion?._id === version._id 
                                    ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => handleViewVersion(version)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                      index === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      v{version.version}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {version.description || `Version ${version.version}`}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatDate(version.createdAt).fullDate}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleVersionExpansion(version._id);
                                      }}
                                    >
                                      {expandedVersions.has(version._id) ? 
                                        <ChevronDown className="h-4 w-4" /> : 
                                        <ChevronRight className="h-4 w-4" />
                                      }
                                    </Button>
                                  </div>
                                </div>
                                
                                {expandedVersions.has(version._id) && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                      <User className="h-4 w-4" />
                                      <span>{version.createdBy.firstName} {version.createdBy.lastName}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewVersion(version);
                                        }}
                                        className="flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRestore(version);
                                        }}
                                        disabled={isRestoring}
                                        className="flex items-center gap-1"
                                      >
                                        {isRestoring && selectedVersion?._id === version._id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                                            Restoring...
                                          </>
                                        ) : (
                                          <>
                                            <RotateCcw className="h-3 w-3" />
                                            Restore
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Selected Version Preview */}
                  <div className="lg:col-span-2">
                    {selectedVersion ? (
                      <Card className="shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <GitCommitHorizontal className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold text-gray-900">
                                  {selectedVersion.description || `Version ${selectedVersion.version}`}
                                </CardTitle>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(selectedVersion.createdAt).time}
                                  </div>
                                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border border-gray-300 text-gray-700">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(selectedVersion.createdAt).date}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  {selectedVersion.createdBy.firstName} {selectedVersion.createdBy.lastName}
                                </p>
                                <p className="text-sm text-gray-500">Created by</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MousePointerClick className="h-4 w-4" />
                              <span>Content preview</span>
                            </div>
                            
                            <Separator />
                            
                            <ScrollArea className="h-96 w-full rounded-lg border border-gray-200 bg-gray-50">
                              <div className="p-6">
                                <div 
                                  className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                                  dangerouslySetInnerHTML={{ 
                                    __html: selectedVersion.content?.htmlContent || 
                                    (typeof selectedVersion.content === 'string' ? 
                                      selectedVersion.content.replace(/\n/g, '<br>') : 
                                      'No content available')
                                  }}
                                />
                              </div>
                            </ScrollArea>
                            
                            <div className="flex items-center justify-between pt-4">
                              <div className="text-sm text-gray-500">
                                Created: {formatDate(selectedVersion.createdAt).date} at {formatDate(selectedVersion.createdAt).time}
                              </div>
                              
                              <div className="flex gap-3">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.history.back()}
                                  className="flex items-center gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleRestore(selectedVersion)}
                                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Restore This Version
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="shadow-lg border-0 bg-white">
                        <CardContent className="p-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <Eye className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Version</h3>
                          <p className="text-gray-500 mb-6">
                            Choose a version from the list to view its content.
                          </p>
                        </CardContent>
                      </Card>
                      )}
                    </div>
                </div>
              ) : (
                <Card className="shadow-lg border-0 bg-white">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <History className="h-8 w-8 text-gray-400" />
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Found</h3>
                    <p className="text-gray-500 mb-6">
                      This document doesn't have any version history yet.
                    </p>
                    <Button asChild>
                      <Link to={`/editor/${id}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Editor
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
          </div>
      </div>
    </div>
  );
}
