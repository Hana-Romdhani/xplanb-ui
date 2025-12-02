import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { meetingsApi, CreateMeetingDto } from '../../api/meetings';

interface StartMeetingButtonProps {
    docId?: string;
    folderId?: string;
    title?: string;
    participants?: string[];
    className?: string;
}

export default function StartMeetingButton({ docId, folderId, title = 'Quick Sync', participants = [], className = '' }: StartMeetingButtonProps) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleStart = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const payload: CreateMeetingDto = {
                title,
                participants,
                startTime: new Date(),
                ...(docId ? { docId } : {}),
                ...(folderId ? { folderId } : {}),
            };
            const meeting = await meetingsApi.startMeeting(payload);
            navigate(`/meet?room=${encodeURIComponent(meeting.meetingRoomId || '')}&title=${encodeURIComponent(meeting.title)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleStart} disabled={loading} className={className + ' rounded-xl'} variant="outline">
            {loading ? 'Starting…' : 'Start Meeting'}
        </Button>
    );
}


