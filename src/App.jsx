import { useEffect, useState } from "react";
import {
  advertisingLimits,
  createAccount,
  durableDemo,
  emit,
  health,
  history,
  invariants,
  restoreAccount,
} from "./api.js";

const repos = [
  ["reedhold", "protocol library", "https://github.com/sergii-ziborov/reedhold"],
  ["reedhold-host", "JSON HTTP API", "https://github.com/sergii-ziborov/reedhold-host"],
  ["reedhold-swift", "iOS 14 / macOS 11", "https://github.com/sergii-ziborov/reedhold-swift"],
  ["reedhold-site", "this site", "https://github.com/sergii-ziborov/reedhold-site"],
];

function deviceSecret() {
  const stored = window.localStorage.getItem("reedhold.device");
  if (stored) {
    return stored;
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  window.localStorage.setItem("reedhold.device", hex);
  return hex;
}

export default function App() {
  const [host, setHost] = useState("checking host…");
  const [rules, setRules] = useState([]);
  const [ads, setAds] = useState(null);
  const [password, setPassword] = useState("pw");
  const [identity, setIdentity] = useState("");
  const [note, setNote] = useState("Create an identity. The password only unlocks the vault.");
  const [log, setLog] = useState([]);
  const [grid, setGrid] = useState("4-of-6: put a payload, kill two holders, still read it.");
  const secret = deviceSecret();

  useEffect(() => {
    health()
      .then(() => {
        setHost("reedhold-host is up");
        return Promise.all([invariants(), advertisingLimits()]);
      })
      .then(([nextRules, nextAds]) => {
        setRules(nextRules);
        setAds(nextAds);
      })
      .catch(() => {
        setHost("start reedhold-host on 127.0.0.1:4783 to try the host");
      });
  }, []);

  function onCreate() {
    createAccount(password, secret)
      .then((created) => {
        setIdentity(created.account.identity);
        window.localStorage.setItem("reedhold.manifest", created.manifest.manifest_hex);
        setNote(`vault epoch ${created.manifest.epoch}. store the manifest, not the password.`);
      })
      .catch((error) => setNote(error.message));
  }

  function onRestore() {
    const manifest = window.localStorage.getItem("reedhold.manifest");
    if (!manifest) {
      setNote("create an identity first so a manifest is stored");
      return;
    }
    restoreAccount(manifest, password, secret)
      .then((account) => {
        setIdentity(account.identity);
        setNote(`restored sequence ${account.sequence}`);
      })
      .catch((error) => setNote(error.message));
  }

  function onEmit() {
    emit("post", "hello from the site")
      .then((event) => {
        setNote(`signed ${event.kind} seq ${event.sequence}`);
        return history();
      })
      .then((events) => setLog(events.map((event) => `${event.sequence} ${event.kind}`)))
      .catch((error) => setNote(error.message));
  }

  return (
    <main>
      <p className="kicker">Reedhold</p>
      <h1>A social mesh that keeps holding.</h1>
      <p className="lead">
        Recoverable identity, signed events, erasure storage, and a market
        token that cannot run the network. The protocol lives in Rust. This
        site is React + Vite. The phone app is Swift. There is no Kotlin.
      </p>
      <p className="status">{host}</p>
      <ul className="repos">
        {repos.map(([name, role, href]) => (
          <li key={name}>
            <a href={href}>{name}</a>
            <span>{role}</span>
          </li>
        ))}
      </ul>
      <section className="try">
        <h2>Try the host</h2>
        <p className="note">{note}</p>
        {identity ? <p className="identity">{identity}</p> : null}
        <label>
          password
          <input value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div className="actions">
          <button type="button" onClick={onCreate}>Create</button>
          <button type="button" onClick={onRestore}>Restore</button>
          <button type="button" onClick={onEmit}>Emit post</button>
        </div>
        {log.length > 0 ? (
          <ol>
            {log.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        ) : null}
      </section>
      <section className="try">
        <h2>Durable grid</h2>
        <p className="note">{grid}</p>
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              durableDemo()
                .then((result) => {
                  setGrid(
                    `${result.coding} recovered “${result.payload}” after two holders died.`
                  );
                })
                .catch((error) => setGrid(error.message));
            }}
          >
            Kill two holders
          </button>
        </div>
      </section>
      {ads ? (
        <p className="note">
          Genesis advertising token is market-only: decrypt={String(ads.decrypt)},
          halt={String(ads.halt_network)}.
        </p>
      ) : null}
      {rules.length > 0 ? (
        <section>
          <h2>Protocol invariants</h2>
          <ol>
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
