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
        return;
      }

      setSelected(null);
      setTurn("tiger");
    }
  }

  return (
    <div
      style={{
        background: "#111",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <h1 style={{ textAlign: "center" }}>Aadu Puli Attam</h1>
      <h2 style={{ textAlign: "center" }}>Turn: {turn}</h2>
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

      <h3 style={{ textAlign: "center" }}>Goats Placed: {goatsPlaced}/15</h3>

      <h3 style={{ textAlign: "center" }}>
        Goats Remaining: {15 - goatsPlaced}
      </h3>

      <h3 style={{ textAlign: "center", color: "red" }}>
        Goats Killed: {goatsKilled}
      </h3>

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <svg
          width="900"
          height="650"
          viewBox="0 0 900 650"
          style={{ minWidth: "900px" }}
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
                    stroke="white"
                    strokeWidth="3"
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
              r="25"
              fill={
                selected === p.id
                  ? "yellow"
                  : pieces[p.id] === "tiger"
                    ? "#555"
                    : "#bbb"
              }
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
                r="22"
                fill={type === "tiger" ? "orange" : "lime"}
                stroke="black"
                strokeWidth="2"
                onClick={() => handleClick(Number(pos))}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default App;
