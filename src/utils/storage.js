// Thin wrapper around localStorage. Every read/write in the app goes through
// here so Cowork/Tier 2 has one place to swap in a real backend later.

export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Failed to read localStorage key "${key}"`, err);
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write localStorage key "${key}"`, err);
  }
}

export function removeKey(key) {
  localStorage.removeItem(key);
}
