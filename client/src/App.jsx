import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';
const socket = io(SOCKET_URL);

const getEmptyBoard = size => Array(size * size).fill(null);

const getWinCombos = size => {
  const combos = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 3; col++) {
      combos.push([
        row * size + col,
        row * size + col + 1,
        row * size + col + 2,
      ]);
    }
  }

  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 3; row++) {
      combos.push([
        row * size + col,
        (row + 1) * size + col,
        (row + 2) * size + col,
      ]);
    }
  }

  for (let row = 0; row <= size - 3; row++) {
    for (let col = 0; col <= size - 3; col++) {
      combos.push([
        row * size + col,
        (row + 1) * size + col + 1,
        (row + 2) * size + col + 2,
      ]);
    }
  }

  for (let row = 0; row <= size - 3; row++) {
    for (let col = 2; col < size; col++) {
      combos.push([
        row * size + col,
        (row + 1) * size + col - 1,
        (row + 2) * size + col - 2,
      ]);
    }
  }

  return combos;
};

export default function App() {
  const [mode, setMode] = useState(null);
  const [gridSize, setGridSize] = useState(3);
  const [showGridSelection, setShowGridSelection] = useState(false);
  const [showDifficultySelection, setShowDifficultySelection] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [board, setBoard] = useState([]);
  const [winCombos, setWinCombos] = useState([]);
  const [myMarks, setMyMarks] = useState([]);
  const [opponentMarks, setOpponentMarks] = useState([]);
  const [symbol, setSymbol] = useState('X');
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [robotStarts, setRobotStarts] = useState(false);

  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const [maxHints, setMaxHints] = useState(3);

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

  useEffect(() => {
    setBoard(getEmptyBoard(gridSize));
    setWinCombos(getWinCombos(gridSize));
  }, [gridSize]);

  const checkWin = (b, s) =>
    winCombos.some(combo => combo.every(i => b[i] === s));

  const resetGame = () => {
    setBoard(getEmptyBoard(gridSize));
    setMyMarks([]);
    setOpponentMarks([]);
    setWinner(null);
    setNotification('');
    setCountdown(null);
    setCurrentHint(null);
    setHintCount(0);
  
    if (mode === 'online') {
    } else if (mode === 'robot') {
      const robotFirst = Math.random() < 0.5;
      setRobotStarts(robotFirst);
      setIsMyTurn(!robotFirst);
      setSymbol('X');
      
      if (robotFirst) {
        setMyMarks([]);
        setOpponentMarks([]);
        setTimeout(() => robotMove(getEmptyBoard(gridSize), []), 500);
      }
    } else {
      setIsMyTurn(true);
      setSymbol('X');
    }
  };

  const evaluateBoard = (board, playerMarks, robotMarks, isMaximizing) => {
    if (checkWin(board, 'O')) return 10;
    if (checkWin(board, 'X')) return -10;

    let score = 0;

    const multiplier = difficulty === 'extreme' ? 2 : 1;

    const centerIndices = gridSize === 3 ? [4] : [5, 6, 9, 10];
    centerIndices.forEach(i => {
      if (board[i] === 'O') score += 3 * multiplier;
      else if (board[i] === 'X') score -= 3 * multiplier;
    });

    const corners = gridSize === 3 ? [0, 2, 6, 8] : [0, 3, 12, 15];
    corners.forEach(i => {
      if (board[i] === 'O') score += 2 * multiplier;
      else if (board[i] === 'X') score -= 2 * multiplier;
    });

    winCombos.forEach(combo => {
      const [a, b, c] = combo;
      const values = [board[a], board[b], board[c]];
      const oCount = values.filter(v => v === 'O').length;
      const xCount = values.filter(v => v === 'X').length;
      const nullCount = values.filter(v => v === null).length;

      if (oCount === 2 && nullCount === 1) score += 5 * multiplier;
      if (xCount === 2 && nullCount === 1) score -= 5 * multiplier;
      if (oCount === 1 && nullCount === 2) score += 1 * multiplier;
      if (xCount === 1 && nullCount === 2) score -= 1 * multiplier;
    });

    if (difficulty === 'extreme') {
      const robotThreats = winCombos.filter(combo => {
        const values = combo.map(i => board[i]);
        const oCount = values.filter(v => v === 'O').length;
        const nullCount = values.filter(v => v === null).length;
        return oCount === 1 && nullCount === 2;
      }).length;

      const playerThreats = winCombos.filter(combo => {
        const values = combo.map(i => board[i]);
        const xCount = values.filter(v => v === 'X').length;
        const nullCount = values.filter(v => v === null).length;
        return xCount === 1 && nullCount === 2;
      }).length;

      score += robotThreats * 2;
      score -= playerThreats * 2;
    }

    return score;
  };

  const simulateMove = (board, playerMarks, robotMarks, index, isRobot) => {
    const newBoard = [...board];
    const symbol = isRobot ? 'O' : 'X';
    newBoard[index] = symbol;

    let newMarks = isRobot ? [...robotMarks, index] : [...playerMarks, index];
    let otherMarks = isRobot ? playerMarks : robotMarks;

    const wouldWin = checkWin(newBoard, symbol);

    if (!wouldWin && newMarks.length > 3) {
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

    const maxDepth = difficulty === 'extreme' ? 8 : 6;
    if (depth >= maxDepth) return score;

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
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
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
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
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

  const generateHint = () => {
    if (hintCount >= maxHints) {
      setNotification('No more hints available!');
      return;
    }

    const availableMoves = board
      .map((cell, i) => (cell === null ? i : null))
      .filter(i => i !== null);

    if (availableMoves.length === 0) return;

    for (let index of availableMoves) {
      const simulated = simulateMove(
        board,
        myMarks,
        opponentMarks,
        index,
        false
      );
      if (checkWin(simulated.board, 'X')) {
        setCurrentHint({ index, type: 'win', message: 'You can win here!' });
        setHintCount(prev => prev + 1);
        return;
      }
    }

    for (let index of availableMoves) {
      const simulated = simulateMove(
        board,
        myMarks,
        opponentMarks,
        index,
        true
      );
      if (checkWin(simulated.board, 'O')) {
        setCurrentHint({
          index,
          type: 'block',
          message: 'Block the robot here!',
        });
        setHintCount(prev => prev + 1);
        return;
      }
    }

    let bestMove = availableMoves[0];
    let bestScore = -Infinity;

    for (let index of availableMoves) {
      const simulated = simulateMove(
        board,
        myMarks,
        opponentMarks,
        index,
        false
      );
      const score = evaluateBoard(
        simulated.board,
        [...myMarks, index],
        opponentMarks,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    }

    setCurrentHint({
      index: bestMove,
      type: 'strategic',
      message: 'Good strategic move!',
    });
    setHintCount(prev => prev + 1);
  };

  const clearHint = () => {
    setCurrentHint(null);
  };

  const handleMove = index => {
    if (winner || board[index]) return;
    if (mode === 'online' && !isMyTurn) return;
  
    setCurrentHint(null);
  
    const newBoard = [...board];
    newBoard[index] = symbol;
    
    const currentPlayerMarks = symbol === 'X' ? [...myMarks, index] : [...opponentMarks, index];
    const wouldWin = checkWin(newBoard, symbol);
  
    if (!wouldWin && currentPlayerMarks.length > 3) {
      const toRemove = currentPlayerMarks.shift();
      newBoard[toRemove] = null;
    }
  
    if (checkWin(newBoard, symbol)) {
      setWinner(symbol);
      setNotification(`${symbol} Wins!`);
    }
  
    if (symbol === 'X') {
      setMyMarks(currentPlayerMarks);
    } else {
      setOpponentMarks(currentPlayerMarks);
    }
  
    setBoard(newBoard);
  
    if (mode === 'robot' && !checkWin(newBoard, symbol)) {
      const delay = difficulty === 'extreme' ? 1000 : 500;
      setTimeout(() => robotMove(newBoard, symbol === 'X' ? currentPlayerMarks : myMarks), delay);
    } else if (mode === 'local') {
      swapPlayers(newBoard, currentPlayerMarks);
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
  
    const wouldWin = checkWin(newBoard, 'O');
  
    if (!wouldWin && newOppMarks.length > 3) {
      const toRemove = newOppMarks.shift();
      newBoard[toRemove] = null;
    }
  
    if (checkWin(newBoard, 'O')) {
      setWinner('O');
      const message =
        difficulty === 'extreme'
          ? 'Extreme Robot Wins! 🤖💀'
          : 'Robot Wins! 🤖';
      setNotification(message);
    }
  
    setBoard(newBoard);
    setOpponentMarks(newOppMarks);
  };

  const handleModeSelection = selectedMode => {
    if (selectedMode === 'online') {
      setMode(selectedMode);
    } else if (selectedMode === 'robot') {
      setPendingMode(selectedMode);
      setShowDifficultySelection(true);
    } else {
      setPendingMode(selectedMode);
      setShowGridSelection(true);
    }
  };

  const handleDifficultySelection = selectedDifficulty => {
    setDifficulty(selectedDifficulty);
    setShowDifficultySelection(false);
    setShowGridSelection(true);
  };

  const handleGridSizeSelection = size => {
    setGridSize(size);
    setMode(pendingMode);
    setShowGridSelection(false);
    setShowDifficultySelection(false);
    setPendingMode(null);

    const baseHints = size === 3 ? 3 : 4;
    setMaxHints(
      difficulty === 'extreme' ? Math.floor(baseHints / 2) : baseHints
    );
  };

  const handleBack = () => {
    socket.disconnect();
    socket.connect();
    setMode(null);
    setShowGridSelection(false);
    setShowDifficultySelection(false);
    setPendingMode(null);
    setDifficulty('normal');
    resetGame();
    setRoomCode('');
    setInputRoom('');
    setChat([]);
    setWaiting(false);
    setNotification('');
    setGameStarted(false);
    setHintsEnabled(false);
    setCurrentHint(null);
    setHintCount(0);
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
      setGameStarted(false);
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
      setGameStarted(false);
      setIsMyTurn(symbol === 'X');
      setNotification('Joined room. Waiting for game to start...');
    };

    const handleOpponentMove = index => {
      const newBoard = [...boardRef.current];
      const opp = symbolRef.current === 'X' ? 'O' : 'X';
      newBoard[index] = opp;

      let newOppMarks = [...opponentMarksRef.current, index];

      const wouldWin = checkWin(newBoard, opp);

      if (!wouldWin && newOppMarks.length > 3) {
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

    const handleOpponentLeft = () => {
      setGameStarted(false);
      setWaiting(true);
      setWinner(null);
      setCountdown(null);
      resetGame();
      setNotification(`Opponent left the game. Waiting for new opponent...`);

      setSymbol('X');
      setIsMyTurn(true);
    };

    const handleKickAll = () => {
      handleBack();
      setNotification('A player disconnected. The room has been closed.');
    };

    socket.on('roomCreated', handleRoomCreated);
    socket.on('bothJoined', handleBothJoined);
    socket.on('roomJoined', handleRoomJoined);
    socket.on('opponentMove', handleOpponentMove);
    socket.on('turnUpdate', handleTurnUpdate);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('errorMsg', handleErrorMsg);
    socket.on('restartGame', handleRestartGame);
    socket.on('opponentLeft', handleOpponentLeft);
    socket.on('kickAll', handleKickAll);

    return () => {
      socket.off('roomCreated', handleRoomCreated);
      socket.off('bothJoined', handleBothJoined);
      socket.off('roomJoined', handleRoomJoined);
      socket.off('opponentMove', handleOpponentMove);
      socket.off('turnUpdate', handleTurnUpdate);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('errorMsg', handleErrorMsg);
      socket.off('restartGame', handleRestartGame);
      socket.off('opponentLeft', handleOpponentLeft);
      socket.off('kickAll', handleKickAll);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-zinc-900 p-6">
      {!mode && !showGridSelection && !showDifficultySelection && (
        <div className="space-y-4 space-x-4">
          <h1 className="text-4xl mb-6 text-cyan-400">Infinite Tic Tac Toe</h1>
          <button
            onClick={() => handleModeSelection('robot')}
            className="px-6 py-3 bg-red-500 text-white rounded w-64 hover:bg-red-400 transition-colors font-semibold"
          >
            Play vs Robot 🤖
          </button>
          <button
            onClick={() => handleModeSelection('local')}
            className="px-6 py-3 bg-pink-400 text-black rounded w-64 hover:bg-pink-300 transition-colors"
          >
            Play vs Friend (Same Device)
          </button>
          <button
            onClick={() => handleModeSelection('online')}
            className="px-6 py-3 bg-yellow-400 text-black rounded w-64 hover:bg-yellow-300 transition-colors"
          >
            Play Online
          </button>
        </div>
      )}

      {showDifficultySelection && (
        <div className="space-y-4">
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            ⬅ Back
          </button>
          <h2 className="text-3xl mb-6 text-cyan-400">Choose Difficulty</h2>
          <div className="space-y-4 space-x-4">
            <button
              onClick={() => handleDifficultySelection('normal')}
              className="px-6 py-3 bg-blue-500 text-white rounded w-64 hover:bg-blue-400 transition-colors font-semibold"
            >
              Normal 🤖
            </button>
            <button
              onClick={() => handleDifficultySelection('extreme')}
              className="px-6 py-3 bg-red-600 text-white rounded w-64 hover:bg-red-500 transition-colors font-semibold"
            >
              Extreme Hard 💀🤖
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-4 text-center max-w-md">
            <strong>Normal:</strong> Smart AI with standard strategy
            <br />
            <strong>Extreme Hard:</strong> Advanced AI with deeper analysis,
            fewer hints, and longer thinking time
          </p>
        </div>
      )}

      {showGridSelection && (
        <div className="space-y-4">
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            ⬅ Back
          </button>
          <h2 className="text-3xl mb-6 text-cyan-400">Choose Grid Size</h2>
          <div className="space-y-4 space-x-4">
            <button
              onClick={() => handleGridSizeSelection(3)}
              className="px-6 py-3 bg-blue-500 text-white rounded w-64 hover:bg-blue-400 transition-colors font-semibold"
            >
              3x3 Grid (Classic)
            </button>
            <button
              onClick={() => handleGridSizeSelection(4)}
              className="px-6 py-3 bg-purple-500 text-white rounded w-64 hover:bg-purple-400 transition-colors font-semibold"
            >
              4x4 Grid (Extended)
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-4 text-center max-w-md">
            In both modes, you still need to get 3 in a row to win. <br />
            After placing 3 marks, your oldest mark will be removed when you
            place a new one.
          </p>
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
    {mode === 'robot' && !winner && !notification && (
      <div className="text-sm text-gray-400">
        {robotStarts ? "🤖 Robot starts first!" : "You start first!"}
      </div>
    )}
  </div>
)}
          {mode === 'robot' && (
  <div className="mt-4 text-center">
    <div className="text-sm text-gray-400 mb-2">
      {difficulty === 'extreme'
        ? 'Extreme Robot: Advanced AI with deeper analysis 💀🤖'
        : 'Robot: Uses advanced AI strategies 🤖'}
    </div>
    <div className="text-sm text-gray-400">
      {!winner && (
        isMyTurn ? "Your turn (X)" : "🤖 Robot's turn (O)"
      )}
    </div>

              {/* Hints toggle and controls */}
              {/* <div className="flex items-center justify-center space-x-4 mb-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hintsEnabled}
                    onChange={e => setHintsEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span>Enable Hints</span>
                </label>

                {hintsEnabled && (
                  <div className="text-xs text-gray-400">
                    Hints used: {hintCount}/{maxHints}
                  </div>
                )}
              </div> */}

              {hintsEnabled && (
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={generateHint}
                    disabled={hintCount >= maxHints || !isMyTurn || winner}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💡 Get Hint
                  </button>
                  {currentHint && (
                    <button
                      onClick={clearHint}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-400 transition-colors"
                    >
                      Clear Hint
                    </button>
                  )}
                </div>
              )}

              {currentHint && (
                <div className="mt-2 p-2 bg-green-900/30 border border-green-500 rounded text-sm text-green-300">
                  {currentHint.message}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-center text-sm text-gray-400">
            {gridSize}x{gridSize} Grid - Get 3 in a row to win!
            {mode === 'robot' && difficulty === 'extreme' && (
              <div className="text-red-400 text-xs mt-1">
                ⚠️ Extreme Mode: Robot thinks longer and plays optimally
              </div>
            )}
          </div>

          <div
            className={`grid gap-2 mt-8 ${
              gridSize === 3 ? 'grid-cols-3' : 'grid-cols-4'
            }`}
          >
            {board.map((cell, i) => {
              const nextRemove = myMarks[0];
              const oppRemove = opponentMarks[0];
              const isRemove =
                (cell === symbol && nextRemove === i && myMarks.length >= 3) ||
                (cell &&
                  cell !== symbol &&
                  oppRemove === i &&
                  opponentMarks.length >= 3);

              const isHinted = currentHint && currentHint.index === i;
              const hintType = currentHint?.type;

              return (
                <div
                  key={i}
                  onClick={() => handleMove(i)}
                  className={`${
                    gridSize === 3 ? 'w-24 h-24' : 'w-20 h-20'
                  } border-2 flex items-center justify-center ${
                    gridSize === 3 ? 'text-4xl' : 'text-3xl'
                  } rounded-md cursor-pointer transition-all ${
                    isRemove
                      ? 'animate-pulse border-pink-500 bg-pink-900/20'
                      : isHinted
                      ? hintType === 'win'
                        ? 'border-green-400 bg-green-900/30 animate-pulse'
                        : hintType === 'block'
                        ? 'border-orange-400 bg-orange-900/30 animate-pulse'
                        : 'border-blue-400 bg-blue-900/30 animate-pulse'
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
                  {isHinted && !cell && (
                    <div className="absolute text-xs opacity-70">
                      {hintType === 'win'
                        ? '🎯'
                        : hintType === 'block'
                        ? '🛡️'
                        : '⭐'}
                    </div>
                  )}
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
