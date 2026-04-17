const joinForm = byId("join-form");
const nameInput = byId("name-input");

async function refreshLobby() {
  try {
    const state = await getState();
    setText("join-phase", labelPhase(state.phase));
    setText("join-count", String(state.playerCount));
    setText("join-price", `${state.impliedProbability}%`);
  } catch (error) {
    showMessage("join-message", error.message);
  }
}

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage("join-message");

  try {
    const response = await requestJson("/api/join", {
      method: "POST",
      body: JSON.stringify({ name: nameInput.value })
    });
    setStoredPlayerId(response.playerId);
    window.location.href = "/play";
  } catch (error) {
    showMessage("join-message", error.message);
  }
});

redirectToPlayIfJoined();
refreshLobby();
setInterval(refreshLobby, POLL_MS);
