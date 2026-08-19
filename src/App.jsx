import Landing, { useLiveHost } from "./Landing.jsx";
import Messenger from "./Messenger.jsx";
import WebApp from "./WebApp.jsx";
import { useEffect, useState } from "react";

function useHash() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash.replace(/^#/, "") || "/";
}

export default function App() {
  const path = useHash();
  const live = useLiveHost();
  if (path.startsWith("/app")) {
    return <Messenger live={live} />;
  }
  if (path.startsWith("/lab")) {
    return <WebApp live={live} />;
  }
  return <Landing live={live} />;
}
