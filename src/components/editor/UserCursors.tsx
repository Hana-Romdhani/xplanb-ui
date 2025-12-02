import { useEffect, useState } from 'react';
import { useRealtimeStore } from '../../lib/realtime/realtimeStore';

export default function UserCursors() {
    const { cursors } = useRealtimeStore();
    const [visibleCursors, setVisibleCursors] = useState<Array<{
        userId: string;
        x: number;
        y: number;
        userName: string;
        userColor: string;
    }>>([]);

    useEffect(() => {
        const cursorArray: Array<{
            userId: string;
            x: number;
            y: number;
            userName: string;
            userColor: string;
        }> = [];

        cursors.forEach((cursor, userId) => {
            cursorArray.push({
                userId,
                x: cursor.x,
                y: cursor.y,
                userName: cursor.user.name,
                userColor: cursor.user.color,
            });
        });

        setVisibleCursors(cursorArray);
    }, [cursors]);

    return (
        <>
            {visibleCursors.map((cursor) => (
                <div
                    key={cursor.userId}
                    className="fixed pointer-events-none z-50 transition-all duration-100"
                    style={{
                        left: `${cursor.x}px`,
                        top: `${cursor.y}px`,
                    }}
                >
                    {/* Cursor pointer */}
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                    >
                        <path
                            d="M5.65376 12.3673L5.46026 12.4196L5.49926 12.6093L7.27187 21.8423C7.29343 21.9556 7.37645 22.0469 7.4869 22.0735C7.5973 22.1001 7.71333 22.0574 7.78488 21.9669L12 17L14.2927 19.2927C14.6833 19.6833 15.3166 19.6833 15.7071 19.2927L19.2927 15.7071C19.6833 15.3166 19.6833 14.6833 19.2927 14.2927L17 12L21.9669 7.78488C22.0574 7.71333 22.1001 7.5973 22.0735 7.4869C22.0469 7.37645 21.9556 7.29343 21.8423 7.27187L12.6093 5.49926L12.4196 5.46026L12.3673 5.65376L5.65376 12.3673Z"
                            fill={cursor.userColor}
                            stroke="white"
                            strokeWidth="1.5"
                        />
                    </svg>

                    {/* User name label */}
                    <div
                        className="mt-1 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: cursor.userColor }}
                    >
                        {cursor.userName}
                    </div>
                </div>
            ))}
        </>
    );
}

