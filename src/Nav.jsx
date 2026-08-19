export default function Nav({ live, extra }) {
  return (
    <header className="nav">
      <a className="brand" href="#/">
        <img src="/mark.jpg" alt="" width="36" height="36" />
        Reedhold
      </a>
      <nav>
        <a href="#/app">Chats</a>
        <a href="#/lab">Lab</a>
        <a href="https://github.com/sergii-ziborov/reedhold">GitHub</a>
        {extra}
        <span className={live ? "pill on" : "pill"}>{live ? "Live" : "Offline"}</span>
      </nav>
    </header>
  );
}
