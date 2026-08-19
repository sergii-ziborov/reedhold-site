import { useEffect, useMemo, useState } from "react";
import {
  account,
  addContact,
  chats as fetchChats,
  claimAlias,
  createAccount,
  joinRoom,
  lookupAlias,
  postRoom,
  restoreAccount,
  setInterests,
  talkCreateGroup,
  talkDm,
  talkInbox,
  talkInvite,
  talkRemove,
  talkSend,
} from "./api.js";
import { deviceSecret, identityHex, saveManifest, savedManifest, savedSeat } from "./vault.js";
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

  const me = session ? identityHex(session.identity) : "";

  function loadBook() {
    return fetchChats().then((next) => {
      setBook(next);
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
            setThreads((prev) => mergeInbox(prev, items));
          }
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, [session]);

  const list = useMemo(() => chatItems(book), [book]);
  const current = list.find((item) => item.key === active);
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
          ? talkSend(current.id, text).then(() => ({ conversation: current.id, from: me, text }))
          : postRoom(current.topic, text).then((post) => ({
              conversation: current.id,
              from: post.from,
              text: post.text,
            }));
    send
      .then((sent) => {
        setDraft("");
        setThreads((prev) =>
          pushMsg(prev, sent.conversation || current.id, {
            from: sent.from || me,
            text: sent.text || text,
          })
        );
        if (current.kind === "room") {
          return loadBook();
        }
        return null;
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
            </div>
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
                    <strong>{item.title}</strong>
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
                  <p className="note">
                    {current.kind === "group" && current.you_admin
                      ? "You admin this group"
                      : current.kind === "room"
                        ? "Public room · aliases stay off the wire"
                        : "Direct message · keys only"}
                  </p>
                </header>
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
                {current.kind === "group" && current.you_admin ? (
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
    ...(book.contacts || []).map((contact) => ({
      key: `dm:${contact.identity}`,
      id: contact.identity,
      kind: "dm",
      title: contact.petname ? `@${contact.petname}` : "Contact",
      identity: contact.identity,
      messaging_public: contact.messaging_public,
      posts: [],
    })),
    ...(book.groups || []).map((group) => ({
      key: `group:${group.id}`,
      id: group.id,
      kind: "group",
      title: group.name,
      you_admin: group.you_admin,
      members: group.members,
      posts: [],
    })),
    ...(book.rooms || []).map((room) => ({
      key: `room:${room.id}`,
      id: room.id,
      kind: "room",
      title: `#${room.topic}`,
      topic: room.topic,
      posts: room.posts || [],
    })),
  ];
}

function label(book, from, me) {
  if (from === me) {
    return book?.nick ? `@${book.nick}` : "You";
  }
  const contact = (book?.contacts || []).find((item) => item.identity === from);
  return contact?.petname ? `@${contact.petname}` : "Peer";
}

function pushMsg(prev, conversation, msg) {
  const list = prev[conversation] ? [...prev[conversation], msg] : [msg];
  return { ...prev, [conversation]: list };
}

function mergeInbox(prev, items) {
  return items.reduce(
    (next, item) => pushMsg(next, item.conversation, { from: item.from, text: item.text }),
    prev
  );
}
