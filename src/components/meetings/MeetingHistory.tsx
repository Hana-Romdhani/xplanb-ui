import { useEffect, useState } from 'react';
import { meetingsApi, Meeting } from '../../api/meetings';

interface MeetingHistoryProps {
    docId?: string;
    folderId?: string;
}

export default function MeetingHistory({ docId, folderId }: MeetingHistoryProps) {
    const [items, setItems] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!docId && !folderId) return;
            setLoading(true);
            setError(null);
            try {
                const data = docId
                    ? await meetingsApi.getMeetingsByDocument(docId)
                    : await meetingsApi.getMeetingsByFolder(folderId as string);
                if (!cancelled) setItems(data);
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Failed to load meetings');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [docId, folderId]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-card rounded-xl p-4">Loading meeting history…</div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-card rounded-xl p-4 text-red-600">{error}</div>
        );
    }

    if (!items.length) {
        return (
            <div className="bg-white dark:bg-card rounded-xl p-4 text-muted-foreground">No meetings found.</div>
        );
    }

    return (
        <div className="bg-white dark:bg-card rounded-xl p-4 space-y-3">
            <h3 className="font-medium">Meeting History</h3>
            <ul className="space-y-2">
                {items.map((m) => (
                    <li key={m._id} className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{m.title}</div>
                            <div className="text-xs text-muted-foreground">{new Date(m.startTime).toLocaleString()}</div>
                        </div>
                        <a className="text-blue-600" href={`/meet?room=${encodeURIComponent(m.meetingRoomId || '')}&title=${encodeURIComponent(m.title)}`}>Join</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}


