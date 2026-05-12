import React, { useState } from "react";
import { points, connections } from "./data/board";

function App() {
  const [pieces, setPieces] = useState({
    0: "tiger",
    3: "tiger",
    4: "tiger",
  });

  const [selected, setSelected] = useState(null);
  const [turn, setTurn] = useState("goat");
  const [goatsPlaced, setGoatsPlaced] = useState(0);
  const [goatsKilled, setGoatsKilled] = useState(0);
  const [winner, setWinner] = useState(null);

  console.log("TURN:", turn, "SELECTED:", selected);

  // 🔥 CAPTURE LOGIC (FINAL)
  function findCapture(from, to) {
    for (let mid of connections[from] || []) {
      if (pieces[mid] !== "goat") continue;

      if (!connections[mid]?.includes(to)) continue;

      // ❌ prevent direct move
      if (connections[from].includes(to)) continue;

      // 🔥 KEY: check straight-line (no bend)
      const fromNeighbors = connections[from] || [];
      const midNeighbors = connections[mid] || [];

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
        setPieces((prev) => {
          const newState = { ...prev };

          newState[to] = "tiger";
          delete newState[from];
          delete newState[mid];

          // 🐐 GOAT WIN CHECK
          if (checkGoatWin(newState)) {
            setWinner("goat");

            setTimeout(() => {
              alert("🐐 Goats Win!");
            }, 100);
          }

          return newState;
        });

        setGoatsKilled((prev) => {
          const updated = prev + 1;

          if (updated >= 5) {
            setWinner("tiger");

            setTimeout(() => {
              alert("🐅 Tigers Win!");
            }, 100);
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
            alert("🐐 Goats Win!");
          }, 100);
        }

        return newState;
      });

      return true;
    }
    return false;
  }

  // 🔥 CLICK HANDLER (FIXED CLEANLY)
  function handleClick(id) {
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
        setTurn("tiger");
      }
      return;
    }

    // 🐅 TIGER TURN (ALWAYS WORKS)
    if (turn === "tiger") {
      // 🔥 selecting tiger
      if (piece === "tiger") {
        setSelected(id);
        return;
      }

      // no tiger selected yet
      if (selected === null) {
        return;
      }

      const moved = movePiece(selected, id);

      if (!moved) {
        alert("❌ Invalid move! Try again.");
        return;
      }

      setSelected(null);
      setTurn("goat");
      return;
    }
    // 🐐 PHASE 2: GOAT MOVEMENT
    if (turn === "goat" && goatsPlaced >= 15) {
      if (selected === null) {
        if (piece === "goat") {
          setSelected(id);
        }
        return;
      }

      const moved = movePiece(selected, id);

      if (!moved) {
        alert("❌ Invalid move!");

        // allow selecting another goat
        setSelected(null);

        return;
      }

      setSelected(null);
      setTurn("tiger");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#050505",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          height: "100vh",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: "40px",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        {/* INFO PANEL */}
        <div
          style={{
            width: "280px",
            background:
              "linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.92))",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "24px",
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
            }}
          >
            Aadu Puli Attam
          </h1>

          <h2
            style={{
              textAlign: "center",
              color: "#ddd",
            }}
          >
            Turn: {turn}
          </h2>

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
              marginBottom: "14px",
            }}
          >
            Goats Placed: {goatsPlaced}/15
          </h3>

          <h3
            style={{
              color: "white",
              fontWeight: "500",
              marginBottom: "14px",
            }}
          >
            Goats Remaining: {15 - goatsPlaced}
          </h3>

          <h3
            style={{
              color: "white",
              fontWeight: "500",
              marginBottom: "14px",
            }}
          >
            Goats Killed: {goatsKilled}
          </h3>
        </div>

        {/* BOARD */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg
            viewBox="0 0 900 650"
            style={{
              width: "min(75vw, 850px)",
              height: "auto",
              maxHeight: "90vh",
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
                <circle
                  key={pos}
                  cx={point.x}
                  cy={point.y}
                  r="18"
                  fill={type === "tiger" ? "#ff9f1c" : "#38ffb3"}
                  stroke="#ffffffaa"
                  strokeWidth="3"
                  onClick={() => handleClick(Number(pos))}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
export default App;
