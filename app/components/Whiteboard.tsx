import { useState, useEffect } from 'react';
import { socket } from '../socket';
import styles from '../styles/Whiteboard.module.css';
import UsersList from './UsersList';
import Toolbar from './Toolbar';
import Canvas from './Canvas';

interface User {
    userId: string;
    username: string;
}

export default function Whiteboard() {
    const [username, setUsername] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [users, setUsers] = useState<User[]>([]);

    const registerUser = () => {
        const inputUsername = (document.getElementById('username-input') as HTMLInputElement).value.trim();
        if (inputUsername) {
            setUsername(inputUsername);
            setIsLoggedIn(true);
            socket.emit('register', inputUsername);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            socket.on('userList', (data: User[]) => {
                console.log('Updated user list:', data);
                setUsers(data);
            });

            socket.on('userJoined', (data: { userId: string; username: string }) => {
                console.log('User joined:', data);
                setUsers(prevUsers => [...prevUsers, data]);
            });

            socket.on('userLeft', (data: { userId: string; username: string }) => {
                console.log('User left:', data);
                setUsers(prevUsers => prevUsers.filter(user => user.userId !== data.userId));
            });
        }

        return () => {
            socket.off('userList');
            socket.off('userJoined');
            socket.off('userLeft');
        };
    }, [isLoggedIn, socket]);

    return (
        <>
            {/* Login Modal */}
            {!isLoggedIn && (
                <div id="login-modal" className={styles.loginModal}>
                    <div className={styles.loginForm}>
                        <h2>Enter Your Name</h2>
                        <input type="text" id="username-input" placeholder="Your name" />
                        <button onClick={registerUser}>Join Whiteboard</button>
                    </div>
                </div>
            )}

            {/* Whiteboard */}
            {isLoggedIn && (
                <div className={styles.container}>
                    <UsersList styles={styles} users={users} />
                    <div className={styles.mainContent}>
                        <Toolbar styles={styles} />
                        <Canvas styles={styles} />
                    </div>
                </div>
            )}
        </>
    );
}
