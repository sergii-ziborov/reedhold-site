import { useEffect, useState } from "react";
import { advertisingLimits, health } from "./api.js";
import Nav from "./Nav.jsx";

const claims = [
  {
    n: "01",
    title: "Identity you can recover",
    body: "A password unlocks a vault. It is never the identity. Split the seed; one share is useless.",
  },
  {
    n: "02",
    title: "Chats that keep holding",
    body: "Direct messages, admin groups, public rooms. Nicks are aliases. Crypto never sees them.",
  },
  {
    n: "03",
    title: "A market that cannot rule",
    body: "Ads may sell attention. They cannot decrypt, halt the network, or seize an account.",
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
    <div className="shell">
      <Nav live={live} />
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">reedhold.com</p>
          <h1>A social mesh that keeps holding.</h1>
          <p className="lead">
            Recoverable identity, signed chats, and storage that survives its
            creator. The protocol is Rust. The phone app is Swift. This is the
            web.
          </p>
          <div className="actions">
            <a className="btn" href="#/app">
              Open chats
            </a>
            <a className="btn ghost" href="#/lab">
              Protocol lab
            </a>
          </div>
        </div>
        <img className="hero-art" src="/hero.jpg" alt="" />
      </section>

      <section className="claims">
        {claims.map((claim) => (
          <article className="card" key={claim.title}>
            <span className="num">{claim.n}</span>
            <h2>{claim.title}</h2>
            <p>{claim.body}</p>
          </article>
        ))}
      </section>

      <section className="rules card">
        <h2>What the protocol already refuses</h2>
        <ul>
          <li>A company host is never required.</li>
          <li>Handles are aliases. Identity is cryptographic.</li>
          <li>Reputation cannot be sent or sold.</li>
          <li>Ads cannot target a user id.</li>
          <li>Popularity is not consensus.</li>
        </ul>
        {ads ? (
          <p className="note">
            Genesis token stays market-only — decrypt {String(ads.decrypt)}, halt{" "}
            {String(ads.halt_network)}.
          </p>
        ) : null}
      </section>

      <footer>
        <p>Prototype. Not independently audited.</p>
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
