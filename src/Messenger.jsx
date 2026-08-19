import { useEffect, useMemo, useState } from "react";
import {
  account,
  addContact,
  archiveChat,
  blockIdentity,
  chats as fetchChats,
  claimAlias,
  createAccount,
  joinRoom,
  lookupAlias,
  postRoom,
  restoreAccount,
  setInterests,
  setPolicy,
  talkCreateGroup,
  talkDm,
  talkInbox,
  talkInvite,
  talkRemove,
  talkSend,
  unarchiveChat,
  unblockIdentity,
} from "./api.js";
import {
  clearSeat,
  deviceSecret,
  identityHex,
  saveManifest,
  savedManifest,
  savedSeat,
} from "./vault.js";
import Nav from "./Nav.jsx";

export default function Messenger({ live }) {
  const secret = deviceSecret();
  const [password, setPassword] = useState("pw");
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(
    live ? "Create an identity, or restore the one on this device." : "Start reedhold-host to chat."
  );
  const [book, setBook] = useState(null);
  const [nick, setNick] = useState("");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [topic, setTopic] = useState("mesh");
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const [threads, setThreads] = useState({});
  const [sheet, setSheet] = useState(null);
  const [panel, setPanel] = useState(false);
  const [vault, setVault] = useState(false);

  const me = session ? identityHex(session.identity) : "";

  function loadBook() {
    return fetchChats().then((next) => {
      setBook(next);
      setThreads(next.threads || {});
      if (next.nick) {
        setNick(next.nick);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!live || !savedSeat()) {
      return;
    }
    account()
      .then((view) => {
        setSession(view);
        return loadBook();
      })
      .catch(() => {});
  }, [live]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }
    const timer = setInterval(() => {
      talkInbox()
        .then((items) => {
          if (items.length) {
            return loadBook();
          }
          return null;
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, [session]);

  const all = useMemo(() => chatItems(book), [book]);
  const hidden = book?.privacy?.archived || [];
  const list = all.filter((item) => hidden.includes(item.id) === vault);
  const current = all.find((item) => item.key === active);
  const messages = current ? threads[current.id] || current.posts || [] : [];

  function onCreate() {
    createAccount(password, secret)
      .then((created) => {
        setSession(created.account);
        saveManifest(created.manifest.manifest_hex);
        setStatus("Identity created. Claim a nick — it never enters crypto.");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onRestore() {
    const manifest = savedManifest();
    if (!manifest) {
      setStatus("No stored manifest on this browser.");
      return;
    }
    restoreAccount(manifest, password, secret)
      .then((view) => {
        setSession(view);
        setStatus("Restored.");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onClaim() {
    claimAlias(nick)
      .then((alias) => {
        setNick(alias.nick);
        setStatus(`You're @${alias.nick} in public. Packets still carry only keys.`);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onSearch() {
    lookupAlias(query)
      .then((alias) => setFound(alias))
      .catch((error) => {
        setFound(null);
        setStatus(error.message);
      });
  }

  function onAddFound() {
    if (!found) {
      return;
    }
    addContact(found.identity, found.messaging_public, found.nick)
      .then(() => {
        setActive(`dm:${found.identity}`);
        setFound(null);
        setQuery("");
        setSheet(null);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onGroup() {
    talkCreateGroup(groupName || "group")
      .then((group) => {
        setGroupName("");
        setSheet(null);
        setActive(`group:${group.id}`);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onJoin() {
    joinRoom(topic)
      .then((room) => {
        setSheet(null);
        setActive(`room:${room.id}`);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onPolicy(name) {
    setPolicy(name).then(loadBook).catch((error) => setStatus(error.message));
  }

  function onBlock() {
    if (!current || !current.identity) {
      return;
    }
    blockIdentity(current.identity)
      .then(() => {
        setActive(null);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onArchive() {
    if (!current) {
      return;
    }
    const hidden = (book?.privacy?.archived || []).includes(current.id);
    const call = hidden ? unarchiveChat(current.id) : archiveChat(current.id);
    call
      .then(() => {
        if (!hidden) {
          setActive(null);
        }
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onSignOut() {
    clearSeat();
    setSession(null);
    setBook(null);
    setThreads({});
    setActive(null);
    setSheet(null);
    setStatus("Signed out. Restore with your password on this browser.");
  }

  function onAdopt() {
    if (!current || !current.identity) {
      return;
    }
    addContact(current.identity, current.messaging_public, "")
      .then(() => {
        setActive(null);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onInterest(name) {
    const selected = new Set(book?.interests || []);
    if (selected.has(name)) {
      selected.delete(name);
    } else {
      selected.add(name);
    }
    setInterests([...selected]).then(loadBook).catch((error) => setStatus(error.message));
  }

  function onSend() {
    const text = draft.trim();
    if (!text || !current) {
      return;
    }
    const send =
      current.kind === "dm"
        ? talkDm(current.identity, current.messaging_public, text)
        : current.kind === "group"
          ? talkSend(current.id, text)
          : postRoom(current.topic, text);
    // The host keeps the author's copy, so the reload is the source of truth
    // and a refresh no longer loses what you just wrote.
    send
      .then(() => {
        setDraft("");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  return (
    <div className="shell">
      <Nav live={live} />
      {!session ? (
        <section className="card gate">
          <p className="kicker">Welcome</p>
          <h1>Step into Reedhold</h1>
          <p className="note">{status}</p>
          <label>
            Password — unlocks the vault, is not the identity
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <div className="actions">
            <button className="btn" type="button" onClick={onCreate}>
              Create identity
            </button>
            <button className="btn ghost" type="button" onClick={onRestore}>
              Restore
            </button>
          </div>
        </section>
      ) : (
        <div className="app-frame">
          <aside className="tg-side">
            <div className="side-head">
              <h2>Chats</h2>
              <p className="note">{book?.nick ? `@${book.nick}` : "Claim a public nick"}</p>
            </div>
            <div className="side-tools">
              <button className="btn ghost" type="button" onClick={() => setSheet("people")}>
                People
              </button>
              <button className="btn ghost" type="button" onClick={() => setSheet("group")}>
                Group
              </button>
              <button className="btn ghost" type="button" onClick={() => setSheet("room")}>
                Public
              </button>
              <button className="btn ghost" type="button" onClick={() => setSheet("account")}>
                Account
              </button>
              {hidden.length ? (
                <button className="btn ghost" type="button" onClick={() => setVault(!vault)}>
                  {vault ? "Back" : `Archived ${hidden.length}`}
                </button>
              ) : null}
            </div>
            {sheet === "account" ? (
              <div className="sheet">
                <p className="note">
                  You are <strong>{book?.nick ? `@${book.nick}` : "unnamed"}</strong>
                </p>
                <p className="note">Identity {fingerprint(me)}…</p>
                <label>
                  Public nick
                  <input value={nick} onChange={(event) => setNick(event.target.value)} />
                </label>
                <button className="btn" type="button" onClick={onClaim}>
                  Save nick
                </button>
                <p className="note">
                  Topics decide what reaches you. Pick at least one under Public.
                </p>
                <p className="note">Who may write to you</p>
                <div className="chips">
                  {[
                    ["everyone", "Everyone"],
                    ["contacts", "Contacts only"],
                    ["nobody", "Nobody new"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={book?.privacy?.policy === value ? "chip on" : "chip"}
                      onClick={() => onPolicy(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="note">
                  Strangers never land in the main list — they wait in Requests until you
                  add them.
                </p>
                {(book?.privacy?.blocked || []).length ? (
                  <>
                    <p className="note">Blocked</p>
                    {(book.privacy.blocked || []).map((identity) => (
                      <button
                        key={identity}
                        className="btn ghost"
                        type="button"
                        onClick={() =>
                          unblockIdentity(identity)
                            .then(loadBook)
                            .catch((error) => setStatus(error.message))
                        }
                      >
                        Unblock {fingerprint(identity)}
                      </button>
                    ))}
                  </>
                ) : null}
                <button className="btn ghost" type="button" onClick={onSignOut}>
                  Sign out
                </button>
                <p className="note">
                  Signing out drops this seat only. The recovery manifest stays on this browser,
                  and the password is never stored.
                </p>
              </div>
            ) : null}
            {sheet === "people" ? (
              <div className="sheet">
                <label>
                  Your public nick
                  <input value={nick} placeholder="alice" onChange={(event) => setNick(event.target.value)} />
                </label>
                <button className="btn" type="button" onClick={onClaim}>
                  Claim nick
                </button>
                <label>
                  Find someone
                  <input value={query} placeholder="@bob" onChange={(event) => setQuery(event.target.value)} />
                </label>
                <button className="btn ghost" type="button" onClick={onSearch}>
                  Search
                </button>
                {found ? (
                  <div className="found">
                    <strong>@{found.nick}</strong>
                    <button className="btn" type="button" onClick={onAddFound}>
                      Add
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {sheet === "group" ? (
              <div className="sheet">
                <label>
                  Group name
                  <input value={groupName} placeholder="ops" onChange={(event) => setGroupName(event.target.value)} />
                </label>
                <button className="btn" type="button" onClick={onGroup}>
                  Create group
                </button>
              </div>
            ) : null}
            {sheet === "room" ? (
              <div className="sheet">
                <div className="chips">
                  {(book?.catalog || []).map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={book?.interests?.includes(name) ? "chip on" : "chip"}
                      onClick={() => onInterest(name)}
                    >
                      #{name}
                    </button>
                  ))}
                </div>
                <label>
                  Topic
                  <input value={topic} onChange={(event) => setTopic(event.target.value)} />
                </label>
                <button className="btn" type="button" onClick={onJoin}>
                  Join public chat
                </button>
              </div>
            ) : null}
            <ul className="tg-list">
              {list.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={item.key === active ? "row on" : "row"}
                    onClick={() => {
                      setActive(item.key);
                      setSheet(null);
                    }}
                  >
                    <span className="dot" style={{ background: item.tint }} />
                    <span className="row-text">
                      <strong>{item.title}</strong>
                      <em>{item.hint}</em>
                    </span>
                    <span>{item.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="tg-pane">
            {current ? (
              <>
                <header className="tg-head">
                  <h2>{current.title}</h2>
                  <p className="note">{describe(current)}</p>
                  {current.kind === "group" ? (
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => setPanel(!panel)}
                    >
                      {panel ? "Close settings" : "Group settings"}
                    </button>
                  ) : null}
                </header>
                {current.kind === "group" && panel ? (
                  <div className="sheet">
                    <p className="note">Group id {current.id}</p>
                    <p className="note">
                      {(current.members || []).length} member
                      {(current.members || []).length === 1 ? "" : "s"} ·{" "}
                      {current.you_admin ? "you are the owner" : "owned by someone else"}
                    </p>
                    <p className="note">
                      The name is a local label. Two groups may share it; the id is what is
                      unique. Only the owner can invite or remove, and removing rotates the
                      epoch key so the old member cannot read what comes next.
                    </p>
                  </div>
                ) : null}
                {current.kind === "request" || current.kind === "dm" ? (
                  <div className="admin">
                    {current.kind === "request" ? (
                      <button type="button" onClick={onAdopt}>
                        Add to contacts
                      </button>
                    ) : null}
                    <button type="button" onClick={onArchive}>
                      {(book?.privacy?.archived || []).includes(current.id)
                        ? "Unarchive"
                        : "Archive"}
                    </button>
                    <button type="button" onClick={onBlock}>
                      Block
                    </button>
                  </div>
                ) : null}
                <ol className="tg-feed">
                  {messages.map((msg, index) => (
                    <li
                      key={`${msg.from}-${index}`}
                      className={msg.from === me ? "bubble mine" : "bubble"}
                    >
                      <span>{label(book, msg.from, me)}</span>
                      {msg.text}
                    </li>
                  ))}
                </ol>
                {current.kind === "group" && current.you_admin && panel ? (
                  <div className="admin">
                    {(book?.contacts || []).map((contact) => (
                      <button
                        key={contact.identity}
                        type="button"
                        onClick={() =>
                          talkInvite(current.id, contact.identity, contact.messaging_public)
                            .then(loadBook)
                            .catch((error) => setStatus(error.message))
                        }
                      >
                        Invite {contact.petname || "contact"}
                      </button>
                    ))}
                    {(current.members || [])
                      .filter((id) => id !== me)
                      .map((member) => (
                        <button
                          key={member}
                          type="button"
                          onClick={() =>
                            talkRemove(current.id, member)
                              .then(loadBook)
                              .catch((error) => setStatus(error.message))
                          }
                        >
                          Remove member
                        </button>
                      ))}
                  </div>
                ) : null}
                <form
                  className="tg-compose"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSend();
                  }}
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message"
                  />
                  <button className="btn" type="submit">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="empty">
                <img src="/empty.jpg" alt="" />
                <h2>Pick a chat</h2>
                <p className="note">{status}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function chatItems(book) {
  if (!book) {
    return [];
  }
  return [
    ...(book.contacts || []).map((contact) => {
      const now = (book.nicks || {})[contact.identity] || "";
      const known = contact.known_nick || "";
      // A rename must be visible. Silently swapping the name someone was saved
      // under is how a recycled nick gets mistaken for the person who left it.
      const renamed = now && known && now !== known;
      return {
        key: `dm:${contact.identity}`,
        // The transcript is keyed by conversation, never by identity.
        id: contact.conversation,
        kind: "dm",
        title: now ? `@${now}` : contact.petname ? `@${contact.petname}` : "Contact",
        hint: renamed
          ? `was @${known} · ${fingerprint(contact.identity)}`
          : fingerprint(contact.identity),
        tint: tint(contact.identity),
        identity: contact.identity,
        messaging_public: contact.messaging_public,
        posts: [],
      };
    }),
    ...(book.groups || []).map((group) => ({
      key: `group:${group.id}`,
      id: group.id,
      kind: "group",
      title: group.name,
      // Names are labels, ids are identity. Two groups may share a name, so
      // the row has to show which one this is.
      hint: `${fingerprint(group.id)} · ${(group.members || []).length} member${
        (group.members || []).length === 1 ? "" : "s"
      }`,
      tint: tint(group.id),
      you_admin: group.you_admin,
      members: group.members,
      posts: [],
    })),
    ...(book.rooms || []).map((room) => ({
      key: `room:${room.id}`,
      id: room.id,
      kind: "room",
      title: `#${room.topic}`,
      hint: "open to anyone on this topic",
      tint: tint(room.id),
      topic: room.topic,
      posts: room.posts || [],
    })),
    // Someone not in the address book wrote. Without a row their message
    // arrives and is never shown, which reads as "not delivered".
    ...(book.requests || []).map((request) => ({
      key: `request:${request.identity}`,
      id: request.conversation,
      kind: "request",
      title: `Unknown · ${fingerprint(request.identity)}`,
      hint: `${request.count} message${request.count === 1 ? "" : "s"} · not a contact`,
      tint: tint(request.identity),
      identity: request.identity,
      messaging_public: request.messaging_public,
      posts: [],
    })),
  ];
}

/// A group you do not own is still a group, never a direct message.
function describe(item) {
  if (item.kind === "group") {
    return item.you_admin ? "Private group · you are the owner" : "Private group · invite only";
  }
  if (item.kind === "room") {
    return "Public room · aliases stay off the wire";
  }
  if (item.kind === "request") {
    return "Not in your contacts yet";
  }
  return "Direct message · keys only";
}

/// Short, stable stamp so two same-named chats never look identical.
function fingerprint(hex) {
  return hex ? hex.slice(0, 6) : "";
}

/// Deterministic hue from the id. Same chat, same colour, on every device.
function tint(hex) {
  if (!hex) {
    return "hsl(0 0% 80%)";
  }
  const hue = parseInt(hex.slice(0, 4), 16) % 360;
  return `hsl(${hue} 42% 72%)`;
}

function label(book, from, me) {
  if (from === me) {
    return book?.nick ? `@${book.nick}` : "You";
  }
  const contact = (book?.contacts || []).find((item) => item.identity === from);
  return contact?.petname ? `@${contact.petname}` : "Peer";
}
