# reedhold-site

Public site for [reedhold.com](https://reedhold.com): landing plus a web
client. React + Vite. Hash routes (`#/` landing, `#/app` the web app) so
Cloudflare Pages does not need a rewrite for the app.

This is not the protocol. It talks to
[reedhold-host](https://github.com/sergii-ziborov/reedhold-host) over JSON.

```sh
# terminal 1
cd ../reedhold-host
cargo run

# terminal 2
npm install
npm run dev
```

Local: [http://127.0.0.1:5173](http://127.0.0.1:5173) (or the next free port).
The Vite proxy sends `/v1` and `/health` to `127.0.0.1:4783`.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Custom domain: `reedhold.com`
- Optional: `VITE_API` if the host is not same-origin (for example a Worker later)

`public/_redirects` maps every path to `index.html`.

The recovery manifest stays in `localStorage`. The password is never stored.

```text
reedhold            protocol
reedhold-host       JSON HTTP
reedhold-swift      iOS / macOS
reedhold-app        native desktop
reedhold-site       this site
```

> Prototype. Not independently audited.

## License

MIT.
