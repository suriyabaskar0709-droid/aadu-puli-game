export function savePlayerName(name) {
  localStorage.setItem("aaduPlayerName", name);
}

export function getPlayerName() {
  return localStorage.getItem("aaduPlayerName") || "";
}
