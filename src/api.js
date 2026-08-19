const base = "";

async function json(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "request failed");
  }
  return data;
}

export function health() {
  return json("/health");
}

export function invariants() {
  return json("/v1/invariants");
}

export function advertisingLimits() {
  return json("/v1/advertising/limits");
}

export function createAccount(password, deviceSecret) {
  return json("/v1/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, device_secret: deviceSecret }),
  });
}

export function restoreAccount(manifestHex, password, deviceSecret) {
  return json("/v1/account/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest_hex: manifestHex,
      password,
      device_secret: deviceSecret,
    }),
  });
}

export function emit(kind, payload) {
  return json("/v1/account/emit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payload }),
  });
}

export function history() {
  return json("/v1/account/history");
}
