import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';
const socket = io(SOCKET_URL);

const EMPTY_BOARD = Array(9).fill(null);
const WIN_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function App() {
  const [mode, setMode] = useState(null);
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [myMarks, setMyMarks] = useState([]);
  const [opponentMarks, setOpponentMarks] = useState([]);
  const [symbol, setSymbol] = useState('X');
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState(null);

  const [roomCode, setRoomCode] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  const [notification, setNotification] = useState('');
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState('');

  const boardRef = useRef(board);
  const opponentMarksRef = useRef(opponentMarks);
  const symbolRef = useRef(symbol);

  useEffect(() => {
    boardRef.current = board;
    opponentMarksRef.current = opponentMarks;
    symbolRef.current = symbol;
  }, [board, opponentMarks, symbol]);

  const checkWin = (b, s) =>
    WIN_COMBOS.some(combo => combo.every(i => b[i] === s));

  const resetGame = () => {
    setBoard(EMPTY_BOARD);
    setMyMarks([]);
    setOpponentMarks([]);
    setWinner(null);
    setNotification('');
    setCountdown(null);

    if (mode === 'online') {
    } else {
      setIsMyTurn(true);
      setSymbol('X');
    }
  };

  const evaluateBoard = (board, playerMarks, robotMarks, isMaximizing) => {
    if (checkWin(board, 'O')) return 10;
    if (checkWin(board, 'X')) return -10;

    let score = 0;

    if (board[4] === 'O') score += 3;
    else if (board[4] === 'X') score -= 3;

    const corners = [0, 2, 6, 8];
    corners.forEach(i => {
      if (board[i] === 'O') score += 2;
      else if (board[i] === 'X') score -= 2;
    });

    WIN_COMBOS.forEach(combo => {
      const [a, b, c] = combo;
      const values = [board[a], board[b], board[c]];
      const oCount = values.filter(v => v === 'O').length;
      const xCount = values.filter(v => v === 'X').length;
      const nullCount = values.filter(v => v === null).length;

      if (oCount === 2 && nullCount === 1) score += 5; 
      if (xCount === 2 && nullCount === 1) score -= 5; 
      if (oCount === 1 && nullCount === 2) score += 1;
      if (xCount === 1 && nullCount === 2) score -= 1;
    });

    return score;
  };

  const simulateMove = (board, playerMarks, robotMarks, index, isRobot) => {
    const newBoard = [...board];
    const symbol = isRobot ? 'O' : 'X';
    newBoard[index] = symbol;

    let newMarks = isRobot ? [...robotMarks, index] : [...playerMarks, index];
    let otherMarks = isRobot ? playerMarks : robotMarks;

    if (newMarks.length > 3) {
      const toRemove = newMarks.shift();
      newBoard[toRemove] = null;
    }

    return {
      board: newBoard,
      playerMarks: isRobot ? playerMarks : newMarks,
      robotMarks: isRobot ? newMarks : robotMarks,
    };
  };

  const minimax = (
    board,
    playerMarks,
    robotMarks,
    depth,
    isMaximizing,
    alpha,
    beta
  ) => {
    const score = evaluateBoard(board, playerMarks, robotMarks, isMaximizing);

    if (checkWin(board, 'O')) return 10 - depth;
    if (checkWin(board, 'X')) return depth - 10;
    if (depth >= 6) return score;

    const availableMoves = board
      .map((cell, i) => (cell === null ? i : null))
      .filter(i => i !== null);

    if (availableMoves.length === 0) return score;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let index of availableMoves) {
        const simulated = simulateMove(
          board,
          playerMarks,
          robotMarks,
          index,
          true
        );
        const evaluation = minimax(
          simulated.board,
          simulated.playerMarks,
          simulated.robotMarks,
          depth + 1,
          false,
          alpha,
          beta
        );
        maxEval = Math.max(maxEval, eval);
        alpha = Math.max(alpha, eval);
        if (beta <= alpha) break; 
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let index of availableMoves) {
        const simulated = simulateMove(
          board,
          playerMarks,
          robotMarks,
          index,
          false
        );
        const evaluation = minimax(
          simulated.board,
          simulated.playerMarks,
          simulated.robotMarks,
          depth + 1,
          true,
          alpha,
          beta
        );
        minEval = Math.min(minEval, eval);
        beta = Math.min(beta, eval);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  const getBestMove = (board, playerMarks, robotMarks) => {
    const availableMoves = board
      .map((cell, i) => (cell === null ? i : null))
      .filter(i => i !== null);

    if (availableMoves.length === 0) return null;

    let bestMove = availableMoves[0];
    let bestScore = -Infinity;

    for (let index of availableMoves) {
      const simulated = simulateMove(
        board,
        playerMarks,
        robotMarks,
        index,
        true
      );
      if (checkWin(simulated.board, 'O')) {
        return index;
      }
    }

    for (let index of availableMoves) {
      const simulated = simulateMove(
        board,
        playerMarks,
        robotMarks,
        index,
        false
      );
      if (checkWin(simulated.board, 'X')) {
        bestMove = index;
        bestScore = 1000; 
      }
    }

    if (bestScore < 1000) {
      for (let index of availableMoves) {
        const simulated = simulateMove(
          board,
          playerMarks,
          robotMarks,
          index,
          true
        );
        const score = minimax(
          simulated.board,
          simulated.playerMarks,
          simulated.robotMarks,
          0,
          false,
          -Infinity,
          Infinity
        );

        if (score > bestScore) {
          bestScore = score;
          bestMove = index;
        }
      }
    }

    return bestMove;
  };

  const handleMove = index => {
    if (winner || board[index]) return;
    if (mode === 'online' && !isMyTurn) return;

    const newBoard = [...board];
    newBoard[index] = symbol;
    let newMarks = [...myMarks, index];

    if (newMarks.length > 3) {
      const toRemove = newMarks.shift();
      newBoard[toRemove] = null;
    }

    if (checkWin(newBoard, symbol)) {
      setWinner(symbol);
      setNotification(`${symbol} Wins!`);
    }

    setBoard(newBoard);
    setMyMarks(newMarks);

    if (mode === 'robot' && !checkWin(newBoard, symbol)) {
      setTimeout(() => robotMove(newBoard, newMarks), 500);
    } else if (mode === 'local') {
      swapPlayers(newBoard, newMarks);
    } else if (mode === 'online') {
      socket.emit('makeMove', { room: roomCode, index });
    }
  };

  const swapPlayers = (newBoard, newMarks) => {
    const next = symbol === 'X' ? 'O' : 'X';
    setSymbol(next);
    setMyMarks(opponentMarks);
    setOpponentMarks(newMarks);
  };

  const robotMove = (boardState, playerMarks) => {
    const bestMove = getBestMove(boardState, playerMarks, opponentMarks);

    if (bestMove === null) return;

    const newBoard = [...boardState];
    newBoard[bestMove] = 'O';

    let newOppMarks = [...opponentMarks, bestMove];
    if (newOppMarks.length > 3) {
      const toRemove = newOppMarks.shift();
      newBoard[toRemove] = null;
    }

    if (checkWin(newBoard, 'O')) {
      setWinner('O');
      setNotification('Robot Wins! 🤖');
    }

    setBoard(newBoard);
    setOpponentMarks(newOppMarks);
  };

  const handleBack = () => {
    socket.disconnect();
    socket.connect();
    setMode(null);
    resetGame();
    setRoomCode('');
    setInputRoom('');
    setChat([]);
    setWaiting(false);
    setNotification('');
    setGameStarted(false);
  };

  const handleRestart = () => {
    if (mode === 'online') {
      socket.emit('restartGame', { room: roomCode });
    } else {
      resetGame();
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setChat(prev => [...prev, { me: true, text: message }]);
      socket.emit('sendMessage', { room: roomCode, message });
      setMessage('');
    }
  };

  useEffect(() => {
    const handleRoomCreated = ({ code }) => {
      setSymbol('X');
      setRoomCode(code);
      setWaiting(true);
      setIsMyTurn(true);
      setNotification(`Room ${code} created. Waiting for opponent...`);
    };

    const handleBothJoined = () => {
      setWaiting(false);
      setNotification('Opponent joined! Starting in 3s...');
      setGameStarted(true);

      if (symbolRef.current === 'X') {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }

      let count = 3;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) {
          clearInterval(timer);
          setNotification('');
        }
      }, 1000);
    };

    const handleRoomJoined = ({ code, symbol }) => {
      setSymbol(symbol);
      setRoomCode(code);
      setWaiting(true);
      setIsMyTurn(symbol === 'X');
      setNotification('Joined room. Waiting for game to start...');
    };

    const handleOpponentMove = index => {
      const newBoard = [...boardRef.current];
      const opp = symbolRef.current === 'X' ? 'O' : 'X';
      newBoard[index] = opp;

      let newOppMarks = [...opponentMarksRef.current, index];
      if (newOppMarks.length > 3) {
        const toRemove = newOppMarks.shift();
        newBoard[toRemove] = null;
      }

      if (checkWin(newBoard, opp)) {
        setWinner(opp);
        setNotification(`${opp} Wins!`);
      }

      setBoard(newBoard);
      setOpponentMarks(newOppMarks);
    };

    const handleTurnUpdate = ({ currentTurn }) => {
      setIsMyTurn(currentTurn === symbolRef.current);
    };

    const handleReceiveMessage = msg => {
      setChat(prev => [...prev, { me: false, text: msg }]);
    };

    const handleErrorMsg = msg => {
      setNotification(msg);
    };

    const handleRestartGame = ({ currentTurn }) => {
      resetGame();
      setIsMyTurn(currentTurn === symbolRef.current);
    };

    socket.on('roomCreated', handleRoomCreated);
    socket.on('bothJoined', handleBothJoined);
    socket.on('roomJoined', handleRoomJoined);
    socket.on('opponentMove', handleOpponentMove);
    socket.on('turnUpdate', handleTurnUpdate);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('errorMsg', handleErrorMsg);
    socket.on('restartGame', handleRestartGame);

    return () => {
      socket.off('roomCreated', handleRoomCreated);
      socket.off('bothJoined', handleBothJoined);
      socket.off('roomJoined', handleRoomJoined);
      socket.off('opponentMove', handleOpponentMove);
      socket.off('turnUpdate', handleTurnUpdate);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('errorMsg', handleErrorMsg);
      socket.off('restartGame', handleRestartGame);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-zinc-900 p-6">
      {!mode && (
        <div className="space-y-4">
          <h1 className="text-4xl mb-6 text-cyan-400">Infinite Tic Tac Toe</h1>
          <button
            onClick={() => setMode('robot')}
            className="px-6 py-3 bg-red-500 text-white rounded w-64 hover:bg-red-400 transition-colors font-semibold"
          >
            Play vs Robot 🤖
          </button>
          <button
            onClick={() => setMode('local')}
            className="px-6 py-3 bg-pink-400 text-black rounded w-64 hover:bg-pink-300 transition-colors"
          >
            Play vs Friend (Same Device)
          </button>
          <button
            onClick={() => setMode('online')}
            className="px-6 py-3 bg-yellow-400 text-black rounded w-64 hover:bg-yellow-300 transition-colors"
          >
            Play Online
          </button>
        </div>
      )}

      {mode === 'online' && !roomCode && !waiting && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => socket.emit('createRoom')}
            className="px-6 py-3 bg-cyan-400 text-black rounded w-64 hover:bg-cyan-300 transition-colors"
          >
            Create Room
          </button>
          <div className="flex flex-col">
            <input
              placeholder="Room Code"
              className="text-black px-4 py-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={inputRoom}
              onChange={e => setInputRoom(e.target.value)}
            />
            <button
              onClick={() =>
                socket.emit('joinRoom', { code: inputRoom.trim() })
              }
              className="px-6 py-3 bg-blue-400 text-black rounded w-64 hover:bg-blue-300 transition-colors"
            >
              Join Room
            </button>
          </div>
          <button
            onClick={() => socket.emit('randomJoin')}
            className="px-6 py-3 bg-green-500 text-black rounded w-64 hover:bg-green-400 transition-colors"
          >
            Random Match
          </button>
        </div>
      )}

      {mode && ((roomCode && gameStarted) || mode !== 'online') && (
        <>
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            ⬅ Back
          </button>

          {notification && (
            <div className="mt-4 text-yellow-300 text-center font-semibold">
              {notification}
              {countdown && ` (${countdown})`}
            </div>
          )}

          {mode === 'robot' && (
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-400">
                The robot uses advanced AI strategies
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-8">
            {board.map((cell, i) => {
              const nextRemove = myMarks[0];
              const oppRemove = opponentMarks[0];
              const isRemove =
                (cell === symbol && nextRemove === i && myMarks.length >= 3) ||
                (cell &&
                  cell !== symbol &&
                  oppRemove === i &&
                  opponentMarks.length >= 3);
              return (
                <div
                  key={i}
                  onClick={() => handleMove(i)}
                  className={`w-24 h-24 border-2 flex items-center justify-center text-4xl rounded-md cursor-pointer transition-all ${
                    isRemove
                      ? 'animate-pulse border-pink-500 bg-pink-900/20'
                      : 'border-cyan-400 hover:border-cyan-300 hover:bg-cyan-900/20'
                  } ${
                    cell === 'X'
                      ? 'text-cyan-400'
                      : cell === 'O'
                      ? 'text-pink-400'
                      : ''
                  } ${
                    mode === 'online' && !isMyTurn && !cell
                      ? 'cursor-not-allowed opacity-50'
                      : ''
                  }`}
                >
                  {cell}
                </div>
              );
            })}
          </div>

          {mode === 'online' && (
            <div className="mt-4 text-center text-sm">
              {isMyTurn ? (
                <span className="text-green-400 font-semibold">
                  Your turn ({symbol})
                </span>
              ) : (
                <span className="text-yellow-400">Opponent's turn</span>
              )}
            </div>
          )}

          <button
            onClick={handleRestart}
            className="mt-6 px-6 py-3 bg-green-400 text-black rounded hover:bg-green-300 transition-colors"
          >
            Restart
          </button>

          {mode === 'online' && (
            <div className="mt-8 w-full max-w-md">
              <h2 className="mb-2 text-cyan-400">Chat - Room: {roomCode}</h2>
              <div className="bg-zinc-800 p-4 rounded h-48 overflow-y-scroll mb-2 border border-zinc-700">
                {chat.length === 0 ? (
                  <div className="text-gray-500 text-center">
                    No messages yet...
                  </div>
                ) : (
                  chat.map((c, i) => (
                    <div
                      key={i}
                      className={`mb-2 ${c.me ? 'text-right' : 'text-left'}`}
                    >
                      <span
                        className={`px-3 py-1 rounded-lg inline-block max-w-xs break-words ${
                          c.me
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-600 text-white'
                        }`}
                      >
                        {c.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex">
                <input
                  className="flex-1 px-4 py-2 text-black rounded-l border-0 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-cyan-400 text-black rounded-r hover:bg-cyan-300 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'online' && roomCode && !gameStarted && (
        <div className="text-center">
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            ⬅ Back
          </button>

          <div className="mt-8">
            <div className="text-2xl text-cyan-400 mb-4">Room: {roomCode}</div>
            {notification && (
              <div className="text-yellow-300 mb-4">{notification}</div>
            )}
            <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
}
