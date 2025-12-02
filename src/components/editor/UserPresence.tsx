import { useRealtimeStore } from '../../lib/realtime/realtimeStore';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { getInitials } from '../../lib/utils';
import { API_URL } from '../../lib/config';

export default function UserPresence() {
    const { connectedUsers, isConnected } = useRealtimeStore();

    if (!isConnected || connectedUsers.length === 0) {
        return null;
    }

    const getAvatarUrl = (avatar?: string) => {
        if (!avatar) return undefined;
        // If avatar is already a full URL, return it
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        // Otherwise, prepend API URL
        return `${API_URL}${avatar.startsWith('/') ? avatar : `/${avatar}`}`;
    };

    const getNameParts = (name: string) => {
        const parts = name.trim().split(' ');
        return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
        };
    };

    return (
        <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
                {connectedUsers.slice(0, 5).map((user) => {
                    const { firstName, lastName } = getNameParts(user.name);
                    const avatarUrl = getAvatarUrl(user.avatar);
                    const initials = getInitials(firstName, lastName);

                    return (
                        <Avatar
                            key={user.id}
                            className="w-8 h-8 border-2 border-white dark:border-background"
                            title={user.name}
                        >
                            {avatarUrl && (
                                <AvatarImage
                                    src={avatarUrl}
                                    alt={user.name}
                                />
                            )}
                            <AvatarFallback
                                className="text-white text-[12px] font-medium"
                                style={{ backgroundColor: user.color }}
                            >
                                {initials || user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    );
                })}
            </div>
            {connectedUsers.length > 5 && (
                <span className="text-sm text-muted-foreground">
                    +{connectedUsers.length - 5} more
                </span>
            )}
        </div>
    );
}

