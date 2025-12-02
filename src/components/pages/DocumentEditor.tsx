import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Share2, Star, MoreVertical, ChevronRight, Home, Timer, Wifi, WifiOff, Save, Check, FileDown, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import ShareModal from '../modals/ShareModal';
import CommentsPanel from '../modals/CommentsPanel';
import VoiceToolbar from '../editor/AIToolbar';
import UserPresence from '../editor/UserPresence';
import UserCursors from '../editor/UserCursors';
import HeadingSelector from '../editor/HeadingSelector';
import { YjsClient } from '../../lib/realtime/yjsClient';
import { useRealtimeStore } from '../../lib/realtime/realtimeStore';
import { documentsApi } from '../../api/documents';
import { foldersApi } from '../../api/folders';
import { uploadsApi } from '../../api/uploads';
import { ACCESS_TOKEN_KEY, API_URL } from '../../lib/config';
import EditorJS from '@editorjs/editorjs';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import Checklist from '@editorjs/checklist';
// @ts-ignore
import Quote from '@editorjs/quote';
// @ts-ignore
import Delimiter from '@editorjs/delimiter';
// @ts-ignore
import Table from '@editorjs/table';
// @ts-ignore
import CodeTool from '@editorjs/code';
// @ts-ignore
import ImageTool from '@editorjs/image';

