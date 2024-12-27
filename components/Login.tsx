interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const username = (e.currentTarget.elements.namedItem('username') as HTMLInputElement).value.trim();
    if (username) {
      onLogin(username);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">Enter Your Name</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            className="mb-4 w-full rounded-md border border-gray-300 p-2"
            placeholder="Your name"
            required
          />
          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 py-2 text-white hover:bg-blue-600"
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
} 