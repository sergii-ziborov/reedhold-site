# reedhold-site

Public site for [Reedhold](https://github.com/sergii-ziborov/reedhold).
React + Vite.

This is not the protocol. It does not import mesh internals. In
development it proxies `/v1` and `/health` to
[reedhold-host](https://github.com/sergii-ziborov/reedhold-host).

There is no Kotlin / Android surface.

```sh
npm install
npm run dev
```

Needs `reedhold-host` on `127.0.0.1:4783` for live invariants, create,
restore, signed posts, and the durable-grid demo (put, kill two holders,
still read). The recovery manifest stays in `localStorage`.

```text
reedhold            protocol
reedhold-host       JSON HTTP
reedhold-swift      iOS / macOS
reedhold-site       this site
```

## License

MIT.
