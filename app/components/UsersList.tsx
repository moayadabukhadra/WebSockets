import React, { useEffect, useRef } from 'react';
import { socket } from '../socket';

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
    const containerRef = useRef<HTMLDivElement>(null);

    const updateCursor = (userId: string, x: number, y: number, username: string) => {
        let cursor = cursorsRef.current.get(userId);

        if (!cursor && containerRef.current) {
            cursor = document.createElement('div');
            cursor.className = styles.cursor;
            cursor.style.background = `hsl(${Math.random() * 360}, 70%, 50%)`;
            cursor.dataset.username = username;

            containerRef.current.appendChild(cursor);
            cursorsRef.current.set(userId, cursor);
        }

        if (cursor) {
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('cursor-move', (data) => {
            if (data.userId !== socket.id) {
                updateCursor(data.userId, data.x, data.y, data.username);
            }
        });

        return () => {
            socket.off('cursor-move');
            // Clean up cursors
            cursorsRef.current.forEach(cursor => cursor.remove());
            cursorsRef.current.clear();
        };
    }, []);

    if (!users || users.length === 0) {
        return <p>No users available.</p>;
    }

    return (
        <div className={styles.usersListContainer}>
            <div ref={containerRef} className={styles.cursorsContainer} />
            <h3>Connected Users</h3>
            <div className={styles.usersList}>
                {users.map((user) => (
                    <div key={user.username} className={styles.userItem}>
                        {user.username}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UsersList;
