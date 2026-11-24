import React, { useState, useReducer, useEffect } from "react";
import { points, connections } from "./data/board";
import { GiTigerHead, GiGoat } from "react-icons/gi";
import { Howl, Howler } from "howler";
import clickSound from "./sounds/click.wav";
import captureSound from "./sounds/capture.mp3";
import winSound from "./sounds/win.mp3";
import warningSound from "./sounds/error.mp3";
import "./App.css";
import { gameReducer } from "./gameEngine/gameReducer";
import { initialGameState } from "./gameEngine/initialGameState";
import {
  resetGameAction,
  setTurnAction,
  setWinnerAction,
  setGoatsKilledAction,
  setGoatsPlacedAction,
  movePieceAction,
} from "./gameEngine/gameActions";
import { createGameSession } from "./multiplayer/gameSession";
import { createRoom, createInitialBoardState } from "./multiplayer/roomManager";
import {
  createRoomInFirestore,
  getRoomFromFirestore,
  joinRoomInFirestore,
  listenToRoom,
  updateGameState,
} from "./firebase/firestoreService";
import { getPlayerName } from "./utils/playerStorage";

// Initialize sounds once outside component to prevent re-creation on every render
const clickAudio = new Howl({ src: [clickSound], volume: 0.4 });
const captureAudio = new Howl({ src: [captureSound], volume: 0.7 });
const winAudio = new Howl({ src: [winSound], volume: 0.8 });
const errorAudio = new Howl({ src: [warningSound], volume: 0.5 });

