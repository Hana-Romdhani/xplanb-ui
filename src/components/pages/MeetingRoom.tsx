import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Users, MessageSquare, Monitor } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { meetingsApi, Meeting } from '../../api/meetings';
import { getUserById } from '../../lib/services/userService';
import { meetingService, MeetingMessage, MeetingParticipant } from '../../services/meetingService';

interface ParticipantWithMeta extends MeetingParticipant {
    isYou: boolean;
}

interface CurrentUser {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

interface ParticipantDetails {
    firstName?: string;
    lastName?: string;
    email?: string;
}

const getInitials = (first?: string, last?: string, fallback?: string) => {
    const name = `${first || ''} ${last || ''}`.trim() || fallback || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return (fallback || '??').slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatTimestamp = (timestamp: string) => {
    try {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

export default function MeetingRoom() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const room = params.get('room') || '';
    const titleParam = params.get('title');

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [participants, setParticipants] = useState<ParticipantWithMeta[]>([]);
    const [messages, setMessages] = useState<MeetingMessage[]>([]);
    const [message, setMessage] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<'participants' | 'chat'>('participants');
    const [isConnecting, setIsConnecting] = useState(false);
    const [participantDetails, setParticipantDetails] = useState<Record<string, ParticipantDetails>>({});

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const fetchedParticipantDetailsRef = useRef<Set<string>>(new Set());

    const meetingTitle = meeting?.title || titleParam || 'Meeting';
    const currentUserId = currentUser?._id || '';

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
                if (!userId) return;

                const userData = await getUserById(userId);
                setCurrentUser({
                    _id: userData._id || userId,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                });
                setParticipantDetails((prev) => ({
                    ...prev,
                    [userData._id || userId]: {
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                    },
                }));
            } catch (error) {
                console.error('Failed to load current user:', error);
            }
        };
        loadCurrentUser();
    }, []);

    useEffect(() => {
        const decorateParticipants = (items: MeetingParticipant[]): ParticipantWithMeta[] =>
            items.map((participant) => ({
                ...participant,
                isYou: participant._id === currentUserId,
            }));

        const mergeParticipantDetails = (items: MeetingParticipant[]) => {
            if (!items.length) {
                return;
            }

            setParticipantDetails((prev) => {
                let mutated = false;
                const next = { ...prev };

                for (const participant of items) {
                    if (!participant?._id) continue;

                    const existing = next[participant._id] || {};
                    const details: ParticipantDetails = {
                        firstName: participant.firstName ?? existing.firstName,
                        lastName: participant.lastName ?? existing.lastName,
                        email: participant.email ?? existing.email,
                    };

                    if (
                        details.firstName !== existing.firstName ||
                        details.lastName !== existing.lastName ||
                        details.email !== existing.email
                    ) {
                        next[participant._id] = details;
                        mutated = true;
                    }
                }

                return mutated ? next : prev;
            });
        };

        const handleMeetingState = (payload: { meeting: any; participants: MeetingParticipant[]; messages: MeetingMessage[] }) => {
            setMeeting((prev) => {
                if (!prev) return payload.meeting as Meeting;
                return {
                    ...prev,
                    ...payload.meeting,
                };
            });
            setParticipants(decorateParticipants(payload.participants));
            setMessages(payload.messages);
            mergeParticipantDetails(payload.participants);
        };

        const handleParticipantJoined = (data: { participant: MeetingParticipant }) => {
            setParticipants((prev) => {
                const updated = [...prev];
                const index = updated.findIndex((p) => p._id === data.participant._id);
                const decorated: ParticipantWithMeta = {
                    ...data.participant,
                    isYou: data.participant._id === currentUserId,
                };
                if (index >= 0) {
                    updated[index] = decorated;
                } else {
                    updated.push(decorated);
                }
                return updated;
            });
            mergeParticipantDetails([data.participant]);
        };

        const handleParticipantLeft = (data: { participantId: string }) => {
            setParticipants((prev) =>
                prev.map((participant) =>
                    participant._id === data.participantId
                        ? { ...participant, isConnected: false }
                        : participant
                )
            );
        };

        const handleMeetingMessage = (meetingMessage: MeetingMessage) => {
            setMessages((prev) => [...prev, meetingMessage]);
            if (meetingMessage?.userId && meetingMessage.user) {
                mergeParticipantDetails([
                    {
                        _id: meetingMessage.userId,
                        firstName: meetingMessage.user.firstName,
                        lastName: meetingMessage.user.lastName,
                        email: meetingMessage.user.email,
                        isConnected: true,
                    },
                ]);
            }
        };

        meetingService.on({
            onMeetingState: handleMeetingState,
            onParticipantJoined: handleParticipantJoined,
            onParticipantLeft: handleParticipantLeft,
            onMeetingMessage: handleMeetingMessage,
            onConnected: () => setIsConnecting(false),
            onDisconnected: () => setIsConnecting(true),
            onError: (error) => {
                if (error?.message) {
                    toast.error(error.message);
                }
            },
        });

        return () => {
            meetingService.off();
        };
    }, [currentUserId]);

    useEffect(() => {
        const setupVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing media devices:', error);
                toast.error('Unable to access camera or microphone.');
            }
        };

        setupVideo();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (!room) {
            toast.error('Missing meeting room identifier.');
            navigate('/meetings');
            return;
        }

        let isActive = true;

        const initializeMeeting = async () => {
            setIsConnecting(true);
            try {
                const meetingData = await meetingsApi.getMeetingByRoom(room);
                if (!isActive) return;
                setMeeting(meetingData);
                setParticipantDetails((prev) => {
                    if (!meetingData?.participants?.length) {
                        return prev;
                    }
                    let mutated = false;
                    const next = { ...prev };
                    for (const participant of meetingData.participants) {
                        if (!participant?._id) continue;
                        const existing = next[participant._id] || {};
                        const details: ParticipantDetails = {
                            firstName: participant.firstName ?? existing.firstName,
                            lastName: participant.lastName ?? existing.lastName,
                            email: participant.email ?? existing.email,
                        };
                        if (
                            details.firstName !== existing.firstName ||
                            details.lastName !== existing.lastName ||
                            details.email !== existing.email
                        ) {
                            next[participant._id] = details;
                            mutated = true;
                        }
                    }
                    return mutated ? next : prev;
                });

                try {
                    await meetingsApi.joinMeeting(room);
                } catch (error: any) {
                    const status = error?.response?.status;
                    if (status && status !== 400 && status !== 409) {
                        console.error('Join meeting via REST failed:', error);
                    }
                }
            } catch (error: any) {
                console.error('Failed to load meeting:', error);
                const message = error?.response?.data?.message || error?.message || 'Unable to load meeting';
                toast.error(message);
                navigate('/meetings');
                return;
            }

            meetingService.connect();
            meetingService.joinMeeting(room);
        };

        initializeMeeting();

        return () => {
            isActive = false;
            meetingService.leaveMeeting(room);
        };
    }, [navigate, room]);

    useEffect(() => {
        if (!currentUserId) return;
        setParticipants((prev) =>
            prev.map((participant) => ({
                ...participant,
                isYou: participant._id === currentUserId,
            }))
        );
    }, [currentUserId]);

    useEffect(() => {
        const missingParticipants = participants.filter((participant) => {
            if (!participant?._id) return false;
            if (participant.firstName || participant.lastName || participant.email) return false;
            if (participantDetails[participant._id]) return false;
            return !fetchedParticipantDetailsRef.current.has(participant._id);
        });

        if (!missingParticipants.length) {
            return;
        }

        missingParticipants.forEach((participant) => {
            fetchedParticipantDetailsRef.current.add(participant._id);
        });

        let isActive = true;

        (async () => {
            const details = await Promise.all(
                missingParticipants.map(async (participant) => {
                    try {
                        const data = await getUserById(participant._id);
                        return {
                            id: participant._id,
                            info: {
                                firstName: data.firstName,
                                lastName: data.lastName,
                                email: data.email,
                            } as ParticipantDetails,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch participant ${participant._id}`, error);
                        fetchedParticipantDetailsRef.current.delete(participant._id);
                        return null;
                    }
                })
            );

            if (!isActive) {
                return;
            }

            setParticipantDetails((prev) => {
                let mutated = false;
                const next = { ...prev };

                for (const detail of details) {
                    if (!detail?.id || !detail.info) continue;
                    const existing = next[detail.id] || {};
                    const merged: ParticipantDetails = {
                        firstName: detail.info.firstName ?? existing.firstName,
                        lastName: detail.info.lastName ?? existing.lastName,
                        email: detail.info.email ?? existing.email,
                    };

                    if (
                        merged.firstName !== existing.firstName ||
                        merged.lastName !== existing.lastName ||
                        merged.email !== existing.email
                    ) {
                        next[detail.id] = merged;
                        mutated = true;
                    }
                }

                return mutated ? next : prev;
            });
        })();

        return () => {
            isActive = false;
        };
    }, [participants, participantDetails]);

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = isMuted;
            });
        }
        setIsMuted((prev) => !prev);
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = isVideoOff;
            });
        }
        setIsVideoOff((prev) => !prev);
    };

    const toggleScreenShare = async () => {
        if (isSharingScreen) {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => track.stop());
                screenStreamRef.current = null;
            }
            if (localStreamRef.current && localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }
            setIsSharingScreen(false);
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            screenStreamRef.current = screenStream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
            }

            const [videoTrack] = screenStream.getVideoTracks();
            if (videoTrack) {
                videoTrack.addEventListener('ended', () => {
                    toggleScreenShare();
                });
            }

            setIsSharingScreen(true);
        } catch (error) {
            console.error('Error sharing screen:', error);
            toast.error('Failed to start screen sharing.');
        }
    };

    const handleLeave = () => {
        meetingService.leaveMeeting(room);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        navigate('/meetings');
    };

    const copyMeetingLink = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Meeting link copied to clipboard!');
        } catch (err) {
            toast.error('Failed to copy link. Please copy manually from the address bar.');
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        meetingService.sendMessage(room, message.trim());
        setMessage('');
    };

    const onlineParticipants = useMemo(
        () => participants.filter((participant) => participant.isConnected),
        [participants]
    );

    const toggleSidebar = (tab: 'participants' | 'chat') => {
        if (sidebarOpen && sidebarTab === tab) {
            setSidebarOpen(false);
            return;
        }
        setSidebarOpen(true);
        setSidebarTab(tab);
    };

    const resolveParticipant = (participant: ParticipantWithMeta) => {
        const details = participantDetails[participant._id] || {};
        return {
            ...participant,
            firstName: participant.firstName ?? details.firstName,
            lastName: participant.lastName ?? details.lastName,
            email: participant.email ?? details.email,
        };
    };

    const getParticipantDisplayName = (participant: ParticipantWithMeta) => {
        const resolved = resolveParticipant(participant);
        if (resolved.firstName || resolved.lastName) {
            return `${resolved.firstName || ''} ${resolved.lastName || ''}`.trim();
        }
        return resolved.email || 'Participant';
    };

    const getMessageAuthorDisplay = (msg: MeetingMessage) => {
        if (msg.user?.firstName || msg.user?.lastName) {
            return `${msg.user?.firstName || ''} ${msg.user?.lastName || ''}`.trim();
        }

        if (msg.user?.email) {
            return msg.user.email;
        }

        const details = participantDetails[msg.userId];
        if (details?.firstName || details?.lastName) {
            return `${details.firstName || ''} ${details.lastName || ''}`.trim();
        }

        return details?.email || 'Participant';
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-900 dark:bg-gray-950 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-white text-lg font-semibold truncate">{meetingTitle}</h1>
                    <span className="text-gray-400 text-sm whitespace-nowrap flex-shrink-0">• Room ID: {room}</span>
                </div>
                <div className="flex items-center gap-2">
                    {isConnecting && (
                        <span className="text-xs text-amber-300">Reconnecting…</span>
                    )}
                    <Button onClick={copyMeetingLink} variant="outline" size="sm" className="text-white border-gray-600 flex-shrink-0">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
                <div className="flex-1 relative bg-black rounded-lg overflow-hidden min-w-0">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted={isMuted}
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
                            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center">
                                <Users className="w-16 h-16 text-gray-600" />
                            </div>
                        </div>
                    )}

                    <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 pointer-events-none">
                        {participants.map((participant) => {
                            const resolved = resolveParticipant(participant);
                            const displayName = getParticipantDisplayName(participant);
                            return (
                                <div
                                    key={participant._id}
                                    className="pointer-events-auto flex items-center gap-2 bg-gray-800/80 backdrop-blur rounded-full px-3 py-1"
                                >
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
                                        {getInitials(resolved.firstName, resolved.lastName, resolved.email)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-white leading-tight">
                                            {displayName}
                                            {participant.isYou ? ' (You)' : ''}
                                        </span>
                                        <span className={`text-[10px] ${participant.isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
                                            {participant.isConnected ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {participants.length === 0 && (
                            <span className="text-xs text-gray-300 bg-gray-800/70 px-3 py-1 rounded-full">
                                Waiting for participants...
                            </span>
                        )}
                    </div>
                </div>

                {sidebarOpen && (
                    <div className="w-80 bg-gray-800 rounded-lg flex flex-col flex-shrink-0 min-h-0 border border-gray-700/60">
                        <div className="flex items-center border-b border-gray-700">
                            <button
                                className={`flex-1 py-3 text-sm font-medium ${sidebarTab === 'participants' ? 'text-white border-b-2 border-white' : 'text-gray-400'}`}
                                onClick={() => setSidebarTab('participants')}
                            >
                                Participants ({participants.length})
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium ${sidebarTab === 'chat' ? 'text-white border-b-2 border-white' : 'text-gray-400'}`}
                                onClick={() => setSidebarTab('chat')}
                            >
                                Chat ({messages.length})
                            </button>
                        </div>

                        {sidebarTab === 'participants' ? (
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {participants.length === 0 && (
                                    <p className="text-sm text-gray-400">No participants yet.</p>
                                )}
                                {participants.map((participant) => {
                                    const resolved = resolveParticipant(participant);
                                    const displayName = getParticipantDisplayName(participant);
                                    return (
                                        <div key={participant._id} className="flex items-center gap-3 bg-gray-700/40 rounded-lg p-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white">
                                                {getInitials(resolved.firstName, resolved.lastName, resolved.email)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white text-sm font-medium">
                                                        {displayName}
                                                        {participant.isYou ? ' (You)' : ''}
                                                    </span>
                                                </div>
                                                <span className={`text-xs ${participant.isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                    {participant.isConnected ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                                    {messages.length === 0 && (
                                        <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                                    )}
                                    {messages.map((msg) => (
                                        <div key={msg.id} className="text-white">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-blue-400">
                                                    {getMessageAuthorDisplay(msg)}
                                                    {msg.userId === currentUserId ? ' (You)' : ''}
                                                </span>
                                                <span className="text-xs text-gray-400">{formatTimestamp(msg.createdAt)}</span>
                                            </div>
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-gray-700 flex-shrink-0">
                                    <div className="flex gap-2">
                                        <Input
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    sendMessage();
                                                }
                                            }}
                                            placeholder="Type a message..."
                                            className="bg-gray-700 border-gray-600 text-white"
                                        />
                                        <Button onClick={sendMessage} size="sm" disabled={!message.trim()}>
                                            Send
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-gray-800 border-t border-gray-700 p-4 flex-shrink-0">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex gap-2">
                        <Button onClick={toggleMute} variant={isMuted ? 'destructive' : 'default'} size="sm">
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>
                        <Button onClick={toggleVideo} variant={isVideoOff ? 'destructive' : 'default'} size="sm">
                            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </Button>
                        <Button
                            onClick={() => toggleSidebar('participants')}
                            variant={sidebarOpen && sidebarTab === 'participants' ? 'default' : 'outline'}
                            size="sm"
                        >
                            <Users className="w-5 h-5" />
                            {onlineParticipants.length > 0 && (
                                <span className="ml-2 text-xs">{onlineParticipants.length}</span>
                            )}
                        </Button>
                        <Button
                            onClick={() => toggleSidebar('chat')}
                            variant={sidebarOpen && sidebarTab === 'chat' ? 'default' : 'outline'}
                            size="sm"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={toggleScreenShare}
                            variant={isSharingScreen ? 'default' : 'outline'}
                            size="sm"
                            title={isSharingScreen ? 'Stop sharing screen' : 'Share screen'}
                        >
                            <Monitor className="w-5 h-5" />
                        </Button>
                    </div>
                    <Button onClick={handleLeave} variant="destructive" size="sm">
                        <PhoneOff className="w-5 h-5 mr-2" />
                        Leave
                    </Button>
                </div>
            </div>
        </div>
    );
}