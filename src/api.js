const base = import.meta.env.VITE_API || "";

async function json(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "request failed");
  }
  return data;
}

function post(path, body) {
  return json(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  return post("/v1/account", { password, device_secret: deviceSecret });
}

export function restoreAccount(manifestHex, password, deviceSecret) {
  return post("/v1/account/restore", {
    manifest_hex: manifestHex,
    password,
    device_secret: deviceSecret,
  });
}

export function account() {
  return json("/v1/account");
}

export function emit(kind, payload) {
  return post("/v1/account/emit", { kind, payload });
}

export function history() {
  return json("/v1/account/history");
}

export function splitRecovery(threshold, total) {
  return post("/v1/account/split", { threshold, total });
}

export function combineShares(shares, threshold, password, deviceSecret) {
  return post("/v1/account/combine", {
    shares,
    threshold,
    password,
    device_secret: deviceSecret,
  });
}

export function talkOpen(epoch, candidates, relayCount) {
  return post("/v1/talk/open", {
    epoch,
    candidates,
    relay_count: relayCount,
  });
}

export function talkCreateGroup(name) {
  return post("/v1/talk/group", { name });
}

export function talkInbox() {
  return json("/v1/talk/inbox");
}

export function durableOpen(holders, company) {
  return post("/v1/durable/open", { holders, company });
}

export function durablePut(payload, tier) {
  return post("/v1/durable/put", { payload, tier });
}

export function durableKill(holder) {
  return post("/v1/durable/kill", { holder });
}

export function durableGet(id) {
  return post("/v1/durable/get", { id });
}

export function chainOpen() {
  return post("/v1/chain/open", {});
}

export function chainCommit(epoch, identity, groups, storage) {
  return post("/v1/chain/commit", { epoch, identity, groups, storage });
}

export function chainHead() {
  return json("/v1/chain/head");
}

export function claimAlias(nick) {
  return post("/v1/alias", { nick });
}

export function lookupAlias(nick) {
  return post("/v1/alias/lookup", { nick });
}

export function chats() {
  return json("/v1/chats");
}

export function addContact(identity, messagingPublic, petname) {
  return post("/v1/contacts", {
    identity,
    messaging_public: messagingPublic,
    petname,
  });
}

export function talkDm(to, toMsgPub, plaintext) {
  return post("/v1/talk/dm", { to, to_msg_pub: toMsgPub, plaintext });
}

export function talkInvite(group, member, memberMsgPub) {
  return post("/v1/talk/invite", {
    group,
    member,
    member_msg_pub: memberMsgPub,
  });
}

export function talkSend(group, plaintext) {
  return post("/v1/talk/send", { group, plaintext });
}

export function talkRemove(group, member) {
  return post("/v1/talk/remove", { group, member });
}

export function joinRoom(topic) {
  return post("/v1/rooms/join", { topic });
}

export function postRoom(topic, text) {
  return post("/v1/rooms/post", { topic, text });
}

export function setInterests(topics) {
  return post("/v1/interests", { topics });
}