function App() {
  const [pieces, setPieces] = useState({
    0: "tiger",
    3: "tiger",
    4: "tiger",
  });

  const [selected, setSelected] = useState(null);
  const [showTutorial, setShowTutorial] = useState(
    !localStorage.getItem("tutorialSeen"),
  );
  const [tutorialStep, setTutorialStep] = useState(0);

  const tutorialCards = [
    {
      title: "Welcome",
      text: "Aadu Puli Aattam is a traditional Tamil strategy game between Tigers and Goats.",
    },
    {
      title: "🐐 Goat Objective",
      text: "Goats must surround and trap all Tigers so they cannot move.",
    },
    {
      title: "🐅 Tiger Objective",
      text: "Tigers win by capturing 5 goats before the goats trap them.",
    },
    {
      title: "⚔ Capturing",
      text: "A Tiger captures a Goat by jumping over it into an empty connected node.",
    },
    {
      title: "Ready?",
      text: "Plan carefully. Every move matters.",
    },
  ];

  const [turn, setTurn] = useState("goat");
  const [goatsPlaced, setGoatsPlaced] = useState(0);
  const [goatsKilled, setGoatsKilled] = useState(0);
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [lastMove, setLastMove] = useState(null); // { from: number | null, to: number }
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [opponentLeftMessage, setOpponentLeftMessage] = useState("");
  const [toast, setToast] = useState({ text: "", type: "info" });

  const showToast = (text, type = "error") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast({ text: "", type: "info" });
    }, 2800);
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitedRoom = params.get("room");
    if (invitedRoom) {
      setJoinCode(invitedRoom.trim().toUpperCase());
      setScreen("join-room");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    Howler.mute(nextMuted);
    setIsMuted(nextMuted);
  };

  // Count how many Tigers currently have zero legal moves
  const blockedTigersCount = Object.keys(pieces).filter(
    (key) => pieces[key] === "tiger" && !tigerCanMove(Number(key), pieces),
  ).length;

  const [, dispatch] = useReducer(gameReducer, initialGameState);
  const [session, setSession] = useState(createGameSession());
  const [screen, setScreen] = useState("home");
  const [joinCode, setJoinCode] = useState("");
  // const [playerName, setPlayerName] = useState(getPlayerName());

  const isOnlineGame = Boolean(session.roomId && session.status !== "local");

  // Push a complete validated board snapshot to Firestore (called ONLY on local moves)
  async function syncMoveToFirestore(nextState) {
    if (!isOnlineGame) return;
    setIsSyncing(true);
    try {
      await updateGameState(session.roomId, nextState);
    } catch (error) {
      console.error("Failed to synchronize game state:", error);
      showMessage("Sync Error - Check Connection");
    } finally {
      setIsSyncing(false);
    }
  }

  const restartGame = async () => {
    const fresh = createInitialBoardState();
    dispatch(resetGameAction());
    setPieces(fresh.pieces);
    dispatch(setTurnAction("goat"));
    setTurn("goat");
    setGoatsPlaced(0);
    setGoatsKilled(0);
    setSelected(null);
    setLastMove(null);
    dispatch(setWinnerAction(null));
    setWinner(null);
    setShowTutorial(false);

    if (isOnlineGame) {
      await syncMoveToFirestore({ ...fresh, lastMove: null });
    }
  };
  const leaveMatch = async () => {
    if (isOnlineGame && session.roomId && !winner) {
      try {
        await updateGameState(session.roomId, {
          pieces,
          turn,
          goatsPlaced,
          goatsKilled,
          winner,
          lastMove,
          abandonedBy: session.playerRole, // "tiger" or "goat"
        });
      } catch (err) {
        console.error("Failed to notify opponent of leave:", err);
      }
    }

    setSession(createGameSession());
    setSelected(null);
    setWinner(null);
    setLastMove(null);
    setScreen("home");
  };

  const nextTutorial = () => {
    if (tutorialStep < tutorialCards.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      localStorage.setItem("tutorialSeen", "true");
      setShowTutorial(false);
    }
  };

  // Listen for room and game-state changes from Firestore
  // Listen for room and game-state changes from Firestore
  useEffect(() => {
    if (!session.roomId || session.status === "local") {
      return;
    }

    const unsubscribe = listenToRoom(
      session.roomId,
      (room) => {
        if (room.players && room.players.length >= 2) {
          setSession((prev) =>
            prev.status === "waiting" ? { ...prev, status: "playing" } : prev,
          );
          setScreen((currentScreen) =>
            currentScreen === "waiting" ? "game" : currentScreen,
          );
        }

        if (room.gameState) {
          const shared = room.gameState;

          if (shared.abandonedBy && shared.abandonedBy !== session.playerRole) {
            const leftRole = shared.abandonedBy === "tiger" ? "Tiger" : "Goat";
            setOpponentLeftMessage(`${leftRole} left the match.`);
            return;
          }
          if (shared.pieces) {
            setPieces(shared.pieces);
          }
          if (shared.turn) {
            setTurn(shared.turn);
          }
          if (typeof shared.goatsPlaced === "number") {
            setGoatsPlaced(shared.goatsPlaced);
          }
          if (typeof shared.goatsKilled === "number") {
            setGoatsKilled(shared.goatsKilled);
          }
          if ("winner" in shared) {
            setWinner(shared.winner);
          }
          if ("lastMove" in shared) {
            setLastMove(shared.lastMove);
          }
          setSelected(null);
        }
      },
      (error) => {
        showToast(`Connection lost: ${error.message}`);
      },
    );

    return unsubscribe;
  }, [session.roomId, session.status, session.playerRole]);

  // CAPTURE LOGIC
  // CAPTURE LOGIC (Strict straight-line collinearity check)
  function findCapture(from, to, boardPieces = pieces) {
    const p1 = points[from];
    const p3 = points[to];
    if (!p1 || !p3) return null;

    for (let mid of connections[from] || []) {
      if (boardPieces[mid] !== "goat") continue;
      if (!connections[mid]?.includes(to)) continue;
      if (connections[from]?.includes(to)) continue;

      const p2 = points[mid];
      if (!p2) continue;

      // Cross product === 0 ensures from -> mid -> to lie on an exact straight line
      const crossProduct =
        (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);

      // Ensure mid sits strictly between from and to (dot product > 0)
      const dotProduct =
        (p2.x - p1.x) * (p3.x - p2.x) + (p2.y - p1.y) * (p3.y - p2.y);

      if (Math.abs(crossProduct) < 1 && dotProduct > 0) {
        return mid;
      }
    }

    return null;
  }
  function tigerCanMove(pos, currentPieces) {
    for (let next of connections[pos] || []) {
      if (!currentPieces[next]) {
        return true;
      }
    }

    for (let mid of connections[pos] || []) {
      if (currentPieces[mid] !== "goat") continue;

      for (let landing of connections[mid] || []) {
        if (currentPieces[landing]) continue;
        if (landing === pos) continue;

        const result = findCapture(pos, landing, currentPieces);
        if (result === mid) {
          return true;
        }
      }
    }

    return false;
  }

  function allTigersBlocked(currentPieces) {
    const tigerPositions = Object.keys(currentPieces).filter(
      (key) => currentPieces[key] === "tiger",
    );

    for (let tigerId of tigerPositions) {
      if (tigerCanMove(Number(tigerId), currentPieces)) {
        return false;
      }
    }

    return true;
  }
  function getHighlightedNodes() {
    const normalMoves = new Set();
    const captureMoves = new Set();

    if (selected === null || winner) {
      return { normalMoves, captureMoves };
    }

    const pieceType = pieces[selected];
    if (!pieceType) {
      return { normalMoves, captureMoves };
    }

    // Adjacent empty nodes (for both Tiger and Goat)
    for (let next of connections[selected] || []) {
      if (!pieces[next]) {
        normalMoves.add(next);
      }
    }

    // Straight-line jump captures (Tiger only)
    if (pieceType === "tiger") {
      for (let mid of connections[selected] || []) {
        if (pieces[mid] !== "goat") continue;

        for (let landing of connections[mid] || []) {
          if (pieces[landing] || landing === selected) continue;

          if (findCapture(selected, landing, pieces) === mid) {
            captureMoves.add(landing);
          }
        }
      }
    }

    return { normalMoves, captureMoves };
  }

  const { normalMoves, captureMoves } = getHighlightedNodes();

  // Computes the next board state synchronously so both React and Firestore receive identical data
  function executeMove(from, to) {
    const pieceType = pieces[from];

    // 1. TIGER CAPTURE
    if (pieceType === "tiger") {
      const mid = findCapture(from, to, pieces);

      if (mid !== null && !pieces[to]) {
        captureAudio.play();
        const nextPieces = { ...pieces };
        nextPieces[to] = "tiger";
        delete nextPieces[from];
        delete nextPieces[mid];

        const nextGoatsKilled = goatsKilled + 1;
        let nextWinner = null;

        if (nextGoatsKilled >= 5) {
          nextWinner = "tiger";
          winAudio.play();
        } else if (allTigersBlocked(nextPieces)) {
          nextWinner = "goat";
          winAudio.play();
        }

        setPieces(nextPieces);
        setGoatsKilled(nextGoatsKilled);
        dispatch(movePieceAction(nextPieces, from, to, pieceType));
        dispatch(setGoatsKilledAction(nextGoatsKilled));
        if (nextWinner) {
          setWinner(nextWinner);
          dispatch(setWinnerAction(nextWinner));
        }

        return {
          valid: true,
          nextPieces,
          nextGoatsKilled,
          nextWinner,
        };
      }
    }

    // 2. NORMAL MOVE (GOAT + TIGER)
    if (connections[from]?.includes(to) && !pieces[to]) {
      const nextPieces = { ...pieces };
      nextPieces[to] = pieceType;
      delete nextPieces[from];

      let nextWinner = null;
      if (allTigersBlocked(nextPieces)) {
        nextWinner = "goat";
        winAudio.play();
      }

      setPieces(nextPieces);
      dispatch(movePieceAction(nextPieces, from, to, pieceType));
      if (nextWinner) {
        setWinner(nextWinner);
        dispatch(setWinnerAction(nextWinner));
      }

      return {
        valid: true,
        nextPieces,
        nextGoatsKilled: goatsKilled,
        nextWinner,
      };
    }

    return { valid: false };
  }

  function showMessage(text) {
    setMessage(text);
    setTimeout(() => {
      setMessage("");
    }, 1500);
  }

  // CLICK HANDLER
  // CLICK HANDLER
  function handleClick(id) {
    if (winner || isSyncing) return;

    // Enforce player role during online multiplayer matches
    if (isOnlineGame && session.playerRole && session.playerRole !== turn) {
      errorAudio.play();
      showMessage(`Wait for ${turn.toUpperCase()}'s turn`);
      return;
    }

    clickAudio.play();
    const piece = pieces[id];

    // GOAT PHASE 1: PLACEMENT
    if (turn === "goat" && goatsPlaced < 15) {
      if (!piece) {
        const nextPieces = {
          ...pieces,
          [id]: "goat",
        };
        const nextGoatsPlaced = goatsPlaced + 1;
        const blocked = allTigersBlocked(nextPieces);
        const nextWinner = blocked ? "goat" : null;
        const nextTurn = blocked ? "goat" : "tiger";
        const nextLastMove = { from: null, to: id };

        setPieces(nextPieces);
        setGoatsPlaced(nextGoatsPlaced);
        setLastMove(nextLastMove);
        dispatch(setGoatsPlacedAction(nextGoatsPlaced));

        if (nextWinner) {
          winAudio.play();
          dispatch(setWinnerAction("goat"));
          setWinner("goat");
        } else {
          dispatch(setTurnAction("tiger"));
          setTurn("tiger");
        }

        syncMoveToFirestore({
          pieces: nextPieces,
          turn: nextTurn,
          goatsPlaced: nextGoatsPlaced,
          goatsKilled,
          winner: nextWinner,
          lastMove: nextLastMove,
        });
      }
      return;
    }

    // TIGER TURN
    if (turn === "tiger") {
      if (piece === "tiger") {
        if (!tigerCanMove(id, pieces)) {
          if (allTigersBlocked(pieces)) {
            winAudio.play();
            dispatch(setWinnerAction("goat"));
            setWinner("goat");
            syncMoveToFirestore({
              pieces,
              turn,
              goatsPlaced,
              goatsKilled,
              winner: "goat",
              lastMove,
            });
          } else {
            errorAudio.play();
            showMessage("This tiger is blocked");
          }
          return;
        }

        setSelected(id);
        return;
      }

      if (selected === null) {
        return;
      }

      const result = executeMove(selected, id);

      if (!result.valid) {
        errorAudio.play();
        showMessage("Illegal Move");
        return;
      }

      const nextTurn = result.nextWinner ? "tiger" : "goat";
      const nextLastMove = { from: selected, to: id };
      setSelected(null);
      setLastMove(nextLastMove);
      if (!result.nextWinner) {
        dispatch(setTurnAction("goat"));
        setTurn("goat");
      }

      syncMoveToFirestore({
        pieces: result.nextPieces,
        turn: nextTurn,
        goatsPlaced,
        goatsKilled: result.nextGoatsKilled,
        winner: result.nextWinner,
        lastMove: nextLastMove,
      });
      return;
    }

    // GOAT PHASE 2: MOVEMENT
    if (turn === "goat" && goatsPlaced >= 15) {
      if (piece === "goat") {
        setSelected(id);
        return;
      }

      if (selected === null) {
        return;
      }

      const result = executeMove(selected, id);

      if (!result.valid) {
        errorAudio.play();
        showMessage("Illegal Move");
        return;
      }

      const nextTurn = result.nextWinner ? "goat" : "tiger";
      const nextLastMove = { from: selected, to: id };
      setSelected(null);
      setLastMove(nextLastMove);
      if (!result.nextWinner) {
        dispatch(setTurnAction("tiger"));
        setTurn("tiger");
      }

      syncMoveToFirestore({
        pieces: result.nextPieces,
        turn: nextTurn,
        goatsPlaced,
        goatsKilled: result.nextGoatsKilled,
        winner: result.nextWinner,
        lastMove: nextLastMove,
      });
    }
  }
  function startLocalGame() {
    setSession(createGameSession());
    restartGame();
    setScreen("game");
  }

  async function startOnlineGame() {
    if (isCreatingRoom) return;
    setIsCreatingRoom(true);

    try {
      const hostPlayer = {
        id: Date.now().toString(),
        name: getPlayerName() || "Host (Tiger)",
        role: "tiger",
      };

      const room = createRoom([hostPlayer]);
      await createRoomInFirestore(room);

      const fresh = createInitialBoardState();
      setPieces(fresh.pieces);
      setTurn("goat");
      setGoatsPlaced(0);
      setGoatsKilled(0);
      setWinner(null);
      setSelected(null);
      setLastMove(null);

      setSession((prev) => ({
        ...prev,
        roomId: room.roomId,
        status: "waiting",
        playerRole: "tiger",
      }));

      setScreen("waiting");
    } catch (error) {
      console.error("Failed to create online room:", error);
      showToast(
        `Could not create room: ${error.message}\n\nCheck your internet connection or Firebase Firestore rules.`,
      );
    } finally {
      setIsCreatingRoom(false);
    }
  }
  return (
    <div
      className="game-layout"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#050505",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {toast.text && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "12px 24px",
            borderRadius: "999px",
            background:
              toast.type === "success"
                ? "rgba(16, 185, 129, 0.95)"
                : "rgba(239, 68, 68, 0.95)",
            color: "#fff",
            fontWeight: "700",
            fontSize: "14px",
            letterSpacing: "0.4px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
          }}
        >
          {toast.text}
        </div>
      )}
      {toast.text && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "12px 24px",
            borderRadius: "999px",
            background:
              toast.type === "success"
                ? "rgba(16, 185, 129, 0.95)"
                : "rgba(239, 68, 68, 0.95)",
            color: "#fff",
            fontWeight: "700",
            fontSize: "14px",
            letterSpacing: "0.4px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
          }}
        >
          {toast.text}
        </div>
      )}
      {screen === "home" && (
        <div className="home-screen">
          <div className="background-glow glow-1"></div>
          <div className="background-glow glow-2"></div>
          <div className="background-glow glow-3"></div>
          <div className="home-content">
            <h1 className="game-title">AADU PULI AATTAM</h1>
            <p className="game-tagline">Ancient Tamil Strategy Reimagined</p>

            <button className="home-button primary" onClick={startLocalGame}>
              Play Local
            </button>

            <button
              className="home-button secondary"
              onClick={startOnlineGame}
              disabled={isCreatingRoom}
            >
              {isCreatingRoom ? "Creating Room..." : "Online Multiplayer"}
            </button>

            <button
              className="home-button secondary"
              onClick={() => setScreen("join-room")}
            >
              Join Room
            </button>

            <button
              className="home-button secondary"
              onClick={() => {
                setScreen("game");
                setShowTutorial(true);
              }}
            >
              Tutorial
            </button>
          </div>
        </div>
      )}

      {screen === "waiting" && (
        <div className="waiting-screen">
          <h1>Waiting Room</h1>
          <p>
            Room Code: <strong>{session.roomId}</strong>
          </p>
          <p>
            You are playing as:{" "}
            <strong>
              {session.playerRole === "tiger" ? "🐅 Tiger" : "🐐 Goat"}
            </strong>
          </p>
          <p style={{ opacity: 0.75 }}>Waiting for opponent...</p>

          <button
            className="home-button primary"
            onClick={async () => {
              const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${session.roomId}`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: "Aadu Puli Aattam — 1v1 Invite",
                    text: `Join my Aadu Puli Aattam match! Room Code: ${session.roomId}`,
                    url: inviteUrl,
                  });
                  return;
                } catch {
                  // Fall back to clipboard if share sheet is dismissed
                }
              }
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(inviteUrl);
                showToast("Invite Link Copied!", "success");
              } else {
                showToast(`Link: ${inviteUrl}`, "info");
              }
            }}
          >
            Share Invite Link
          </button>

          <button
            className="home-button secondary"
            onClick={async () => {
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(session.roomId);
                showToast("Room Code Copied!", "success");
              }
            }}
          >
            Copy Code Only
          </button>

          <button
            className="home-button secondary"
            onClick={() => {
              setSession(createGameSession());
              setScreen("home");
            }}
          >
            Back
          </button>
        </div>
      )}

      {screen === "join-room" && (
        <div className="waiting-screen">
          <h1>Join Room</h1>
          <input
            className="join-room-input"
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ENTER ROOM CODE"
            style={{
              textAlign: "center",
              letterSpacing: "3px",
              fontWeight: "bold",
            }}
          />

          <button
            className="home-button primary"
            onClick={async () => {
              const cleanCode = joinCode.trim().toUpperCase();
              if (!cleanCode) {
                showToast("Enter Room Code", "error");
                return;
              }

              try {
                const room = await getRoomFromFirestore(cleanCode);
                if (!room) {
                  showToast("Room Not Found", "error");
                  return;
                }

                const player = {
                  id: Date.now().toString(),
                  name: getPlayerName() || "Guest (Goat)",
                  role: "goat",
                };

                await joinRoomInFirestore(cleanCode, player);
                setSession((prev) => ({
                  ...prev,
                  roomId: cleanCode,
                  status: "waiting",
                  playerRole: "goat",
                }));
                setScreen("waiting");
              } catch (error) {
                console.error("Failed to join room:", error);
                showToast("Could not join room.", "error");
              }
            }}
          >
            Join Match
          </button>

          <button
            className="home-button secondary"
            onClick={() => setScreen("home")}
          >
            Back
          </button>
        </div>
      )}

      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            <h1>{tutorialCards[tutorialStep].title}</h1>
            <p>{tutorialCards[tutorialStep].text}</p>
            <button className="tutorial-button" onClick={nextTutorial}>
              {tutorialStep === tutorialCards.length - 1
                ? "Start Game"
                : "Next"}
            </button>
          </div>
        </div>
      )}

      {screen === "game" && (
        <div className="game-main-container">
          {opponentLeftMessage && (
            <div className="tutorial-overlay">
              <div className="tutorial-card">
                <h2>Match Ended</h2>
                <p>{opponentLeftMessage}</p>
                <button
                  className="tutorial-button"
                  onClick={() => {
                    setOpponentLeftMessage("");
                    setSession(createGameSession());
                    setSelected(null);
                    setWinner(null);
                    setLastMove(null);
                    setScreen("home");
                  }}
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
          {/* INFO PANEL */}
          <div
            className="game-sidebar"
            style={{
              background:
                "linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.92))",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              backdropFilter: "blur(10px)",
              boxShadow:
                "0 0 40px rgba(0,0,0,0.7), 0 0 12px rgba(255,255,255,0.05)",
            }}
          >
            <h1
              style={{
                textAlign: "center",
                marginBottom: "20px",
                color: "white",
                letterSpacing: "1px",
                textShadow: "0 0 12px rgba(255,255,255,0.15)",
              }}
            >
              Aadu Puli Aattam
            </h1>

            {isOnlineGame && (
              <p
                style={{
                  textAlign: "center",
                  color: "#ffd60a",
                  marginBottom: "10px",
                  fontWeight: "bold",
                }}
              >
                Room: {session.roomId} | You:{" "}
                {session.playerRole === "tiger" ? "🐅 Tiger" : "🐐 Goat"}
              </p>
            )}

            {!winner && (
              <h2
                style={{
                  textAlign: "center",
                  color: "#ddd",
                }}
              >
                Turn: {turn.toUpperCase()}
              </h2>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "10px 22px",
                  background: "rgba(255, 80, 80, 0.12)",
                  border: "1px solid rgba(255,80,80,0.45)",
                  borderRadius: "14px",
                  color: "#ff9090",
                  fontWeight: "bold",
                  letterSpacing: "0.5px",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 0 18px rgba(255,80,80,0.18)",
                  animation: "fadeIn 0.2s ease",
                }}
              >
                {message}
              </div>
            )}

            {winner && (
              <h1
                style={{
                  textAlign: "center",
                  color: winner === "tiger" ? "orange" : "lime",
                }}
              >
                {winner === "tiger" ? "🐅 Tigers Win!" : "🐐 Goats Win!"}
              </h1>
            )}

            <h3
              style={{
                color: "white",
                fontWeight: "500",
                marginBottom: "18px",
              }}
            >
              Goats Placed: {goatsPlaced}/15
            </h3>

            <h3
              style={{
                color: "white",
                fontWeight: "500",
                marginBottom: "18px",
              }}
            >
              Goats Remaining: {15 - goatsPlaced}
            </h3>

            <h3
              style={{
                color: "white",
                fontWeight: "500",
                marginBottom: "18px",
              }}
            >
              Goats Killed: {goatsKilled}
            </h3>
            <h3
              style={{
                color: "white",
                fontWeight: "500",
                marginBottom: "18px",
              }}
            >
              Tigers Blocked: {blockedTigersCount}/3
            </h3>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={toggleMute}
                className="restart-button"
                style={{ flex: 1, background: "#1f2937" }}
              >
                {isMuted ? "🔇 Unmute" : "🔊 Sound"}
              </button>
              <button
                onClick={leaveMatch}
                className="restart-button"
                style={{ flex: 1, background: "#3f1d1d" }}
              >
                Leave
              </button>
            </div>

            {winner && (
              <button onClick={restartGame} className="restart-button">
                Restart Game
              </button>
            )}
          </div>

          {/* BOARD */}
          <div
            className="game-board-container"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <svg
              viewBox="0 0 900 850"
              style={{
                height: "auto",
                filter: "drop-shadow(0 0 18px rgba(255,255,255,0.12))",
              }}
            >
              {/* LINES */}
              {Object.entries(connections).map(([from, toList]) =>
                toList.map((to) => {
                  if (Number(from) < Number(to)) {
                    const p1 = points[from];
                    const p2 = points[to];

                    return (
                      <line
                        key={`${from}-${to}`}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    );
                  }
                  return null;
                }),
              )}
              {/* LAST-MOVE CONNECTING TRAIL BEAM */}
              {lastMove?.from !== null &&
                lastMove?.from !== undefined &&
                lastMove?.to !== undefined &&
                points[lastMove.from] &&
                points[lastMove.to] && (
                  <line
                    x1={points[lastMove.from].x}
                    y1={points[lastMove.from].y}
                    x2={points[lastMove.to].x}
                    y2={points[lastMove.to].y}
                    stroke="#fbbf24"
                    strokeWidth="6"
                    strokeDasharray="10 6"
                    strokeLinecap="round"
                    opacity="0.85"
                    pointerEvents="none"
                  />
                )}
              {/* POINTS */}
              {points.map((p) => {
                const isNormalMove = normalMoves.has(p.id);
                const isCaptureMove = captureMoves.has(p.id);
                const isHighlighted = isNormalMove || isCaptureMove;
                const isLastFrom =
                  lastMove?.from === p.id &&
                  (goatsPlaced > 0 || goatsKilled > 0);
                const isLastTo =
                  lastMove?.to === p.id && (goatsPlaced > 0 || goatsKilled > 0);

                return (
                  <g key={p.id} onClick={() => handleClick(p.id)}>
                    {/* Last-Move Amber Indicator Ring */}
                    {(isLastFrom || isLastTo) && !isHighlighted && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="30"
                        fill={
                          isLastTo
                            ? "rgba(251, 191, 36, 0.16)"
                            : "rgba(251, 191, 36, 0.06)"
                        }
                        stroke={
                          isLastTo ? "#fbbf24" : "rgba(251, 191, 36, 0.55)"
                        }
                        strokeWidth={isLastTo ? "3.5" : "2.5"}
                        strokeDasharray={isLastFrom ? "5 4" : "none"}
                        pointerEvents="none"
                      />
                    )}

                    {/* Valid Move / Capture Highlight Ring */}
                    {isHighlighted && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="26"
                        fill={
                          isCaptureMove
                            ? "rgba(255, 77, 77, 0.22)"
                            : "rgba(56, 255, 179, 0.2)"
                        }
                        stroke={isCaptureMove ? "#ff4d4d" : "#38ffb3"}
                        strokeWidth="3"
                        strokeDasharray={isCaptureMove ? "6 4" : "none"}
                        style={{
                          cursor: "pointer",
                          filter: isCaptureMove
                            ? "drop-shadow(0 0 12px rgba(255, 77, 77, 0.9))"
                            : "drop-shadow(0 0 10px rgba(56, 255, 179, 0.85))",
                        }}
                      />
                    )}

                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="20"
                      fill={
                        selected === p.id
                          ? "#ffd60a"
                          : isCaptureMove
                            ? "#4a1515"
                            : isNormalMove
                              ? "#143d2e"
                              : pieces[p.id] === "tiger"
                                ? "#2d2d2d"
                                : "#1a1a1a"
                      }
                      style={{
                        cursor: isHighlighted ? "pointer" : "default",
                        filter:
                          selected === p.id
                            ? "drop-shadow(0 0 12px rgba(255,214,10,0.9))"
                            : "none",
                      }}
                    />
                  </g>
                );
              })}
              {/* PIECES */}
              {Object.entries(pieces).map(([pos, type]) => {
                const point = points[pos];
                if (!point) return null;

                const isNewlyPlacedGoat =
                  type === "goat" &&
                  lastMove?.from === null &&
                  lastMove?.to === Number(pos);

                return (
                  <g key={pos} onClick={() => handleClick(Number(pos))}>
                    {/* Pulsing Beacon Ring for Newly Placed Goat */}
                    {isNewlyPlacedGoat && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="31"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="3.5"
                        className="new-goat-ring"
                        pointerEvents="none"
                      />
                    )}

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="24"
                      fill={type === "tiger" ? "#ff9f1c" : "#38ffb3"}
                      stroke={isNewlyPlacedGoat ? "#fbbf24" : "#ffffffaa"}
                      strokeWidth={isNewlyPlacedGoat ? "5" : "4"}
                      style={{
                        transition: "all 0.25s ease",
                        filter:
                          selected === Number(pos)
                            ? type === "tiger"
                              ? "drop-shadow(0 0 22px rgba(255,140,0,1))"
                              : "drop-shadow(0 0 18px rgba(46,230,166,1))"
                            : isNewlyPlacedGoat
                              ? "drop-shadow(0 0 16px rgba(251,191,36,0.95))"
                              : type === "tiger"
                                ? "drop-shadow(0 0 14px rgba(255,140,0,0.85))"
                                : "drop-shadow(0 0 12px rgba(46,230,166,0.85))",
                      }}
                    />

                    {/* Crisp "NEW" Pill Badge on the Latest Placed Goat */}
                    {isNewlyPlacedGoat && (
                      <g pointerEvents="none">
                        <rect
                          x={point.x - 18}
                          y={point.y - 36}
                          width="36"
                          height="15"
                          rx="7.5"
                          fill="#fbbf24"
                          stroke="#111"
                          strokeWidth="1.5"
                        />
                        <text
                          x={point.x}
                          y={point.y - 25.5}
                          textAnchor="middle"
                          fill="#111"
                          fontSize="9.5"
                          fontWeight="900"
                          letterSpacing="0.5"
                        >
                          NEW
                        </text>
                      </g>
                    )}

                    <foreignObject
                      x={point.x - 14}
                      y={point.y - 14}
                      width="28"
                      height="28"
                      pointerEvents="none"
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          color: type === "tiger" ? "#111" : "#0b0b0b",
                          fontSize: "20px",
                          animation:
                            type === "tiger"
                              ? "tigerPulse 2s infinite"
                              : "goatPulse 2s infinite",
                        }}
                      >
                        {type === "tiger" ? <GiTigerHead /> : <GiGoat />}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
