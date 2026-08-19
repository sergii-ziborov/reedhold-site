const DEVICE = "reedhold.device";
const MANIFEST = "reedhold.manifest";

export function deviceSecret() {
  const stored = window.localStorage.getItem(DEVICE);
  if (stored) {
    return stored;
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  window.localStorage.setItem(DEVICE, hex);
  return hex;
}

export function savedManifest() {
  return window.localStorage.getItem(MANIFEST) || "";
}

export function saveManifest(hex) {
  window.localStorage.setItem(MANIFEST, hex);
}

export function identityHex(uri) {
  const parts = uri.split(":");
  return parts[parts.length - 1] || uri;
}

export function fillerPeers(selfHex) {
  const extras = [10, 11, 12, 13, 14, 15, 16].map((byte) =>
    byte.toString(16).padStart(2, "0").repeat(32)
  );
  return [selfHex, ...extras];
}

export function holderId(byte) {
  return byte.toString(16).padStart(2, "0").repeat(32);
}
