interface User {
  username: string;
  score: number;
  isDrawing?: boolean;
}

interface UsersListProps {
  users: User[];
}

export default function UsersList({ users }: UsersListProps) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-bold">Players</h3>
      <div className="space-y-2">
        {users.map((user, index) => (
          <div
            key={index}
            className="rounded-md bg-gray-50 p-2"
          >
            <div className="flex items-center justify-between">
              <span>
                {user.username} {user.isDrawing && '✏️'}
              </span>
              <span className="font-bold">{user.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 