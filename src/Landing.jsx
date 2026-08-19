import { useEffect, useState } from "react";
import { advertisingLimits, health } from "./api.js";

const repos = [
  ["Protocol", "https://github.com/sergii-ziborov/reedhold"],
  ["Host", "https://github.com/sergii-ziborov/reedhold-host"],
  ["Swift", "https://github.com/sergii-ziborov/reedhold-swift"],
  ["Site", "https://github.com/sergii-ziborov/reedhold-site"],
];

const claims = [
  {
    title: "Identity you can recover",
    body: "A password unlocks a vault. It is never the identity. Split the seed into k-of-n shares; one share is useless.",
  },
  {
    title: "State that keeps holding",
    body: "Signed events, a 4-of-6 erasure grid, and compact chain headers. Kill two holders. The object is still there.",
  },
  {
    title: "A market that cannot rule",
    body: "The genesis advertising token may sell attention. It cannot decrypt, halt the network, or seize an account.",
  },
];

export default function Landing({ live }) {
  const [ads, setAds] = useState(null);

  useEffect(() => {
    if (!live) {
      return;
    }
    advertisingLimits().then(setAds).catch(() => {});
  }, [live]);

  return (
    <div className="page landing">
      <header className="nav">
        <a className="brand" href="#/">
          reedhold.com
        </a>
        <nav>
          <a href="#/app">App</a>
          <a href="https://github.com/sergii-ziborov/reedhold">GitHub</a>
        </nav>
      </header>

      <section className="hero">
        <p className="kicker">Reedhold</p>
        <h1>A social mesh that keeps holding.</h1>
        <p className="lead">
          Recoverable cryptographic identity, signed social events, and
          storage that survives its creator. Chats look like Telegram;
          nicks are public aliases and never enter the crypto. The protocol
          is Rust. The phone client is Swift. This is the public web.
        </p>
        <div className="actions">
          <a className="btn" href="#/app">
            Open the web app
          </a>
          <span className={live ? "pill on" : "pill"}>{live ? "host live" : "host offline"}</span>
        </div>
      </section>

      <section className="claims">
        {claims.map((claim) => (
          <article key={claim.title}>
            <h2>{claim.title}</h2>
            <p>{claim.body}</p>
          </article>
        ))}
      </section>

      <section className="rules">
        <h2>What the protocol already refuses</h2>
        <ul>
          <li>A company host is never required, and blocking it is not fatal.</li>
          <li>Human handles are aliases. Identity is <code>reedhold:identity:&lt;hex&gt;</code>.</li>
          <li>Reputation is not a token. It cannot be sent or sold.</li>
          <li>Ads select on topic and bucket only. There is no user-id targeting API.</li>
          <li>Work credits move. Contribution history stays with the node that earned it.</li>
        </ul>
        {ads ? (
          <p className="note">
            Genesis token: decrypt={String(ads.decrypt)}, halt={String(ads.halt_network)},
            seize={String(ads.seize_account)}, market_only={String(ads.market_only)}.
          </p>
        ) : null}
      </section>

      <section className="repos">
        <h2>Source</h2>
        <ul>
          {repos.map(([name, href]) => (
            <li key={name}>
              <a href={href}>{name}</a>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <p>Prototype. Not independently audited. Do not use for real secrets yet.</p>
        <p>reedhold.com · MIT</p>
      </footer>
    </div>
  );
}

export function useLiveHost() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    health()
      .then(() => setLive(true))
      .catch(() => setLive(false));
  }, []);
  return live;
}
