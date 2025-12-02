/**
 * CommentsPanel.tsx
 * 
 * Document Comments Sidebar
 * 
 * A sidebar panel for displaying and managing comments on a document.
 * Users with shared access to the document can view and add comments.
 * 
 * Features:
 * - Display all comments for a document in chronological order
 * - Add new comments
 * - Real-time updates via WebSocket (future enhancement)
 * - User avatars and names
 * - Timestamps for each comment
 * - Delete own comments
 */

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { commentsApi, Comment } from '../../api/comments';
import { toast } from 'sonner';
import { getUserById } from '../../lib/services/userService';
import { getInitials } from '../../lib/utils';

interface CurrentUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface CommentsPanelProps {
    documentId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CommentsPanel({ documentId, isOpen, onClose }: CommentsPanelProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Load current user
    useEffect(() => {
        const loadCurrentUser = async () => {
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
                const userData = await getUserById(userId);
                setCurrentUser(userData);
            } catch (error) {
                console.error('Error loading current user:', error);
            }
        };
        loadCurrentUser();
    }, []);

    // Load comments when panel opens
    useEffect(() => {
        if (isOpen && documentId) {
            loadComments();
        }
    }, [isOpen, documentId]);

    const loadComments = async () => {
        try {
            setLoading(true);
            const data = await commentsApi.getByDocument(documentId);
            setComments(data);
        } catch (error: any) {
            console.error('Failed to load comments:', error);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim()) {
            toast.error('Please enter a comment');
            return;
        }

        if (!currentUser) {
            toast.error('You must be logged in to comment');
            return;
        }

        try {
            setSubmitting(true);
            const comment = await commentsApi.create({
                content: newComment.trim(),
                document: documentId,
            });

            setComments([comment, ...comments]);
            setNewComment('');
            toast.success('Comment added');
        } catch (error: any) {
            console.error('Failed to create comment:', error);
            toast.error(error?.response?.data?.message || 'Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await commentsApi.delete(commentId);
            setComments(comments.filter(c => c._id !== commentId));
            toast.success('Comment deleted');
        } catch (error: any) {
            console.error('Failed to delete comment:', error);
            toast.error('Failed to delete comment');
        }
    };

    // Auto-scroll to bottom when new comments are added
    useEffect(() => {
        if (commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [comments]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Comments</h2>
                    {comments.length > 0 && (
                        <span className="text-sm text-muted-foreground">({comments.length})</span>
                    )}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
                {loading && (
                    <div className="text-center text-muted-foreground py-8">Loading comments...</div>
                )}

                {!loading && comments.length === 0 && (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No comments yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Start the conversation
                        </p>
                    </div>
                )}

                {comments.map((comment) => (
                    <Card key={comment._id} className="p-3 rounded-xl bg-card border-border">
                        <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                                    {getInitials(comment.user.firstName, comment.user.lastName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {comment.user.firstName} {comment.user.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatTime(comment.createdAt)}
                                        </p>
                                    </div>
                                    {currentUser && comment.user._id === currentUser._id && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteComment(comment._id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
                <div ref={commentsEndRef} />
            </div>

            {/* Comment Input */}
            <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                    <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="rounded-xl bg-background border-border text-foreground placeholder:text-muted-foreground"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitComment();
                            }
                        }}
                        disabled={submitting}
                    />
                    <Button
                        onClick={handleSubmitComment}
                        disabled={submitting || !newComment.trim()}
                        className="rounded-xl"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}


