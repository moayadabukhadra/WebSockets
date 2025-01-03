import React, { useEffect, useRef } from 'react';
import { socket } from '../app/socket';

interface User {
    userId: string;
    username: string;
}

interface UsersListProps {
    styles: any;
    users: User[];
}

const UsersList = ({ styles, users }: UsersListProps) => {

    const cursorsRef = useRef<Map<string, HTMLDivElement>>(new Map());

    const updateCursor = (userId: string, x: number, y: number, username: string) => {
        let cursor = cursorsRef.current.get(userId);

        if (!cursor && cursorsRef.current) {
            cursor = document.createElement('div');
            cursor.className = styles.cursor;
            cursor.style.background = `hsl(${Math.random() * 360}, 70%, 50%)`;
            cursor.dataset.username = username;

            const container = cursorsRef.current.get('container') as HTMLElement;
            if (container) {
                container.appendChild(cursor);
            }

            cursorsRef.current.set(userId, cursor);
        }
        if (cursor) {
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }
    };

    useEffect(() => {
        socket.on('cursor-move', (data) => {
            if (data.userId !== socket.id) {
                updateCursor(data.userId, data.x, data.y, data.username);
            }
        });

        return () => {
            socket.off('cursor-move');
        };
    }, [socket]);

    if (!users || users.length === 0) {
        return <p>No users available.</p>;
    }

    return (
        <div>
            <div ref={(el) => cursorsRef.current.set('container', el)}></div>
            <h3>Connected Users</h3>
            <div>
                {users.map((user: User) => (
                    <h3 key={user.userId}>
                        {user.username}
                    </h3>
                ))}
            </div>
        </div>
    );
};

export default UsersList;
