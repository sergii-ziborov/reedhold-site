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
import { deviceSecret, identityHex, saveManifest, savedManifest } from "./vault.js";

export default function Messenger({ live }) {
  const secret = deviceSecret();
  const [password, setPassword] = useState("pw");
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(
    live ? "create or restore. your nick is not your identity." : "start reedhold-host"
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
    if (!live) {
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
          if (!items.length) {
            return;
          }
          setThreads((prev) => mergeInbox(prev, items));
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, [session]);

  const list = useMemo(() => chatItems(book), [book]);
  const current = list.find((item) => item.key === active);

  function onCreate() {
    createAccount(password, secret)
      .then((created) => {
        setSession(created.account);
        saveManifest(created.manifest.manifest_hex);
        setStatus("identity created. claim a public nick — it never enters crypto.");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onRestore() {
    const manifest = savedManifest();
    if (!manifest) {
      setStatus("no stored manifest");
      return;
    }
    restoreAccount(manifest, password, secret)
      .then((view) => {
        setSession(view);
        setStatus("restored");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onClaim() {
    claimAlias(nick)
      .then((alias) => {
        setNick(alias.nick);
        setStatus(`public @${alias.nick}. packets still carry only identity hex.`);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onSearch() {
    lookupAlias(query)
      .then((alias) => {
        setFound(alias);
        setStatus(`found @${alias.nick}`);
      })
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
        setFound(null);
        setQuery("");
        setStatus(`added @${found.nick} as a local contact`);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onGroup() {
    talkCreateGroup(groupName || "group")
      .then((group) => {
        setGroupName("");
        setActive(`group:${group.id}`);
        setStatus(`you admin “${group.name}”`);
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onJoin() {
    joinRoom(topic)
      .then((room) => {
        setActive(`room:${room.id}`);
        setStatus(`joined #${room.topic}`);
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
    setInterests([...selected])
      .then(() => loadBook())
      .catch((error) => setStatus(error.message));
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
          ? talkSend(current.id, text).then(() => ({
              conversation: current.id,
              from: me,
              text,
            }))
          : postRoom(current.topic, text).then((post) => ({
              conversation: current.id,
              from: post.from,
              text: post.text,
            }));
    send
      .then((sent) => {
        setDraft("");
        setThreads((prev) => pushMsg(prev, sent.conversation || current.id, {
          from: sent.from || me,
          text: sent.text || text,
        }));
        if (current.kind === "room") {
          return loadBook();
        }
        return null;
      })
      .catch((error) => setStatus(error.message));
  }

  function onInvite(contact) {
    if (!current || current.kind !== "group") {
      return;
    }
    talkInvite(current.id, contact.identity, contact.messaging_public)
      .then(() => {
        setStatus("invite sent");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  function onKick(member) {
    if (!current || current.kind !== "group") {
      return;
    }
    talkRemove(current.id, member)
      .then(() => {
        setStatus("removed; epoch rotated");
        return loadBook();
      })
      .catch((error) => setStatus(error.message));
  }

  const messages = current ? threads[current.id] || current.posts || [] : [];

  return (
    <div className="page messenger">
      <header className="nav">
        <a className="brand" href="#/">
          reedhold.com
        </a>
        <nav>
          <a href="#/lab">Lab</a>
          <span className={live ? "pill on" : "pill"}>{live ? "host live" : "offline"}</span>
        </nav>
      </header>

      {!session ? (
        <section className="gate">
          <h1>Chats</h1>
          <p className="note">{status}</p>
          <label>
            password — unlocks the vault, is not the identity
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <div className="actions">
            <button type="button" onClick={onCreate}>Create</button>
            <button type="button" onClick={onRestore}>Restore</button>
          </div>
        </section>
      ) : (
        <div className="tg">
          <aside className="tg-side">
            <p className="note">{status}</p>
            <label>
              public nick
              <input value={nick} placeholder="alice" onChange={(event) => setNick(event.target.value)} />
            </label>
            <button type="button" onClick={onClaim}>Claim</button>
            <label>
              find people
              <input value={query} placeholder="@bob" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="actions">
              <button type="button" onClick={onSearch}>Search</button>
              <button type="button" onClick={onAddFound} disabled={!found}>Add</button>
            </div>
            {found ? <p className="note">@{found.nick}</p> : null}
            <label>
              new group
              <input value={groupName} placeholder="ops" onChange={(event) => setGroupName(event.target.value)} />
            </label>
            <button type="button" onClick={onGroup}>Create group</button>
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
              public topic
              <input value={topic} onChange={(event) => setTopic(event.target.value)} />
            </label>
            <button type="button" onClick={onJoin}>Join public chat</button>
            <ul className="tg-list">
              {list.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={item.key === active ? "row on" : "row"}
                    onClick={() => setActive(item.key)}
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
                    {current.kind === "group" && current.you_admin ? "you admin this group" : current.kind}
                  </p>
                </header>
                <ol className="tg-feed">
                  {messages.map((msg, index) => (
                    <li key={`${msg.from}-${index}`} className={msg.from === me ? "mine" : ""}>
                      <span>{label(book, msg.from, me)}</span>
                      {msg.text}
                    </li>
                  ))}
                </ol>
                {current.kind === "group" && current.you_admin ? (
                  <div className="admin">
                    <p className="note">admin</p>
                    {(book?.contacts || []).map((contact) => (
                      <button key={contact.identity} type="button" onClick={() => onInvite(contact)}>
                        invite {contact.petname || "contact"}
                      </button>
                    ))}
                    {(current.members || []).filter((id) => id !== me).map((member) => (
                      <button key={member} type="button" onClick={() => onKick(member)}>
                        remove member
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
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="message" />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : (
              <p className="note">pick a chat. nicks are public aliases; crypto never sees them.</p>
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
  const contacts = (book.contacts || []).map((contact) => ({
    key: `dm:${contact.identity}`,
    id: contact.identity,
    kind: "dm",
    title: contact.petname ? `@${contact.petname}` : "contact",
    identity: contact.identity,
    messaging_public: contact.messaging_public,
    posts: [],
  }));
  const groups = (book.groups || []).map((group) => ({
    key: `group:${group.id}`,
    id: group.id,
    kind: "group",
    title: group.name,
    you_admin: group.you_admin,
    members: group.members,
    posts: [],
  }));
  const rooms = (book.rooms || []).map((room) => ({
    key: `room:${room.id}`,
    id: room.id,
    kind: "room",
    title: `#${room.topic}`,
    topic: room.topic,
    posts: room.posts || [],
  }));
  return [...contacts, ...groups, ...rooms];
}

function label(book, from, me) {
  if (from === me) {
    return book?.nick ? `@${book.nick}` : "you";
  }
  const contact = (book?.contacts || []).find((item) => item.identity === from);
  if (contact?.petname) {
    return `@${contact.petname}`;
  }
  return "peer";
}

function pushMsg(prev, conversation, msg) {
  const list = prev[conversation] ? [...prev[conversation], msg] : [msg];
  return { ...prev, [conversation]: list };
}

function mergeInbox(prev, items) {
  let next = prev;
  items.forEach((item) => {
    next = pushMsg(next, item.conversation, { from: item.from, text: item.text });
  });
  return next;
}
