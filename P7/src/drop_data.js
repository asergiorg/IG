import dropsData from "../data/drops.json";

export function loadDropData() {
  if (!Array.isArray(dropsData.players)) {
    throw new Error(
      "El fichero drops.json debe contener un array 'players'."
    );
  }

  for (const player of dropsData.players) {
    if (
      typeof player.id === "undefined" ||
      !Array.isArray(player.pixel) ||
      player.pixel.length !== 2
    ) {
      throw new Error(
        "Cada jugador debe tener 'id' y 'pixel: [x, y]'."
      );
    }
  }

  return dropsData.players;
}