const INITIAL_DATA = {
  time: new Date().getTime(),
  blocks: [
    {
      type: 'header',
      data: {
        text: 'Product Vision',
        level: 1,
      },
    },
    {
      type: 'paragraph',
      data: {
        text: 'Our goal is to become the leading collaborative workspace platform by the end of 2025.',
      },
    },
    {
      type: 'header',
      data: {
        text: 'Key Objectives',
        level: 2,
      },
    },
    {
      type: 'list',
      data: {
        style: 'ordered',
        items: [
          '<b>User Growth</b>: Reach 1M active users',
          '<b>Feature Expansion</b>: Launch AI-powered collaboration tools',
          '<b>Enterprise Focus</b>: Onboard 500+ enterprise customers',
        ],
      },
    },
    {
      type: 'header',
      data: {
        text: 'Q4 Priorities',
        level: 2,
      },
    },
    {
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          'Complete design system overhaul',
          'Launch mobile applications',
          'Integrate with major productivity tools',
          'Improve real-time collaboration features',
        ],
      },
    },
    {
      type: 'header',
      data: {
        text: 'Success Metrics',
        level: 2,
      },
    },
    {
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          '40% increase in user engagement',
          '25% reduction in churn rate',
          '95%+ customer satisfaction score',
        ],
      },
    },
  ],
};

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const previousLocationRef = useRef(location.pathname);
  const editorRef = useRef<EditorJS | null>(null);
  const yjsClientRef = useRef<YjsClient | null>(null);
  const [title, setTitle] = useState('Product Roadmap 2025');
  const [tags, setTags] = useState(['strategy', 'product', 'roadmap']);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [isStarred, setIsStarred] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingRemoteUpdateRef = useRef(false);
  const lastSavedContentRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const hasRenderedContentRef = useRef(false); // Track if content has been rendered
  const apiContentLoadedRef = useRef(false); // Track if API content has been loaded

  const {
    isConnected,
    connectedUsers,
    setConnected,
    setCurrentDocument,
    setConnectedUsers,
    removeUser,
    updateUserCursor,
    isSaving,
    setSaving,
    setLastSaved,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    reset,
  } = useRealtimeStore();

  // Load document from backend
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadDocument = async () => {
      setLoading(true);
      try {
        console.log('📄 Loading document:', id);

        // Set a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        );

        let doc: any = null;
        let content: any = null;

        // Try to load document metadata
        try {
          doc = await Promise.race([
            documentsApi.getById(id),
            timeoutPromise
          ]) as any;

          console.log('📄 Document loaded:', doc);

          if (!doc || !doc._id) {
            throw new Error('Invalid document response');
          }

          // Extract folderId and folderName (handle both populated object and string)
          let folderIdString: string | undefined;
          let folderName: string | undefined;

          if (doc.folderId) {
            if (typeof doc.folderId === 'string') {
              folderIdString = doc.folderId;
            } else if (typeof doc.folderId === 'object' && doc.folderId._id) {
              folderIdString = String(doc.folderId._id);
              folderName = doc.folderId.Name || doc.folderId.name;
            }
          }
          console.log('folderName', folderName);
          console.log('folderIdString', folderIdString);
          console.log('doc', doc);
          // Set document metadata immediately (content will be loaded separately)
          setDocument({
            _id: doc._id,
            Title: doc.Title || 'Untitled Document',
            folderId: folderIdString,
            folderName: folderName,
            createdBy: doc.createdBy,
            updatedDate: doc.updatedDate,
            contentType: doc.contentType || [],
            content: null, // Explicitly set to null to indicate content loading is in progress
            ...doc
          });

          // If we have folderId but no folderName, fetch it
          if (folderIdString && !folderName) {
            foldersApi.getById(folderIdString)
              .then(folder => {
                setDocument((prev: any) => ({
                  ...prev,
                  folderName: folder.Name || folder.Name
                }));
              })
              .catch(err => {
                console.warn('Failed to fetch folder name:', err);
                // Don't show error, just use default
              });
          }

          setTitle(doc.Title || 'Untitled Document');
          setTags(doc.contentType || []);

        } catch (docError: any) {
          console.error('Failed to load document metadata:', docError);

          // If document doesn't exist, try to create a new one or show error
          const errorMessage = docError?.response?.status === 404
            ? 'Document not found'
            : docError?.message || 'Failed to load document';

          toast.error(errorMessage);

          // Set a minimal document state so user can still work
          setDocument({
            _id: id,
            Title: 'Untitled Document',
            content: INITIAL_DATA
          });
          setTitle('Untitled Document');
          setTags([]);
        }

        // Try to load document content separately (this can fail without breaking the editor)
        try {
          content = await Promise.race([
            documentsApi.getContent(id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Content timeout')), 10000))
          ]) as any;

          console.log('📝 Content loaded:', content);
          console.log('📝 Content type:', typeof content);
          console.log('📝 Content.content exists:', !!content?.content);
          console.log('📝 Content.content type:', typeof content?.content);
          console.log('📝 Content.content length:', content?.content?.length);
          console.log('📝 Content.content preview:', content?.content?.substring?.(0, 200));

          if (content && content.content) {
            try {
              const parsedContent = typeof content.content === 'string'
                ? JSON.parse(content.content)
                : content.content;

              // Validate that parsed content has blocks
              if (parsedContent && parsedContent.blocks && Array.isArray(parsedContent.blocks) && parsedContent.blocks.length > 0) {
                const contentStr = typeof content.content === 'string' ? content.content : JSON.stringify(content.content);
                const initialStr = JSON.stringify(INITIAL_DATA);

                console.log('✅ Valid content loaded with', parsedContent.blocks.length, 'blocks');
                console.log('📝 First block preview:', parsedContent.blocks[0]?.data?.text?.substring(0, 50) || 'no text');
                console.log('📝 Loaded content length:', contentStr.length);
                console.log('📝 Loaded content preview:', contentStr.substring(0, 200) + '...');

                setDocument((prev: any) => ({
                  ...prev,
                  content: parsedContent
                }));

                // IMPORTANT: Don't set lastSavedContentRef here - it will be set after Editor.js renders
                // because Editor.js generates new block IDs. Setting it here causes comparison failures.
                // We'll set it in onReady after the content is rendered.
                console.log('📝 Content loaded, will set lastSavedContentRef after Editor.js renders');
                apiContentLoadedRef.current = true; // Mark API content as loaded
              } else {
                console.warn('⚠️ Content loaded but has no valid blocks, using initial data');
                setDocument((prev: any) => ({
                  ...prev,
                  content: INITIAL_DATA
                }));
                lastSavedContentRef.current = JSON.stringify(INITIAL_DATA);
              }
            } catch (parseError) {
              console.error('❌ Failed to parse content:', parseError);
              console.error('Content that failed to parse:', content.content?.substring(0, 200));
              console.error('Parse error details:', {
                message: (parseError as Error).message,
                stack: (parseError as Error).stack
              });
              setDocument((prev: any) => ({
                ...prev,
                content: INITIAL_DATA
              }));
              lastSavedContentRef.current = JSON.stringify(INITIAL_DATA);
            }
          } else {
            console.log('ℹ️ No content found for document, using initial data');
            console.log('📝 Content response was:', content);
            setDocument((prev: any) => ({
              ...prev,
              content: INITIAL_DATA
            }));
            lastSavedContentRef.current = JSON.stringify(INITIAL_DATA);
            apiContentLoadedRef.current = true; // Mark API content loading as complete (no content found)
          }
        } catch (contentError) {
          console.warn('⚠️ Content loading failed, using initial data:', contentError);
          // Content loading failure is not critical - continue with initial data
          setDocument((prev: any) => ({
            ...prev,
            content: INITIAL_DATA
          }));
          lastSavedContentRef.current = JSON.stringify(INITIAL_DATA);
          apiContentLoadedRef.current = true; // Mark API content loading as complete (failed)
        }

        isInitialLoadRef.current = false;
        hasRenderedContentRef.current = false; // Reset render flag when loading new document
        apiContentLoadedRef.current = false; // Reset API content loaded flag when loading new document
        setLoading(false);
      } catch (error: any) {
        console.error('Unexpected error loading document:', error);
        toast.error('Failed to load document: ' + (error?.message || 'Unknown error'));
        setLoading(false);

        // Set minimal document state so user can still work
        setDocument((prev: any) => ({
          _id: id,
          Title: 'Untitled Document',
          content: INITIAL_DATA
        }));
        setTitle('Untitled Document');
        setTags([]);
        lastSavedContentRef.current = JSON.stringify(INITIAL_DATA);
        isInitialLoadRef.current = false;
        apiContentLoadedRef.current = true; // Mark as loaded (even if failed, to allow editor to initialize)
      }
    };

    loadDocument();
  }, [id]);

  // Initialize real-time collaboration
  useEffect(() => {
    // Wait for loading and document to be ready before initializing editor
    // Also wait for content to be loaded (either actual content or confirmed as INITIAL_DATA)
    if (!id || !document || loading) return;

    // Wait a bit more to ensure content has been loaded
    // Check if content loading is still in progress by checking if content is null or undefined
    // If document.content is null/undefined, it means content loading hasn't completed yet
    if (document.content === null || document.content === undefined) {
      console.log('⏳ Waiting for content to load before initializing editor...', {
        content: document.content,
        hasContent: !!document.content
      });
      return;
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      toast.error('Not authenticated');
      navigate('/login');
      return;
    }

    let yjsClient: YjsClient | null = null;

    const initializeCollaboration = async () => {
      try {
        setSyncing(true);

        // Create Yjs client for real-time collaboration
        yjsClient = new YjsClient({
          documentId: id,
          token,
          userId: 'user-' + Date.now(), // Replace with actual user ID
          onSync: () => {
            console.log('✅ Document synced');
            setSyncing(false);
            setConnected(true);
            setCurrentDocument(id);
          },
          onUpdate: async (remoteContent?: any) => {
            // IMPORTANT: Don't apply Yjs updates during initial load - wait for API content to load first
            if (!apiContentLoadedRef.current) {
              console.log('⏸️ Skipping Yjs update - waiting for API content to load first');
              return;
            }

            console.log('📝 Document updated by remote user - applying changes...');

            // Set flag to prevent onChange from triggering during remote update
            isApplyingRemoteUpdateRef.current = true;

            try {
              setHasUnsavedChanges(true);

              // Apply remote changes to editor
              if (editorRef.current && yjsClient) {
                try {
                  let contentToRender = remoteContent;

                  // If remote content is provided, use it
                  if (!contentToRender) {
                    // Get content from Yjs map
                    const yjsDoc = yjsClient.getDocument();
                    const contentMap = yjsDoc.getMap('content');
                    const remoteContentStr = contentMap.get('data');

                    if (remoteContentStr && typeof remoteContentStr === 'string') {
                      contentToRender = JSON.parse(remoteContentStr);
                    }
                  }

                  if (contentToRender && contentToRender.blocks) {
                    console.log('🔄 Applying remote changes to editor');

                    // Save current state first
                    const currentData = await editorRef.current.save();

                    // Normalize blocks for comparison (remove IDs and timestamps that can differ)
                    const normalizeBlocks = (blocks: any[]) => {
                      return blocks.map(block => {
                        const normalized: any = {
                          type: block.type,
                          data: { ...block.data }
                        };
                        // Remove fields that might differ between instances
                        delete normalized.data.id;
                        delete normalized.data.time;
                        return normalized;
                      });
                    };

                    const normalizedCurrent = normalizeBlocks(currentData.blocks || []);
                    const normalizedRemote = normalizeBlocks(contentToRender.blocks || []);

                    // Compare normalized content
                    const currentStr = JSON.stringify(normalizedCurrent);
                    const remoteStr = JSON.stringify(normalizedRemote);

                    if (currentStr !== remoteStr) {
                      console.log('📊 Content differs, rendering remote changes');
                      console.log('Current blocks:', normalizedCurrent.length, 'Remote blocks:', normalizedRemote.length);

                      // Ensure content has proper structure
                      const contentToSet = {
                        time: contentToRender.time || Date.now(),
                        version: contentToRender.version || '2.28.0',
                        blocks: contentToRender.blocks || []
                      };

                      // Render remote changes - Editor.js render() replaces content, not appends
                      try {
                        // Mark as applying remote update to prevent onChange from triggering
                        isApplyingRemoteUpdateRef.current = true;
                        await editorRef.current.render(contentToSet);
                        console.log('✅ Successfully applied remote changes');

                        // After rendering, get the actual content from Editor.js (with its generated IDs)
                        // and use that as the baseline for future comparisons
                        const renderedData = await editorRef.current.save();
                        const renderedContentStr = JSON.stringify(renderedData);
                        lastSavedContentRef.current = renderedContentStr;
                        console.log('📝 Updated lastSavedContentRef to rendered remote content:', {
                          renderedLength: renderedContentStr.length,
                          renderedBlocks: renderedData.blocks?.length || 0
                        });
                      } catch (renderError) {
                        console.error('❌ Render error applying remote changes:', renderError);
                        // Don't try to clear and re-render as that can cause duplicates
                        // Just log the error and continue
                      }
                    } else {
                      console.log('✅ Content is identical, skipping render');
                    }
                  }
                } catch (error) {
                  console.error('Failed to apply remote changes:', error);
                }
              }
            } finally {
              // Clear any pending debounce timers to prevent sending updates during remote sync
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
              }

              // Reset flag after a delay to ensure render completes
              setTimeout(() => {
                isApplyingRemoteUpdateRef.current = false;
                console.log('✅ Remote update applied, onChange enabled again');
              }, 1500); // Increased delay to ensure render completes
            }
          },
          onError: (error: any) => {
            console.warn('⚠️ Real-time collaboration unavailable:', error);
            // Don't show error toast, just log it - allow offline editing
            setSyncing(false);
          },
          onCursorUpdate: (userId, cursor) => {
            updateUserCursor(userId, cursor);
          },
          onPresenceUpdate: (users) => {
            setConnectedUsers(users.map(u => ({
              id: u.id,
              name: u.name || 'Anonymous',
              color: u.color || '#3b82f6',
            })));
          },
          onUserLeft: (userId) => {
            removeUser(userId);
          },
        });

        yjsClientRef.current = yjsClient;

        // Wait for DOM element to be ready - check if it exists
        // Use window.document to avoid shadowing from the 'document' state variable
        const waitForElement = (selector: string, maxAttempts = 20, delay = 100): Promise<HTMLElement> => {
          return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkElement = () => {
              const element = window.document.getElementById(selector);
              if (element) {
                resolve(element);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkElement, delay);
              } else {
                reject(new Error(`Element with ID "${selector}" not found after ${maxAttempts} attempts`));
              }
            };
            checkElement();
          });
        };

        // Wait for the editorjs element to exist in the DOM
        try {
          await waitForElement('editorjs', 30, 100); // Wait up to 3 seconds
          console.log('✅ Editor container element found');
        } catch (error) {
          console.error('❌ Editor container element not found:', error);
          setSyncing(false);
          return; // Don't initialize if element doesn't exist
        }

        // Initialize editor with Yjs binding
        if (!editorRef.current) {
          const editor = new EditorJS({
            holder: 'editorjs',
            placeholder: 'Start writing your document...',
            readOnly: false,
            tools: {
              header: {
                // @ts-ignore
                class: Header,
                config: {
                  placeholder: 'Enter a header',
                  levels: [1, 2, 3, 4],
                  defaultLevel: 2,
                },
              },
              list: {
                class: List,
                inlineToolbar: true,
                config: {
                  defaultStyle: 'unordered',
                },
              },
              checklist: {
                class: Checklist,
                inlineToolbar: true,
              },
              quote: {
                class: Quote,
                inlineToolbar: true,
                config: {
                  quotePlaceholder: 'Enter a quote',
                  captionPlaceholder: 'Quote author',
                },
              },
              delimiter: {
                class: Delimiter,
              },
              table: {
                // @ts-ignore
                class: Table,
                inlineToolbar: true,
                config: {
                  rows: 2,
                  cols: 3,
                },
              },
              code: {
                class: CodeTool,
                config: {
                  placeholder: 'Enter code',
                },
              },
              image: {
                class: ImageTool,
                config: {
                  uploader: (() => {
                    const uploadByFile = async (file: File) => {
                      try {
                        const response = await uploadsApi.uploadImage(file);

                        if (response.success === 1 && response.file?.url) {
                          // Construct full URL - backend serves images at /uploads/images/
                          const baseUrl = API_URL.replace('/api', '');
                          const imageUrl = response.file.url.startsWith('http')
                            ? response.file.url
                            : `${baseUrl}${response.file.url}`;

                          return {
                            success: 1,
                            file: {
                              url: imageUrl,
                            },
                          };
                        } else {
                          throw new Error(response.message || 'Upload failed');
                        }
                      } catch (error: any) {
                        console.error('Image upload error:', error);
                        toast.error(error.message || 'Failed to upload image');
                        return {
                          success: 0,
                        };
                      }
                    };

                    return {
                      uploadByFile,
                      async uploadByUrl(url: string) {
                        // For URL-based uploads, we can fetch and re-upload the image
                        // or just return the URL if it's already accessible
                        try {
                          // First try to use the URL directly if it's from our server
                          if (url.startsWith(API_URL.replace('/api', '')) || url.startsWith('/uploads/')) {
                            const baseUrl = API_URL.replace('/api', '');
                            const imageUrl = url.startsWith('http')
                              ? url
                              : `${baseUrl}${url}`;
                            return {
                              success: 1,
                              file: {
                                url: imageUrl,
                              },
                            };
                          }

                          // Otherwise, fetch and re-upload
                          const response = await fetch(url);
                          if (!response.ok) {
                            throw new Error('Failed to fetch image from URL');
                          }

                          const blob = await response.blob();
                          const file = new File([blob], 'image.jpg', { type: blob.type });

                          return await uploadByFile(file);
                        } catch (error: any) {
                          console.error('URL upload error:', error);
                          toast.error('Failed to upload image from URL');
                          return {
                            success: 0,
                          };
                        }
                      },
                    };
                  })(),
                  captionPlaceholder: 'Enter image caption',
                  buttonContent: 'Select an Image',
                  field: 'file',
                  types: 'image/*',
                },
              },
            },
            data: document.content || INITIAL_DATA,
            onReady: async () => {
              editorRef.current = editor;
              setEditorReady(true);
              console.log('✅ Editor ready');
              console.log('📄 Document content at editor ready:', document.content ? 'exists' : 'missing');

              // Only render content once in onReady to prevent duplicates
              if (!hasRenderedContentRef.current && document.content && document.content.blocks && Array.isArray(document.content.blocks)) {
                try {
                  const currentData = await editor.save();
                  const currentContentStr = JSON.stringify(currentData);
                  const loadedContentStr = JSON.stringify(document.content);
                  const initialStr = JSON.stringify(INITIAL_DATA);

                  console.log('🔍 Content comparison in onReady:', {
                    currentIsInitial: currentContentStr === initialStr,
                    loadedIsInitial: loadedContentStr === initialStr,
                    areEqual: currentContentStr === loadedContentStr,
                    currentBlocks: currentData.blocks?.length || 0,
                    loadedBlocks: document.content.blocks?.length || 0
                  });

                  // Render if:
                  // 1. Current content is INITIAL_DATA and loaded content is not, OR
                  // 2. Loaded content is different from current content
                  if ((currentContentStr === initialStr && loadedContentStr !== initialStr) ||
                    (currentContentStr !== loadedContentStr && loadedContentStr !== initialStr)) {
                    console.log('🔄 Rendering loaded content into editor in onReady...', {
                      loadedBlocks: document.content.blocks.length
                    });

                    // Mark as rendered to prevent duplicate renders
                    hasRenderedContentRef.current = true;

                    await editor.render(document.content);
                    console.log('✅ Loaded content rendered successfully in onReady');

                    // After rendering, get the actual content from Editor.js (with its generated IDs)
                    // and use that as the baseline for future comparisons
                    const renderedData = await editor.save();
                    const renderedContentStr = JSON.stringify(renderedData);
                    lastSavedContentRef.current = renderedContentStr;
                    console.log('📝 Updated lastSavedContentRef to rendered content:', {
                      renderedLength: renderedContentStr.length,
                      renderedBlocks: renderedData.blocks?.length || 0
                    });
                  } else {
                    console.log('⏭️ Content is already correct, skipping render in onReady');
                    hasRenderedContentRef.current = true; // Mark as rendered even if we skip
                  }
                } catch (renderError: any) {
                  console.error('❌ Failed to render loaded content in onReady:', renderError);
                  console.error('Render error details:', {
                    message: (renderError as Error).message,
                    stack: (renderError as Error).stack
                  });
                  hasRenderedContentRef.current = false; // Allow retry if render failed
                }
              } else {
                if (hasRenderedContentRef.current) {
                  console.log('⏭️ Content already rendered, skipping onReady render');
                } else {
                  console.log('ℹ️ No valid content to render at editor ready');
                }
              }
            },
            onChange: async () => {
              // Skip if we're currently applying a remote update to prevent loops
              if (isApplyingRemoteUpdateRef.current) {
                console.log('⏸️ Skipping onChange - applying remote update');
                return;
              }

              setHasUnsavedChanges(true);

              // Debounce sync to avoid too frequent updates
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }

              debounceTimerRef.current = setTimeout(async () => {
                // Double-check flag before sending update
                if (isApplyingRemoteUpdateRef.current) {
                  console.log('⏸️ Skipping onChange sync - still applying remote update');
                  return;
                }

                if (editorRef.current && yjsClient && yjsClient.isReady()) {
                  try {
                    const savedData = await editorRef.current.save();

                    // Validate that we have valid blocks
                    if (!savedData || !savedData.blocks || !Array.isArray(savedData.blocks)) {
                      console.warn('⚠️ Invalid editor data, skipping sync');
                      return;
                    }

                    console.log('📤 Syncing document changes to other users', savedData.blocks.length, 'blocks');

                    // Send update directly via Socket.IO for immediate sync
                    // This works better than Yjs for Editor.js content synchronization
                    if (yjsClient.getSocket()) {
                      yjsClient.getSocket()?.emit('content_update', {
                        documentId: id,
                        content: savedData,
                        operation: 'update'
                      });
                    }
                  } catch (error) {
                    console.error('Failed to sync content:', error);
                  }
                }
              }, 500); // Debounce for 500ms

              // Auto-save to backend (debounced separately to avoid too many API calls)
              if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
              }

              autoSaveTimerRef.current = setTimeout(async () => {
                if (editorRef.current && id && !isApplyingRemoteUpdateRef.current) {
                  try {
                    setSaving(true);
                    const savedData = await editorRef.current.save();

                    if (!savedData || !savedData.blocks) {
                      console.warn('⚠️ Invalid editor data for auto-save, skipping');
                      setSaving(false);
                      return;
                    }

                    const contentString = JSON.stringify(savedData);
                    const lastSavedStr = lastSavedContentRef.current || 'null';

                    // Only save if content actually changed from last saved version
                    if (lastSavedContentRef.current !== contentString) {
                      console.log('💾 Auto-saving document to backend...', {
                        blocks: savedData.blocks.length,
                        contentLength: contentString.length,
                        lastSavedLength: lastSavedStr.length,
                        firstBlockText: savedData.blocks[0]?.data?.text?.substring(0, 50) || 'no text',
                        contentPreview: contentString.substring(0, 200) + '...',
                        lastSavedPreview: lastSavedStr.substring(0, 200) + '...'
                      });

                      // Update document metadata (title, tags)
                      await documentsApi.update(id, {
                        Title: title,
                        contentType: tags,
                      });

                      // Save document content
                      console.log('💾 Saving content to backend...', {
                        documentId: id,
                        contentLength: contentString.length,
                        blocksCount: savedData.blocks.length,
                        contentPreview: contentString.substring(0, 200) + '...'
                      });

                      const savedContent = await documentsApi.saveContent({
                        documentId: id,
                        content: contentString,
                      });

                      console.log('✅ Document auto-saved successfully:', {
                        contentId: savedContent?._id || 'no id',
                        documentId: savedContent?.documentId || 'no documentId',
                        savedAt: new Date().toISOString()
                      });

                      // IMPORTANT: Only update lastSavedContentRef AFTER successful save
                      lastSavedContentRef.current = contentString;
                      setLastSaved(new Date());
                      setHasUnsavedChanges(false);
                    } else {
                      console.log('⏭️ Content unchanged, skipping auto-save');
                      setSaving(false);
                    }
                  } catch (error: any) {
                    console.error('❌ Failed to auto-save document:', error);
                    console.error('Auto-save error details:', {
                      message: error?.message,
                      response: error?.response?.data,
                      status: error?.response?.status,
                    });
                    // Don't update lastSavedContentRef on error - allow retry
                    // Don't show error toast for auto-save failures to avoid spam
                  } finally {
                    setSaving(false);
                  }
                }
              }, 1000); // Auto-save after 1 second of inactivity (reduced for faster saves)
            },
          });
        }
      } catch (error) {
        console.warn('Real-time collaboration unavailable, continuing in offline mode:', error);
        // Don't block the editor - allow offline editing
        setSyncing(false);
        setConnected(false);
      }
    };

    initializeCollaboration();

    // Cleanup
    return () => {
      // Clear any pending auto-saves
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // CRITICAL: Final save before cleanup
      // Note: React doesn't wait for async cleanup, so we use fetch with keepalive
      if (editorRef.current && id && !isApplyingRemoteUpdateRef.current) {
        console.log('🔄 Component unmounting - performing final save...');

        // Get editor data synchronously
        editorRef.current.save().then((savedData) => {
          try {
            const contentString = JSON.stringify(savedData);
            const lastSavedStr = lastSavedContentRef.current || 'null';

            console.log('💾 Final save on unmount:', {
              contentLength: contentString.length,
              lastSavedLength: lastSavedStr.length,
              hasChanges: lastSavedContentRef.current !== contentString
            });

            if (lastSavedContentRef.current !== contentString) {
              console.log('💾 Saving changes before unmount using keepalive fetch...');

              // Use fetch with keepalive to ensure save completes even after unmount
              const token = localStorage.getItem(ACCESS_TOKEN_KEY);

              // Save content with keepalive
              fetch(`${API_URL}/content`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  documentId: id,
                  content: contentString,
                }),
                keepalive: true // Critical: ensures request completes even after page unloads
              }).catch(err => console.error('Failed to save content on unmount:', err));

              // Save metadata with keepalive
              fetch(`${API_URL}/Document/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  Title: title,
                  contentType: tags,
                }),
                keepalive: true
              }).catch(err => console.error('Failed to save metadata on unmount:', err));

              console.log('✅ Final save initiated (keepalive)');
            } else {
              console.log('⏭️ No changes to save on unmount');
            }
          } catch (error) {
            console.error('❌ Failed to prepare save on cleanup:', error);
          }
        }).catch((error) => {
          console.error('❌ Failed to get editor data on cleanup:', error);
        });
      }

      if (yjsClient) {
        yjsClient.disconnect();
      }
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      reset();
    };
  }, [id, document, navigate, setConnected, setCurrentDocument, setHasUnsavedChanges, setConnectedUsers, removeUser, updateUserCursor, reset, title, tags, loading]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current || !id) {
      console.error('❌ Cannot save: editor or id is missing', {
        hasEditor: !!editorRef.current,
        hasId: !!id
      });
      toast.error('Editor is not ready. Please wait...');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Starting save process...');
      const outputData = await editorRef.current.save();
      console.log('📝 Editor data saved, blocks:', outputData.blocks?.length || 0);

      if (!outputData || !outputData.blocks) {
        throw new Error('Invalid editor data: no blocks found');
      }

      const contentString = JSON.stringify(outputData);
      const lastSavedStr = lastSavedContentRef.current || 'null';

      // Check if content has actually changed
      if (lastSavedContentRef.current === contentString) {
        console.log('⏭️ Content unchanged, nothing to save', {
          contentLength: contentString.length,
          lastSavedLength: lastSavedStr.length
        });
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      console.log('📦 Content stringified, length:', contentString.length);
      console.log('📝 First block preview:', outputData.blocks[0]?.data?.text?.substring(0, 50) || 'no text');
      console.log('📊 Content comparison:', {
        currentLength: contentString.length,
        lastSavedLength: lastSavedStr.length,
        blocksCount: outputData.blocks.length,
        contentPreview: contentString.substring(0, 200) + '...',
        lastSavedPreview: lastSavedStr.substring(0, 200) + '...'
      });

      // Update document metadata (title, tags)
      console.log('📄 Updating document metadata...');
      await documentsApi.update(id, {
        Title: title,
        contentType: tags,
      });
      console.log('✅ Document metadata updated');

      // Save document content
      console.log('💾 Saving document content...', {
        documentId: id,
        contentLength: contentString.length,
        blocksCount: outputData.blocks.length,
        contentPreview: contentString.substring(0, 200) + '...'
      });

      const savedContent = await documentsApi.saveContent({
        documentId: id,
        content: contentString,
      });

      console.log('✅ Document content saved:', {
        contentId: savedContent?._id || 'no id',
        documentId: savedContent?.documentId || 'no documentId',
        savedAt: new Date().toISOString()
      });

      lastSavedContentRef.current = contentString;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success('Document saved successfully');
      console.log('✅ Save completed successfully');
    } catch (error: any) {
      console.error('❌ Saving failed:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      toast.error(`Failed to save document: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [id, title, tags, setSaving, setLastSaved, setHasUnsavedChanges]);

  const handleVoiceText = async (text: string) => {
    if (!editorRef.current) return;

    try {
      // Insert voice text into editor
      // Get current blocks
      const currentData = await editorRef.current.save();

      // Add a new paragraph block with the voice text
      const newBlocks = [
        ...currentData.blocks,
        {
          type: 'paragraph',
          data: {
            text: text,
          },
        },
      ];

      // Render with new blocks
      await editorRef.current.render({
        ...currentData,
        blocks: newBlocks,
      });

      toast.success('Voice text inserted');
    } catch (error) {
      console.error('Failed to insert voice text:', error);
      toast.error('Failed to insert voice text');
    }
  };


  const handleExportPDF = async () => {
    if (!id || !title) {
      toast.error('Please wait for the document to load');
      return;
    }

    const toastId = 'pdf-export';
    toast.loading('Generating PDF...', { id: toastId });

    try {
      // Call backend API to generate PDF
      const pdfBlob = await documentsApi.exportPDF(id);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${(title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded', { id: toastId });
    } catch (error: any) {
      console.error('Failed to export PDF:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to export PDF';
      toast.error(errorMessage, { id: toastId, duration: 5000 });
    } finally {
      toast.dismiss(toastId);
    }
  };

  // Render loaded content when it becomes available (if editor is already ready)
  // This only runs if content loads AFTER editor is ready (not in onReady)
  useEffect(() => {
    // Wait for editor to be ready and content to be loaded
    if (!editorReady || !editorRef.current || loading) return;

    // If no content yet, wait for it
    if (!document?.content) {
      console.log('⏳ Waiting for content to load...');
      return;
    }

    // Skip if content is INITIAL_DATA (no real content loaded)
    const loadedContentStr = JSON.stringify(document.content);
    const initialStr = JSON.stringify(INITIAL_DATA);
    if (loadedContentStr === initialStr) {
      console.log('⏭️ Content is INITIAL_DATA, skipping render');
      return;
    }

    // Skip if we're in initial load phase (content should be rendered in onReady)
    if (isInitialLoadRef.current) {
      console.log('⏭️ Still in initial load, content will be rendered in onReady');
      return;
    }

    // Skip if content has already been rendered (prevent duplicates)
    if (hasRenderedContentRef.current) {
      console.log('⏭️ Content already rendered, skipping useEffect render to prevent duplicates');
      return;
    }

    const renderLoadedContent = async () => {
      try {
        // Skip if we're already applying a remote update
        if (isApplyingRemoteUpdateRef.current) {
          console.log('⏸️ Skipping content render - applying remote update');
          return;
        }

        const currentData = await editorRef.current!.save();
        const currentContentStr = JSON.stringify(currentData);

        // Only render if loaded content is different from current
        if (currentContentStr !== loadedContentStr) {
          console.log('🔄 Content loaded after editor ready, rendering in useEffect...', {
            currentBlocks: currentData.blocks?.length || 0,
            loadedBlocks: document.content?.blocks?.length || 0,
            currentIsInitial: currentContentStr === initialStr
          });

          // Mark as rendered to prevent duplicate renders
          hasRenderedContentRef.current = true;

          isApplyingRemoteUpdateRef.current = true;
          await editorRef.current!.render(document.content);
          console.log('✅ Loaded content rendered successfully in useEffect');

          // After rendering, get the actual content from Editor.js (with its generated IDs)
          // and use that as the baseline for future comparisons
          const renderedData = await editorRef.current!.save();
          const renderedContentStr = JSON.stringify(renderedData);
          lastSavedContentRef.current = renderedContentStr;
          console.log('📝 Updated lastSavedContentRef to rendered content in useEffect:', {
            renderedLength: renderedContentStr.length,
            renderedBlocks: renderedData.blocks?.length || 0
          });

          // Reset flag after render
          setTimeout(() => {
            isApplyingRemoteUpdateRef.current = false;
          }, 500);
        } else {
          console.log('✅ Content is already up to date');
          hasRenderedContentRef.current = true; // Mark as rendered even if we skip
        }
      } catch (error) {
        console.error('❌ Failed to render loaded content in useEffect:', error);
        isApplyingRemoteUpdateRef.current = false;
        hasRenderedContentRef.current = false; // Allow retry if render failed
      }
    };

    renderLoadedContent();
  }, [document?.content, editorReady, loading]);

  // Save before page unload/navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Always try to save, even if hasUnsavedChanges is false (it might be stale)
      if (editorRef.current && id && !isApplyingRemoteUpdateRef.current) {
        console.log('🔄 Page unloading - saving changes...');

        // Get editor data and save immediately
        editorRef.current.save().then((savedData) => {
          try {
            const contentString = JSON.stringify(savedData);
            const token = localStorage.getItem(ACCESS_TOKEN_KEY);

            // Only save if content actually changed
            if (lastSavedContentRef.current !== contentString) {
              console.log('💾 Saving before page unload (keepalive)...', {
                contentLength: contentString.length,
                lastSavedLength: lastSavedContentRef.current?.length || 0
              });

              // Use fetch with keepalive for reliable save on page unload
              // This will complete even after the page starts unloading
              fetch(`${API_URL}/content`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  documentId: id,
                  content: contentString,
                }),
                keepalive: true // CRITICAL: ensures request completes even if page unloads
              }).catch(err => console.error('Failed to save content on unload:', err));

              // Also save metadata
              fetch(`${API_URL}/Document/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  Title: title,
                  contentType: tags,
                }),
                keepalive: true
              }).catch(err => console.error('Failed to save metadata on unload:', err));
            } else {
              console.log('⏭️ No changes to save on unload');
            }
          } catch (error) {
            console.error('Failed to prepare save on unload:', error);
          }
        }).catch(err => {
          console.error('Failed to get editor data on unload:', err);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id, title, tags]);

  // Save before React Router navigation
  useEffect(() => {
    // Check if location changed (user navigated away)
    if (previousLocationRef.current !== location.pathname && previousLocationRef.current.includes('/documents/')) {
      // User navigated away from a document - save if needed
      if (editorRef.current && id && !isApplyingRemoteUpdateRef.current && hasUnsavedChanges) {
        console.log('🔄 Navigation detected - saving before leaving document...');
        editorRef.current.save().then(async (savedData) => {
          try {
            const contentString = JSON.stringify(savedData);
            if (lastSavedContentRef.current !== contentString) {
              await Promise.all([
                documentsApi.update(id, {
                  Title: title,
                  contentType: tags,
                }),
                documentsApi.saveContent({
                  documentId: id,
                  content: contentString,
                })
              ]);
              console.log('✅ Saved before navigation');
              lastSavedContentRef.current = contentString;
            }
          } catch (error) {
            console.error('❌ Failed to save before navigation:', error);
          }
        }).catch(err => console.error('Failed to get editor data before navigation:', err));
      }
    }
    previousLocationRef.current = location.pathname;
  }, [location.pathname, id, hasUnsavedChanges, title, tags]);

  // Auto-save when title or tags change
  useEffect(() => {
    if (!id || loading || !editorReady || isInitialLoadRef.current) return;

    // Debounce title/tags auto-save
    const titleTagsTimer = setTimeout(async () => {
      try {
        const updatedDoc = await documentsApi.update(id, {
          Title: title.trim() || 'Untitled Document',
          contentType: tags,
        });

        // Update document state with new title
        setDocument((prev: any) => ({
          ...prev,
          Title: updatedDoc.Title || title.trim() || 'Untitled Document',
          updatedDate: updatedDoc.updatedDate || new Date().toISOString(),
        }));

        console.log('💾 Title/tags auto-saved:', updatedDoc.Title);
      } catch (error: any) {
        console.error('Failed to auto-save title/tags:', error);
        // Don't show error toast for auto-save to avoid spam, but log it
        if (error?.response?.status === 404) {
          toast.error('Document not found. Please refresh the page.');
        }
      }
    }, 2000);

    return () => clearTimeout(titleTagsTimer);
  }, [id, title, tags, loading, editorReady]);

  // Listen for text selection only when not loading and editor is ready
  useEffect(() => {
    if (loading || !editorReady) return;

    // Listen for text selection
    const handleSelection = () => {
      const selection = window.getSelection?.();
      if (selection) {
        setSelectedText(selection.toString());
      }
    };

    const handler = () => handleSelection();

    // Use global document from window to avoid conflict with local state
    const globalDoc = window.document;
    if (!globalDoc) {
      console.warn('⚠️ window.document is not available');
      return;
    }

    try {
      globalDoc.addEventListener('selectionchange', handler);
    } catch (error) {
      console.error('Failed to add selection change listener:', error);
      return;
    }

    return () => {
      if (globalDoc) {
        try {
          globalDoc.removeEventListener('selectionchange', handler);
        } catch (error) {
          console.error('Failed to remove selection change listener:', error);
        }
      }
    };
  }, [loading, editorReady]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* User Cursors Overlay */}
      <UserCursors />

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
          {document?.folderId && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/folders/${document.folderId._id}`}>
                    {document.folderName || 'Folder'}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{title || 'Untitled Document'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Top Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Connection status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Offline</span>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg"
            onClick={() => setIsStarred(!isStarred)}
          >
            <Star className={`w-5 h-5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>

          {/* User Presence */}
          <UserPresence />

          {connectedUsers.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {connectedUsers.length} online
            </span>
          )}
        </div>

        <div className="flex gap-2">


          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleExportPDF}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>

          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              console.log('🔘 Save button clicked');
              handleSave();
            }}
            disabled={isSaving || syncing}
          >
            {isSaving ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : syncing ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-pulse" />
                Syncing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>


          <Button
            variant={showCommentsPanel ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setShowCommentsPanel(!showCommentsPanel)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Comments
          </Button>

        </div>
      </div>

      {/* Voice Toolbar */}
      <VoiceToolbar
        selectedText={selectedText}
        onVoiceText={handleVoiceText}
      />

      {/* Heading Selector */}
      {editorReady && editorRef.current && (
        <HeadingSelector
          editor={editorRef.current}
          onHeadingChange={() => {
            setHasUnsavedChanges(true);
          }}
        />
      )}

      {/* Document Editor */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm p-8 space-y-6">
        {/* Title */}
        <Input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasUnsavedChanges(true);
          }}
          onBlur={async () => {
            // Save title immediately when user leaves the input
            if (id && title.trim() && !loading) {
              try {
                const updatedDoc = await documentsApi.update(id, {
                  Title: title.trim() || 'Untitled Document',
                  contentType: tags,
                });

                setDocument((prev: any) => ({
                  ...prev,
                  Title: updatedDoc.Title || title.trim() || 'Untitled Document',
                  updatedDate: updatedDoc.updatedDate || new Date().toISOString(),
                }));

                setHasUnsavedChanges(false);
              } catch (error) {
                console.error('Failed to save title:', error);
                toast.error('Failed to save document name');
              }
            }
          }}
          className="border-0 p-0 text-[32px] focus-visible:ring-0 font-semibold"
          placeholder="Untitled Document"
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[14px] rounded-lg">
              {tag}
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="rounded-lg h-7 text-[14px]">
            + Add tag
          </Button>
        </div>

        {/* Editor.js Container */}
        <div id="editorjs" className="prose prose-slate dark:prose-invert max-w-none" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[14px] text-muted-foreground">
        <p>
          {document?.updatedAt && `Last edited ${new Date(document.updatedAt).toLocaleString()}`}
        </p>
        <div className="flex items-center gap-4">
          {isSaving && <span className="text-blue-500">Saving...</span>}
          {syncing && !isSaving && <span className="text-blue-500">Syncing...</span>}
          {!isSaving && !syncing && isConnected && !hasUnsavedChanges && (
            <span className="text-green-500">All changes saved</span>
          )}
          {!isSaving && !syncing && hasUnsavedChanges && (
            <span className="text-amber-500">Unsaved changes</span>
          )}
          <p>{editorReady ? 'Editor ready' : 'Loading editor...'}</p>
        </div>
      </div>

      {showShareModal && id && (
        <ShareModal
          itemName={title}
          itemType="document"
          itemId={id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {id && (
        <CommentsPanel
          documentId={id}
          isOpen={showCommentsPanel}
          onClose={() => setShowCommentsPanel(false)}
        />
      )}
    </div>
  );
}
