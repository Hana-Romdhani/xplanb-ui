import { useState, useEffect } from 'react';
import { Video, AlertCircle, X, LogIn } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { meetingsApi, CreateMeetingDto, Meeting } from '../../api/meetings';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { sendMeetingInvitation } from '../../lib/resend';

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export default function Meetings() {
    const [title, setTitle] = useState('Quick Sync');
    const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);
    const [joinRoomId, setJoinRoomId] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch available users
        const fetchUsers = async () => {
            try {
                const response = await api.get('/users');
                setAvailableUsers(response.data);
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };
        fetchUsers();
    }, []);

    const addParticipant = (user: User) => {
        if (!selectedParticipants.find(p => p._id === user._id)) {
            setSelectedParticipants([...selectedParticipants, user]);
        }
        setShowUserDropdown(false);
    };

    const removeParticipant = (userId: string) => {
        setSelectedParticipants(selectedParticipants.filter(p => p._id !== userId));
    };

    const start = async () => {
        if (starting) return;

        // Clear previous errors
        setStartError(null);
        setStarting(true);

        try {
            const participantIds = selectedParticipants.map(p => p._id);

            // Create meeting with a dummy folderId to satisfy backend requirement
            const payload: CreateMeetingDto = {
                title: title || 'Quick Sync',
                participants: participantIds,
                startTime: new Date(),
                folderId: 'standalone-meeting',
            };

            const meeting = await meetingsApi.startMeeting(payload);

            // Generate meeting join URL
            const joinUrl = `${window.location.origin}/meet?room=${meeting.meetingRoomId || ''}&title=${encodeURIComponent(meeting.title)}`;

            // Send email invitations to participants using Resend (frontend)
            if (selectedParticipants.length > 0) {
                let emailsSent = 0;
                let emailsFailed = 0;

                for (const participant of selectedParticipants) {
                    try {
                        // Get creator info from meeting response
                        const creatorName = meeting.createdBy
                            ? `${(meeting.createdBy as any).firstName || ''} ${(meeting.createdBy as any).lastName || ''}`.trim()
                            : 'Meeting Organizer';

                        await sendMeetingInvitation(participant.email, {
                            title: meeting.title,
                            startTime: meeting.startTime,
                            createdBy: creatorName,
                            description: meeting.description,
                            joinUrl,
                        });
                        emailsSent++;
                    } catch (emailError: any) {
                        console.error(`Failed to send email to ${participant.email}:`, emailError);
                        emailsFailed++;
                    }
                }

                if (emailsSent > 0) {
                    toast.success(`Meeting started! ${emailsSent} invitation email(s) sent.`);
                }
                if (emailsFailed > 0) {
                    toast.error(`Failed to send ${emailsFailed} invitation email(s).`);
                }
            } else {
                toast.success('Meeting started successfully!');
            }
            // Navigate to meeting room
            const params = new URLSearchParams({
                room: meeting.meetingRoomId || '',
                title: meeting.title,
            });
            window.location.href = `/meet?${params.toString()}`;
        } catch (err: any) {
            console.error('Error starting meeting:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to start meeting';
            setStartError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setStarting(false);
        }
    };

    const join = async () => {
        if (joining) return;

        const trimmedRoomId = joinRoomId.trim();
        if (!trimmedRoomId) {
            const message = 'Please enter a meeting room ID.';
            setJoinError(message);
            toast.error(message);
            return;
        }

        setJoinError(null);
        setJoining(true);

        try {
            const meeting = await meetingsApi.joinMeeting(trimmedRoomId);
            toast.success(`Joining "${meeting.title}"`);

            const params = new URLSearchParams({
                room: meeting.meetingRoomId || trimmedRoomId,
                title: meeting.title,
            });

            setJoinRoomId('');
            window.location.href = `/meet?${params.toString()}`;
        } catch (err: any) {
            console.error('Error joining meeting:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to join meeting';
            setJoinError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Meetings</h1>
            </div>

            <div className="bg-white dark:bg-card rounded-xl shadow-sm p-6 space-y-4 border border-border">
                <div className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    <h2 className="text-lg font-medium">Start a meeting</h2>
                </div>

                {startError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{startError}</span>
                    </div>
                )}

                <div className="grid gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="title">Meeting Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter meeting title"
                            disabled={starting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="participants">Participants</Label>
                        <div className="relative">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="w-full justify-start"
                                disabled={starting}
                            >
                                Add Participants
                            </Button>
                            {showUserDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {availableUsers.map(user => (
                                        <button
                                            key={user._id}
                                            onClick={() => addParticipant(user)}
                                            disabled={selectedParticipants.some(p => p._id === user._id)}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm">
                                                    {user.firstName[0]}{user.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Participants */}
                        {selectedParticipants.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedParticipants.map(user => (
                                    <div key={user._id} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg">
                                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                                        <button
                                            onClick={() => removeParticipant(user._id)}
                                            disabled={starting}
                                            className="hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Select participants to receive meeting invitations via email
                        </p>
                    </div>
                    <Button
                        onClick={start}
                        disabled={starting}
                        className="rounded-xl w-full"
                    >
                        {starting ? 'Starting Meeting...' : 'Start Meeting'}
                    </Button>
                </div>
            </div>
            <div className="bg-white dark:bg-card rounded-xl shadow-sm p-6 space-y-4 border border-border">
                <div className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    <h2 className="text-lg font-medium">Join a meeting</h2>
                </div>

                {joinError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{joinError}</span>
                    </div>
                )}

                <div className="grid gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="roomId">Meeting Room ID</Label>
                        <Input
                            id="roomId"
                            value={joinRoomId}
                            onChange={(e) => {
                                if (joinError) setJoinError(null);
                                setJoinRoomId(e.target.value);
                            }}
                            placeholder="Enter room ID"
                            disabled={joining}
                        />
                    </div>
                    <Button
                        onClick={join}
                        disabled={joining}
                        className="rounded-xl w-full"
                    >
                        {joining ? 'Joining...' : 'Join Meeting'}
                    </Button>
                </div>
            </div>
        </div>
    );
}


