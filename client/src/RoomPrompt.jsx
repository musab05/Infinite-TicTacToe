import React, { useState } from 'react';

export default function RoomPrompt({ onSubmit }) {
  const [code, setCode] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <h2 className="text-white text-2xl mb-4">Enter Room Code</h2>
      <input
        className="px-4 py-2 rounded border-2 border-cyan-400 bg-zinc-900 text-white mb-4 focus:outline-none"
        placeholder="Room code..."
        value={code}
        onChange={e => setCode(e.target.value)}
      />
      <button
        className="px-6 py-2 bg-cyan-400 rounded"
        onClick={() => code.trim() && onSubmit(code.trim())}
      >
        Join
      </button>
    </div>
  );
}
