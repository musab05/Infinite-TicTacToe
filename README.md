# Infinite Tic Tac Toe 🎮

**Infinite Tic Tac Toe** is an exciting twist on the classic game, featuring an endless playing board that lets you test your strategy in multiple modes. Challenge an AI opponent, play locally with someone on the same device, or connect online with friends and chat while you play!

---

## Table of Contents
[Overview](#overview)
[Features](#features)
[Installation](#installation)
[Game Modes](#game-modes)
  - [Single Player (AI)](#single-player-ai)
  - [Local Multiplayer (Same Device)](#local-multiplayer-same-device)
  - [Online Multiplayer with Chat](#online-multiplayer-with-chat)
[Rules and Gameplay](#rules-and-gameplay)
[Project Structure](#project-structure)
[Technologies Used](#technologies-used)
[Future Enhancements](#future-enhancements)
[Contributing](#contributing)
[License](#license)
[Contact](#contact)

---

## Overview
Infinite Tic Tac Toe elevates the traditional game by allowing an unlimited board grid and incorporating three different game modes:
**AI Mode:** Play against a computer-controlled robot that makes moves automatically.
**Local Multiplayer:** Challenge a friend on the same device.
**Online Multiplayer:** Connect to other players over the internet and interact using built-in chat functionality.

The user interface is built with a clean design using Tailwind CSS, with responsive buttons representing game mode selections and dynamic game board updates. Real-time interactions are managed via Socket.IO for online matches, and the server is built with Express to handle room creation, joining, and move propagation.

---

## Features
**Infinite Board:** An endlessly scrolling tic tac toe grid where marks are removed after three moves to keep the game dynamic.
**Multiple Game Modes:**
  - Versus AI (robot mode): Enjoy a challenging game against a simple computer opponent.
  - Same Device Multiplayer (local mode): Two players share one device to battle it out.
  - Online Multiplayer: Create or join game rooms to face opponents online, complete with chat functionality.
**Real-Time Updates:** Instant move updates and chat messaging using Socket.IO.
**Responsive UI:** Styled with a vibrant Tailwind CSS design and custom animations.
**Room Management:** Players can create rooms, join via room codes, or get matched randomly online.
**Chat System:** Exchange messages with opponents during online matches.

---

## Installation

### Prerequisites
Node.js (v14 or later)
npm or yarn

### Client Setup
1. Navigate to the client folder.
2. Install dependencies:
    ```bash
    cd client
    npm install
    ```
3. Start the development server:
    ```bash
    npm run dev
    ```
4. Open your browser and go to [http://localhost:3000](http://localhost:3000).

### Server Setup
1. Navigate to the server folder.
2. Install dependencies:
    ```bash
    cd server
    npm install
    ```
3. Start the server:
    ```bash
    node index.js
    ```
   The server will run on [http://localhost:4000](http://localhost:4000).

---

## Game Modes

### Single Player (AI)
**How It Works:** After selecting the “Play vs Robot” option, you play against an AI that makes randomized moves on the board.
**Gameplay:** Each move is checked for wins, and if no win is detected, the AI responds after a short delay.
**Code Reference:** The logic for AI moves is implemented in the client’s main App component, which uses a random selection from available cells.

### Local Multiplayer (Same Device)
**How It Works:** Choose “Play vs Friend (Same Device)” to start a game on one device.
**Gameplay:** Players take turns tapping on the board. The game alternates the playing symbol between X and O.
**Code Reference:** The mode switch and move handling are managed in the App component with local state updates.

### Online Multiplayer with Chat
**How It Works:** Select “Play Online” to join or create an online room.
**Room Management:** 
  - Create a room with a randomly generated room code.
  - Join a room by entering a valid room code or opt for a random match.
**Chat Functionality:** There is an integrated chat panel that allows exchanging messages with your opponent during the game.
**Realtime Interaction:** Socket.IO is used to synchronize moves and chat messages between clients.
**Code Reference:** The server-side room and chat management is handled in the Socket.IO event handlers in the server’s `index.js`, while client-side components manage the UI for room code input and chat panels.

---

## Rules and Gameplay
**Winning Condition:** A win is determined by the standard Tic Tac Toe rules using several unique winning combinations (e.g., rows, columns, and diagonals).
**Mark Removal:** Once a player has more than three moves, the earliest mark is removed to keep the game “infinite” and unpredictable.
**Turn-Based Play:** In online mode, each player’s turn is enforced by real-time updates. In single player mode, the player always goes first.
**Notifications:** The game displays notifications for events such as room creation, opponent joining, and game status during play.

---

## Project Structure

| Folder/File            | Description                                                             |
|------------------------|-------------------------------------------------------------------------|
| **client/**            | Contains the React-based frontend using Vite and Tailwind CSS.          |
| client/src/App.jsx     | Main React component handling game logic, modes, and UI interactions. |
| client/src/NamePrompt.jsx | Component for prompting the player to enter their name before playing. |
| client/src/RoomPrompt.jsx | Component for room code input used in online multiplayer mode.        |
| client/tailwind.config.js | Configuration for Tailwind CSS custom themes and colors.               |
| client/vite.config.js  | Vite configuration for a React-based application.                       |
| **server/**            | Contains the Node.js/Express backend with Socket.IO for real-time play. |
| server/index.js        | Implements room creation, joining, move propagation, and chat messaging. |
| server/package.json    | Lists server dependencies and scripts.                                  |

---

## Technologies Used
**Frontend:**
  - React.js
  - Vite
  - Tailwind CSS
  - Socket.IO-client
**Backend:**
  - Node.js
  - Express.js
  - Socket.IO
  - nanoid (for generating unique room codes)
**Development Tools:**
  - ESLint for linting
  - PostCSS and Autoprefixer for CSS processing.

---

## Future Enhancements
**Advanced AI:** Implement a smarter algorithm for the AI to provide a more challenging experience.
**Game Recording:** Allow users to save or export game history.
**Enhanced Chat Features:** Support for emojis, richer media, and private messaging during online matches.
**UI Improvements:** Additional animations and sound effects to improve user engagement.
**Mobile Optimization:** Further optimizations for mobile device play.

---

## Contributing
Contributions are welcome! If you’d like to contribute to Infinite Tic Tac Toe, please follow these steps:
1. Fork the repository.
2. Create a new feature branch.
3. Make your changes and commit them.
4. Submit a pull request with a detailed description of your changes.

---

## License
This project is open source and available under the MIT License. See the [LICENSE](LICENSE) file for more information.

---

## Contact
For questions or suggestions, please contact the maintainer via GitHub.

Enjoy Infinite Tic Tac Toe and have fun gaming! 🚀🎉
