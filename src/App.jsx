import { useEffect, useState } from "react";
import { advertisingLimits, health, invariants } from "./api.js";

const repos = [
  ["reedhold", "protocol library", "https://github.com/sergii-ziborov/reedhold"],
  ["reedhold-host", "JSON HTTP API", "https://github.com/sergii-ziborov/reedhold-host"],
  ["reedhold-swift", "iOS 14 / macOS 11", "https://github.com/sergii-ziborov/reedhold-swift"],
  ["reedhold-site", "this site", "https://github.com/sergii-ziborov/reedhold-site"],
];

export default function App() {
  const [host, setHost] = useState("checking host…");
  const [rules, setRules] = useState([]);
  const [ads, setAds] = useState(null);

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
        setHost("start reedhold-host on 127.0.0.1:4783 to see live invariants");
      });
  }, []);

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
