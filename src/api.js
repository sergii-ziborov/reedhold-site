const base = "";

export async function health() {
  const response = await fetch(`${base}/health`);
  if (!response.ok) {
    throw new Error("host is not running");
  }
  return response.json();
}

export async function invariants() {
  const response = await fetch(`${base}/v1/invariants`);
  if (!response.ok) {
    throw new Error("could not load invariants");
  }
  return response.json();
}

export async function advertisingLimits() {
  const response = await fetch(`${base}/v1/advertising/limits`);
  if (!response.ok) {
    throw new Error("could not load advertising limits");
  }
  return response.json();
}
