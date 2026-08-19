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

function holder(byte) {
  return byte.toString(16).padStart(2, "0").repeat(32);
}

export function durableDemo() {
  const holders = [1, 2, 3, 4, 5, 6, 7, 8].map(holder);
  const headers = { "Content-Type": "application/json" };
  return json("/v1/durable/open", {
    method: "POST",
    headers,
    body: JSON.stringify({ holders, company: holder(99) }),
  })
    .then(() =>
      json("/v1/durable/put", {
        method: "POST",
        headers,
        body: JSON.stringify({ payload: "still here" }),
      })
    )
    .then((stored) => {
      const live = stored.holders.filter((id) => id);
      return json("/v1/durable/kill", {
        method: "POST",
        headers,
        body: JSON.stringify({ holder: live[0] }),
      })
        .then(() =>
          json("/v1/durable/kill", {
            method: "POST",
            headers,
            body: JSON.stringify({ holder: live[1] }),
          })
        )
        .then(() =>
          json("/v1/durable/get", {
            method: "POST",
            headers,
            body: JSON.stringify({ id: stored.id }),
          })
        )
        .then((got) => ({
          id: stored.id,
          coding: `${stored.k}-of-${stored.n}`,
          payload: got.payload,
        }));
    });
}
