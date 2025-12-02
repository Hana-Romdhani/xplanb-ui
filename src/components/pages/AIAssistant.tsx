import { useState, useEffect, useMemo, useCallback } from 'react';
import { Send, Mic, Sparkles, FileText, Folder as FolderIcon, Search, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { openAiApi } from '../../api/openai';
import { documentsApi, Document } from '../../api/documents';
import { foldersApi, Folder } from '../../api/folders';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  time: string;
}

interface DocumentWithFolder extends Document {
  folderName?: string;
}

// Helper function to format markdown to HTML
const formatMarkdown = (text: string): string => {
  let formatted = text
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Bullet points
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // New lines
    .replace(/\n/g, '<br>');

  // Wrap lists in ul tags
  formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1">$1</ul>');

  return formatted;
};

export default function AIAssistant() {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [documents, setDocuments] = useState<DocumentWithFolder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>('');
  const [documentSearch, setDocumentSearch] = useState('');
  const [isContextSheetOpen, setIsContextSheetOpen] = useState(false);

  // Fetch documents and folders on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsData, foldersData] = await Promise.all([
          documentsApi.getAll(),
          foldersApi.getAll(1, 100)
        ]);

        // Create folder map for quick lookup
        const folderMap = new Map<string, typeof foldersData[0]>();
        foldersData.forEach(folder => {
          folderMap.set(folder._id, folder);
        });

        // Process documents with folder information
        const processedDocs: DocumentWithFolder[] = docsData.map(doc => {
          const folderIdString = typeof doc.folderId === 'string'
            ? doc.folderId
            : (doc.folderId as any)?._id?.toString?.() || '';
          const folder = folderIdString ? folderMap.get(folderIdString) : null;

          return {
            ...doc,
            folderId: folderIdString,
            folderName: folder?.Name || 'Uncategorized',
          };
        });

        setDocuments(processedDocs);
        setFolders(foldersData);
      } catch (error: any) {
        // Check if it's a connection error
        const isConnectionError =
          error?.code === 'ERR_NETWORK' ||
          error?.code === 'ECONNREFUSED' ||
          error?.message?.includes('ERR_CONNECTION_REFUSED') ||
          error?.message?.includes('Network Error') ||
          !error?.response;

        if (isConnectionError) {
          // Silently handle connection errors - backend might not be running
          console.warn('Backend connection unavailable. AI Assistant will work without document context.');
          // Set empty arrays so the component still works
          setDocuments([]);
          setFolders([]);
        } else {
          // Only show error for actual API errors (not connection issues)
          console.error('Failed to fetch documents and folders:', error);
          const errorMessage = error?.response?.data?.message || 'Failed to load documents';
          toast.error(errorMessage);
        }
      }
    };

    fetchData();
  }, []);

  const folderNameById = useCallback(
    (folderId: string) => folders.find(f => f._id === folderId)?.Name || 'Uncategorized',
    [folders]
  );

  const handleFolderSelect = useCallback((value: string) => {
    setDocumentSearch('');
    if (value === 'all') {
      setActiveFolderId('');
      return;
    }

    setActiveFolderId(value);
    setSelectedFolderIds(prev => (prev.includes(value) ? prev : [...prev, value]));
  }, []);

  const handleFolderRemove = useCallback((folderId: string) => {
    setSelectedFolderIds(prev => prev.filter(id => id !== folderId));
    setSelectedDocumentIds(prev =>
      prev.filter(docId => {
        const doc = documents.find(d => d._id === docId);
        return doc?.folderId !== folderId;
      })
    );
    setActiveFolderId(prev => (prev === folderId ? '' : prev));
  }, [documents]);

  const handleDocumentToggle = useCallback((docId: string, state: boolean | 'indeterminate') => {
    const isChecked = state === true || state === 'indeterminate';
    setSelectedDocumentIds(prev => {
      if (isChecked) {
        return prev.includes(docId) ? prev : [...prev, docId];
      }
      return prev.filter(id => id !== docId);
    });
  }, []);

  const handleClearSelections = useCallback(() => {
    setSelectedDocumentIds([]);
    setSelectedFolderIds([]);
    setActiveFolderId('');
  }, []);

  const visibleDocuments = useMemo(() => {
    let filtered = documents;

    if (activeFolderId) {
      filtered = filtered.filter(doc => doc.folderId === activeFolderId);
    } else if (selectedFolderIds.length > 0) {
      filtered = filtered.filter(doc => doc.folderId && selectedFolderIds.includes(doc.folderId));
    }

    if (documentSearch.trim()) {
      const query = documentSearch.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.Title?.toLowerCase().includes(query) ||
        doc.folderName?.toLowerCase().includes(query) ||
        doc.contentType?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedDate || b.createdDate).getTime() -
          new Date(a.updatedDate || a.createdDate).getTime()
      );
  }, [documents, activeFolderId, selectedFolderIds, documentSearch]);

  // Generate dynamic suggestions based on available documents
  const getSuggestions = () => {
    const baseSuggestions = [
      {
        id: 1,
        text: 'Summarize my recent documents',
        icon: FileText,
        action: () => {
          // Auto-select recent documents
          const recentDocs = documents
            .filter(doc => {
              const daysSinceModified = (Date.now() - new Date(doc.updatedDate || doc.createdDate).getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceModified < 7;
            })
            .slice(0, 5)
            .map(doc => doc._id);
          setSelectedDocumentIds(recentDocs);
          setMessage('Summarize my recent documents');
        }
      },
      {
        id: 2,
        text: 'Who last edited my documents?',
        icon: FileText,
        action: () => {
          setMessage('Who last edited my documents?');
        }
      },
      {
        id: 3,
        text: 'Analyze documents in a specific folder',
        icon: FolderIcon,
        action: () => {
          if (folders.length > 0) {
            setSelectedFolderIds([folders[0]._id]);
            setActiveFolderId(folders[0]._id);
            setDocumentSearch('');
            setIsContextSheetOpen(true);
            setMessage(`Analyze all documents in the "${folders[0].Name}" folder`);
          } else {
            setMessage('Analyze documents in a specific folder');
          }
        }
      },
      {
        id: 4,
        text: 'Find documents by content or tags',
        icon: Search,
        action: () => {
          setMessage('Find documents by content or tags');
        }
      },
    ];

    return baseSuggestions;
  };

  const suggestions = getSuggestions();

  const contextContent = (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[18px] font-semibold">Context filters</h3>
          <p className="text-sm text-muted-foreground">
            Narrow down AI responses by focusing on folders and documents.
          </p>
        </div>
        {(selectedDocumentIds.length > 0 || selectedFolderIds.length > 0) && (
          <Button variant="ghost" size="sm" onClick={handleClearSelections} className="rounded-lg">
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Choose a folder</label>
        <Select value={activeFolderId || 'all'} onValueChange={handleFolderSelect}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="All folders" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All folders</SelectItem>
            {folders.map(folder => (
              <SelectItem key={folder._id} value={folder._id}>
                <div className="flex items-center gap-2">
                  <FolderIcon className="w-4 h-4" />
                  <span>{folder.Name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedFolderIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFolderIds.map(folderId => (
              <Badge key={folderId} variant="secondary" className="rounded-lg px-3 py-1">
                <FolderIcon className="w-3 h-3 mr-1" />
                {folderNameById(folderId)}
                <button
                  onClick={() => handleFolderRemove(folderId)}
                  className="ml-2 hover:text-destructive"
                  aria-label={`Remove folder ${folderNameById(folderId)}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Documents {activeFolderId ? `in ${folderNameById(activeFolderId)}` : '(all)'}
          </label>
          {selectedDocumentIds.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedDocumentIds.length} selected
            </span>
          )}
        </div>
        <Input
          type="text"
          value={documentSearch}
          onChange={(e) => setDocumentSearch(e.target.value)}
          placeholder="Search documents..."
          className="rounded-xl"
        />
        <ScrollArea className="h-64 rounded-xl border border-dashed border-border">
          <div className="p-3 space-y-2">
            {visibleDocuments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                {documentSearch
                  ? 'No documents match your search.'
                  : 'No documents found in this selection.'}
              </div>
            ) : (
              visibleDocuments.map(doc => (
                <label
                  key={doc._id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer hover:bg-muted/60"
                >
                  <Checkbox
                    checked={selectedDocumentIds.includes(doc._id)}
                    onCheckedChange={(state) => handleDocumentToggle(doc._id, state)}
                  />
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-sm font-medium leading-tight truncate">{doc.Title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {folderNameById(doc.folderId || '')}
                      {doc.contentType && doc.contentType.length > 0 && (
                        <> • {doc.contentType.slice(0, 2).join(', ')}{doc.contentType.length > 2 ? '…' : ''}</>
                      )}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: message,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setConversation((prev) => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');
    setIsLoading(true);

    try {
      // Send question with document and folder context
      let response: string;
      try {
        response = await openAiApi.askQuestion(
          currentMessage,
          selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          selectedFolderIds.length > 0 ? selectedFolderIds : undefined
        );
      } catch (error: any) {
        // Check if it's a connection error
        const isConnectionError =
          error?.code === 'ERR_NETWORK' ||
          error?.code === 'ECONNREFUSED' ||
          error?.message?.includes('ERR_CONNECTION_REFUSED') ||
          error?.message?.includes('Network Error') ||
          !error?.response;

        if (isConnectionError) {
          throw new Error('Unable to connect to the AI service. Please make sure the backend is running.');
        } else {
          throw error;
        }
      }

      // Start typing animation
      setIsTyping(true);
      const fullText = response;
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setTypingText(fullText.substring(0, currentIndex));
          currentIndex += 2; // Adjust speed here (higher = faster)
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);

          // Add complete message to conversation
          const aiMessage: Message = {
            id: Date.now() + 1,
            type: 'ai',
            content: fullText,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          };
          setConversation((prev) => [...prev, aiMessage]);
          setTypingText('');
        }
      }, 20);
    } catch (error: any) {
      console.error('Error getting AI response:', error);

      // Get user-friendly error message
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
      }

      toast.error(errorMessage);

      const aiErrorMessage: Message = {
        id: Date.now() + 1,
        type: 'ai',
        content: errorMessage,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setConversation((prev) => [...prev, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    toast.info('Voice input is coming soon!');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Area */}
        <Card className="lg:col-span-3 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-[24px]">AI Assistant</h1>
                  <p className="text-[14px] text-muted-foreground">
                    Ask me anything about your workspace
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl lg:hidden"
                onClick={() => setIsContextSheetOpen(true)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-[20px] mb-2">How can I help you today?</h2>
                <p className="text-muted-foreground mb-8">
                  I can help you find documents, summarize content, and answer questions about your workspace
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion.id}
                      variant="outline"
                      className="h-auto p-4 rounded-xl text-left justify-start"
                      onClick={() => {
                        if (suggestion.action) {
                          suggestion.action();
                        } else {
                          setMessage(suggestion.text);
                        }
                      }}
                    >
                      <suggestion.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span>{suggestion.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-[85%]`}>
                      <Avatar className="w-10 h-10 mt-1">
                        {msg.type === 'ai' ? (
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            <Sparkles className="w-5 h-5" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                            JD
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className={msg.type === 'user' ? 'mr-3' : ''}>
                        <div
                          className={`px-5 py-3 rounded-2xl ${msg.type === 'user'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm'
                            }`}
                        >
                          <div dangerouslySetInnerHTML={{
                            __html: msg.type === 'ai' ? formatMarkdown(msg.content) : msg.content.replace(/\n/g, '<br>')
                          }} />
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-2">
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex flex-row items-start space-x-3 max-w-[85%]">
                      <Avatar className="w-10 h-10 mt-1">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-sm">
                          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(typingText) }} />
                          <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-6 border-t border-border space-y-3">
            {(selectedDocumentIds.length > 0 || selectedFolderIds.length > 0) && (
              <div className="flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-900/20 px-4 py-2 text-sm">
                <p className="text-blue-900 dark:text-blue-200">
                  {selectedDocumentIds.length > 0 && `${selectedDocumentIds.length} document${selectedDocumentIds.length > 1 ? 's' : ''}`}
                  {selectedDocumentIds.length > 0 && selectedFolderIds.length > 0 && ' • '}
                  {selectedFolderIds.length > 0 && `${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? 's' : ''}`}
                  {' '}selected
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setIsContextSheetOpen(true)}
                  >
                    Adjust
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelections}
                    className="rounded-lg text-blue-900 dark:text-blue-200"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl lg:hidden"
                onClick={() => setIsContextSheetOpen(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              <Button
                variant={isListening ? 'default' : 'ghost'}
                size="icon"
                className="rounded-xl"
                onClick={toggleVoiceInput}
              >
                <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              </Button>
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about your documents..."
                className="flex-1 rounded-xl"
              />
              <Button onClick={handleSendMessage} className="rounded-xl" disabled={isLoading || !message.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {isListening && (
              <p className="text-[14px] text-blue-600 mt-2 flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse" />
                Listening...
              </p>
            )}
          </div>
        </Card>

        {/* Context Sidebar */}
        <Card className="rounded-xl p-6 h-fit hidden lg:block">
          {contextContent}
        </Card>
      </div>

      <Sheet open={isContextSheetOpen} onOpenChange={setIsContextSheetOpen}>
        <SheetContent side="right" className="p-0">
          <SheetHeader>
            <SheetTitle className="px-6 pt-6">Context filters</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-8 space-y-6 overflow-y-auto">
            {contextContent}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
