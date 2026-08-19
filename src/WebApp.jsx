import { useEffect, useState } from "react";
import {
  account as fetchAccount,
  chainCommit,
  chainHead,
  chainOpen,
  combineShares,
  createAccount,
  durableGet,
  durableKill,
  durableOpen,
  durablePut,
  emit,
  history as fetchHistory,
  restoreAccount,
  splitRecovery,
  talkCreateGroup,
  talkOpen,
} from "./api.js";
import {
  deviceSecret,
  fillerPeers,
  holderId,
  identityHex,
  saveManifest,
  savedManifest,
} from "./vault.js";

const tabs = ["feed", "recover", "hold", "circle"];

export default function WebApp({ live }) {
  const secret = deviceSecret();
  const [password, setPassword] = useState("pw");
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(
    live ? "create an identity, or restore the stored manifest" : "start reedhold-host on 127.0.0.1:4783"
  );
  const [tab, setTab] = useState("feed");
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState([]);
  const [shares, setShares] = useState([]);
  const [held, setHeld] = useState("");
  const [objectId, setObjectId] = useState("");
  const [circle, setCircle] = useState(null);
  const [head, setHead] = useState(null);

  useEffect(() => {
    if (!live) {
      return;
    }
    fetchAccount()
      .then((view) => {
        setSession(view);
        return fetchHistory();
      })
      .then(setLog)
      .catch(() => {});
  }, [live]);

  function remember(view, manifest) {
    setSession(view);
    if (manifest) {
      saveManifest(manifest.manifest_hex);
    }
  }

  function onCreate() {
    createAccount(password, secret)
      .then((created) => {
        remember(created.account, created.manifest);
        setStatus(`vault epoch ${created.manifest.epoch}. the password is not the identity.`);
      })
      .catch((error) => setStatus(error.message));
  }

  function onRestore() {
    const manifest = savedManifest();
    if (!manifest) {
      setStatus("no stored manifest yet");
      return;
    }
    restoreAccount(manifest, password, secret)
      .then((view) => {
        remember(view);
        setStatus(`restored sequence ${view.sequence}`);
        return fetchHistory();
      })
      .then((events) => events && setLog(events))
      .catch((error) => setStatus(error.message));
  }

  function onPost() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    emit("post", text)
      .then(() => {
        setDraft("");
        setStatus("signed post");
        return fetchHistory();
      })
      .then(setLog)
      .catch((error) => setStatus(error.message));
  }

  function onSplit() {
    splitRecovery(2, 3)
      .then((next) => {
        setShares(next);
        setStatus("2-of-3 shares. one share cannot restore the account.");
      })
      .catch((error) => setStatus(error.message));
  }

  function onCombine() {
    if (shares.length < 3) {
      setStatus("split first");
      return;
    }
    combineShares([shares[0], shares[2]], 2, password, secret)
      .then((created) => {
        remember(created.account, created.manifest);
        setStatus("restored from shares 1 and 3");
      })
      .catch((error) => setStatus(error.message));
  }

  function onHold() {
    const holders = [1, 2, 3, 4, 5, 6, 7, 8].map(holderId);
    const text = held.trim() || "still here";
    durableOpen(holders, holderId(99))
      .then(() => durablePut(text, "critical"))
      .then((stored) => {
        setObjectId(stored.id);
        const liveHolders = stored.holders.filter(Boolean);
        return durableKill(liveHolders[0])
          .then(() => durableKill(liveHolders[1]))
          .then(() => durableGet(stored.id));
      })
      .then((got) => setStatus(`4-of-6 recovered “${got.payload}” after two holders died`))
      .catch((error) => setStatus(error.message));
  }

  function onCircle() {
    if (!session) {
      return;
    }
    const me = identityHex(session.identity);
    talkOpen(1, fillerPeers(me), 2)
      .then(() => talkCreateGroup("room"))
      .then((group) => {
        setCircle(group);
        setStatus(`circle ${group.name}, epoch ${group.epoch}`);
      })
      .catch((error) => setStatus(error.message));
  }

  function onCheckpoint() {
    if (!session) {
      return;
    }
    const root = identityHex(session.identity);
    chainOpen()
      .then(() => chainCommit(1, root, "", ""))
      .then(() => chainHead())
      .then((next) => {
        setHead(next);
        setStatus(`header ${next.height}, ${next.encoded_len} bytes, no message body`);
      })
      .catch((error) => setStatus(error.message));
  }

  return (
    <div className="page app">
      <header className="nav">
        <a className="brand" href="#/">
          reedhold.com
        </a>
        <nav>
          <a href="#/">Landing</a>
          <span className={live ? "pill on" : "pill"}>{live ? "host live" : "offline"}</span>
        </nav>
      </header>

      <section className="gate">
        <h1>Web</h1>
        <p className="note">{status}</p>
        {session ? <p className="identity">{session.identity}</p> : null}
        <label>
          password — unlocks the vault, is not the identity
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={onCreate}>
            Create
          </button>
          <button type="button" onClick={onRestore}>
            Restore
          </button>
        </div>
      </section>

      {session ? (
        <>
          <div className="tabs">
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                className={tab === name ? "tab on" : "tab"}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {tab === "feed" ? (
            <section className="panel">
              <textarea
                rows={4}
                value={draft}
                placeholder="a signed post. the host stores the event, not a profile."
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="actions">
                <button type="button" onClick={onPost}>
                  Sign post
                </button>
                <button type="button" onClick={onCheckpoint}>
                  Compact checkpoint
                </button>
              </div>
              {head ? (
                <p className="note">
                  chain height {head.height} · {head.encoded_len} bytes · {head.hash.slice(0, 16)}…
                </p>
              ) : null}
              <ol className="feed">
                {log.map((event) => (
                  <li key={event.event_hex || `${event.sequence}-${event.kind}`}>
                    <span>{event.sequence}</span> {event.kind}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {tab === "recover" ? (
            <section className="panel">
              <p className="note">Split the unlocked seed. Combine any two shares to restore.</p>
              <div className="actions">
                <button type="button" onClick={onSplit}>
                  Split 2-of-3
                </button>
                <button type="button" onClick={onCombine} disabled={shares.length < 3}>
                  Combine 1 + 3
                </button>
              </div>
              {shares.map((share) => (
                <p key={share.index} className="identity">
                  share {share.index}: {share.body_hex.slice(0, 24)}…
                </p>
              ))}
            </section>
          ) : null}

          {tab === "hold" ? (
            <section className="panel">
              <p className="note">Reed-Solomon 4-of-6. Company is never a required holder.</p>
              <textarea
                rows={3}
                value={held}
                placeholder="bytes to hold"
                onChange={(event) => setHeld(event.target.value)}
              />
              <div className="actions">
                <button type="button" onClick={onHold}>
                  Put, kill two, read
                </button>
              </div>
              {objectId ? <p className="identity">{objectId}</p> : null}
            </section>
          ) : null}

          {tab === "circle" ? (
            <section className="panel">
              <p className="note">
                Small groups with a shared epoch key. Leave rotates it. This process is one
                identity; other members live on other hosts.
              </p>
              <div className="actions">
                <button type="button" onClick={onCircle}>
                  Create circle
                </button>
              </div>
              {circle ? (
                <p className="identity">
                  {circle.name} · {circle.members.length} members · {circle.id.slice(0, 16)}…
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
