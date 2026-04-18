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
      if (common.length > 1) continue;

      return mid;
    }

    return null;
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

          return newState;
        });

        setGoatsKilled((prev) => prev + 1);
        return true; // ✅ VALID MOVE
      }
    }

    // 🟢 NORMAL MOVE (GOAT + TIGER)
    if (connections[from]?.includes(to) && !pieces[to]) {
      setPieces((prev) => {
        const newState = { ...prev };

        newState[to] = pieceType;
        delete newState[from];

        return newState;
      });

      return true; // ✅ VALID MOVE
    }

    return false; // ❌ INVALID MOVE
  }

  // 🔥 CLICK HANDLER (FIXED CLEANLY)
  function handleClick(id) {
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
      if (selected === null) {
        if (piece === "tiger") {
          setSelected(id);
        }
        return;
      }

      const moved = movePiece(selected, id);

      if (!moved) {
        alert("❌ Invalid move! Try again.");
        return; // 🔥 DO NOT CHANGE TURN
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
