const KEY = "langust_sea_battle_v1";

const defaultState = {
  name: "Боєць",
  level: 1,
  rank: "Новачок",
  currentRound: 1,
  shipsSunk: 0,
  shahedsDown: 0,
  bgSound: true,
  music: true,
  vibro: true,
};

function loadProgress() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved
      ? { ...defaultState, ...JSON.parse(saved) }
      : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

export const player = loadProgress();

export function saveProgress() {
  localStorage.setItem(KEY, JSON.stringify(player));
}

export function resetProgress() {
  player.level = defaultState.level;
  player.rank = defaultState.rank;
  player.currentRound = 1;
  player.shipsSunk = 0;
  player.shahedsDown = 0;
  saveProgress();
}
