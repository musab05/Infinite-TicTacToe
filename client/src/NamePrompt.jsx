import React, { useState } from 'react';

export default function NamePrompt({ onSubmit }) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <h2 className="text-white text-2xl mb-4">Enter your name</h2>
      <input
        className="px-4 py-2 text-lg rounded border-2 border-cyan-400 bg-zinc-900 text-white mb-4 focus:outline-none"
        placeholder="Your name..."
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button
        className="px-6 py-2 bg-cyan-400 text-black rounded hover:bg-cyan-300"
        onClick={() => name.trim() && onSubmit(name.trim())}
      >
        Continue
      </button>
    </div>
  );
}
