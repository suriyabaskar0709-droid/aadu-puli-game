import React, { useState } from "react";
import { points, connections } from "./data/board";
import { GiTigerHead, GiGoat } from "react-icons/gi";
import { Howl } from "howler";
import clickSound from "./sounds/click.wav";
import captureSound from "./sounds/capture.mp3";
import winSound from "./sounds/win.mp3";
import warningSound from "./sounds/error.mp3";
import "./App.css";

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

  const clickAudio = new Howl({
    src: [clickSound],
    volume: 0.4,
  });

  const captureAudio = new Howl({
    src: [captureSound],
    volume: 0.7,
  });

  const winAudio = new Howl({
    src: [winSound],
    volume: 0.8,
  });
  const errorAudio = new Howl({
    src: [warningSound],
    volume: 0.5,
  });

  console.log("TURN:", turn, "SELECTED:", selected);
  const restartGame = () => {
    window.location.reload();
  };
  const nextTutorial = () => {
    if (tutorialStep < tutorialCards.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      localStorage.setItem("tutorialSeen", "true");
      setShowTutorial(false);
    }
  };
  const [screen, setScreen] = useState("home");
  // 🔥 CAPTURE LOGIC (FINAL)
  function findCapture(from, to) {
    for (let mid of connections[from] || []) {
      if (pieces[mid] !== "goat") continue;

      if (!connections[mid]?.includes(to)) continue;

      // ❌ prevent direct move
      if (connections[from].includes(to)) continue;

      // 🔥 KEY: check straight-line (no bend)

      // find common nodes between from & to
      const common = (connections[from] || []).filter((n) =>
        (connections[to] || []).includes(n),
      );

      // if more than 1 shared path → likely bend → reject
      if (
        common.length > 1 &&
        !(from >= 1 && from <= 6 && to >= 1 && to <= 6)
      ) {
        continue;
      }

      return mid;
    }

    return null;
  }
  function tigerCanMove(pos, currentPieces) {
    // 🟢 NORMAL MOVES
    for (let next of connections[pos] || []) {
      if (!currentPieces[next]) {
        return true;
      }
    }

    // 🔥 CAPTURE MOVES
    for (let mid of connections[pos] || []) {
      // must be goat
      if (currentPieces[mid] !== "goat") continue;

      // check jump destination
      for (let landing of connections[mid] || []) {
        // landing must be empty
        if (currentPieces[landing]) continue;

        // landing cannot be original position
        if (landing === pos) continue;

        // must form valid capture
        const result = findCapture(pos, landing);

        if (result === mid) {
          return true;
        }
      }
    }

    return false;
  }
  function checkGoatWin(currentPieces) {
    const tigerPositions = Object.keys(currentPieces).filter(
      (k) => currentPieces[k] === "tiger",
    );

    for (let pos of tigerPositions) {
      if (tigerCanMove(Number(pos), currentPieces)) {
        return false;
      }
    }

    return true;
  }
  // 🔥 MOVE FUNCTION
  function movePiece(from, to) {
    const pieceType = pieces[from];

    // 🔥 TIGER CAPTURE
    if (pieceType === "tiger") {
      const mid = findCapture(from, to);

      if (mid !== null && !pieces[to]) {
        captureAudio.play();
        setPieces((prev) => {
          const newState = { ...prev };

          newState[to] = "tiger";
          delete newState[from];
          delete newState[mid];

          // 🐐 GOAT WIN CHECK
          if (checkGoatWin(newState)) {
            winAudio.play();
            setWinner("goat");

            setTimeout(() => {
              winAudio.play();
              // showMessage("🐐 Goats Win!");
            }, 100);
          }

          return newState;
        });

        setGoatsKilled((prev) => {
          const updated = prev + 1;

          if (updated >= 5) {
            setWinner("tiger");
            winAudio.play();
            // showMessage("🐅 Tigers Win!");
          }

          return updated;
        });
        return true; // ✅ VALID MOVE
      }
    }

    // 🟢 NORMAL MOVE (GOAT + TIGER)
    if (connections[from]?.includes(to) && !pieces[to]) {
      setPieces((prev) => {
        const newState = { ...prev };

        newState[to] = pieceType;
        delete newState[from];

        // 🐐 GOAT WIN CHECK
        if (checkGoatWin(newState)) {
          setWinner("goat");

          setTimeout(() => {
            winAudio.play();
            // showMessage("🐐 Goats Win!");
          }, 100);
        }

        return newState;
      });

      return true;
    }
    return false;
  }
  function showMessage(text) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 1500);
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

  // 🔥 CLICK HANDLER (FIXED CLEANLY)
  function handleClick(id) {
    clickAudio.play();
    if (winner) return;
    const piece = pieces[id];

    // 🐐 PHASE 1: GOAT PLACEMENT
    if (turn === "goat" && goatsPlaced < 15) {
      if (!piece) {
        setPieces((prev) => ({
          ...prev,
          [id]: "goat",
        }));
        setGoatsPlaced((prev) => prev + 1);
        const updatedPieces = {
          ...pieces,
          [id]: "goat",
        };

        if (allTigersBlocked(updatedPieces)) {
          winAudio.play();
          setWinner("goat");
        } else {
          setTurn("tiger");
        }
      }
      return;
    }

    // 🐅 TIGER TURN (ALWAYS WORKS)
    if (turn === "tiger") {
      // 🔥 selecting tiger
      if (piece === "tiger") {
        // ❌ trapped tiger cannot be selected
        if (!tigerCanMove(id, pieces)) {
          // check if ALL tigers trapped
          const tigerPositions = Object.keys(pieces).filter(
            (key) => pieces[key] === "tiger",
          );

          const anyTigerCanMove = tigerPositions.some((tigerId) =>
            tigerCanMove(Number(tigerId), pieces),
          );

          // 🐐 goats win
          if (!anyTigerCanMove) {
            winAudio.play();
            setWinner("goat");
          }

          return;
        }

        setSelected(id);
        return;
      }

      // no tiger selected yet
      if (selected === null) {
        return;
      }

      const moved = movePiece(selected, id);

      if (!moved) {
        errorAudio.play();
        showMessage("Illegal Move");
        return;
      }

      setSelected(null);
      setTurn("goat");
      return;
    }
    // 🐐 PHASE 2: GOAT MOVEMENT
    if (turn === "goat" && goatsPlaced >= 15) {
      if (piece === "goat") {
        setSelected(id);
        return;
      }

      if (selected === null) {
        return;
      }

      const moved = movePiece(selected, id);

      if (!moved) {
        errorAudio.play();
        showMessage("Illegal Move");

        // allow selecting another goat

        return;
      }

      setSelected(null);

      const updatedPieces = {
        ...pieces,
        [selected]: null,
        [id]: "goat",
      };

      if (allTigersBlocked(updatedPieces)) {
        winAudio.play();
        setWinner("goat");
      } else {
        setTurn("tiger");
      }
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
      {screen === "home" && (
        <div className="home-screen">
          <div className="background-glow glow-1"></div>
          <div className="background-glow glow-2"></div>
          <div className="background-glow glow-3"></div>
          <div className="home-content">
            <h1 className="game-title">AADU PULI AATTAM</h1>

            <p className="game-tagline">Ancient Tamil Strategy Reimagined</p>

            <button
              className="home-button primary"
              onClick={() => setScreen("game")}
            >
              Play Local
            </button>

            <button className="home-button secondary">
              Online Multiplayer
              <span>Coming Soon</span>
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
          {/* INFO PANEL */}
          <div
            className="game-sidebar"
            style={{
              // width: "280px",
              background:
                "linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.92))",
              border: "1px solid rgba(255,255,255,0.12)",
              // borderRadius: "20px",
              // padding: "24px",
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
            {!winner && (
              <h2
                style={{
                  textAlign: "center",
                  color: "#ddd",
                }}
              >
                Turn: {turn}
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
              // flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <svg
              viewBox="0 0 900 850"
              style={{
                // width: "min(75vw, 850px)",
                height: "auto",
                // maxHeight: "90vh",
                filter: "drop-shadow(0 0 18px rgba(255,255,255,0.12))",
              }}
            >
              {/* LINES */}
              {Object.entries(connections).map(([from, toList]) =>
                toList.map((to) => {
                  if (from < to) {
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

              {/* POINTS */}
              {points.map((p) => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r="20"
                  fill={
                    selected === p.id
                      ? "#ffd60a"
                      : pieces[p.id] === "tiger"
                        ? "#2d2d2d"
                        : "#1a1a1a"
                  }
                  style={{
                    filter:
                      selected === p.id
                        ? "drop-shadow(0 0 12px rgba(255,214,10,0.9))"
                        : "none",
                  }}
                  onClick={() => handleClick(p.id)}
                />
              ))}

              {/* PIECES */}
              {Object.entries(pieces).map(([pos, type]) => {
                const point = points[pos];

                return (
                  <g key={pos} onClick={() => handleClick(Number(pos))}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="24"
                      fill={type === "tiger" ? "#ff9f1c" : "#38ffb3"}
                      stroke="#ffffffaa"
                      strokeWidth="4"
                      style={{
                        transition: "all 0.25s ease",
                        filter:
                          selected === Number(pos)
                            ? type === "tiger"
                              ? "drop-shadow(0 0 22px rgba(255,140,0,1))"
                              : "drop-shadow(0 0 18px rgba(46,230,166,1))"
                            : type === "tiger"
                              ? "drop-shadow(0 0 14px rgba(255,140,0,0.85))"
                              : "drop-shadow(0 0 12px rgba(46,230,166,0.85))",
                      }}
                    />

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
