# gemini-light-reddit-reader-1.0

A lightweight Reddit reader with an old-Reddit aesthetic. No accounts, no tracking, no JavaScript frameworks — just an RSS feed proxy and plain HTML.

Built with [Google Gemini](https://gemini.google.com) and [Claude](https://claude.ai).

## Features

- Browse any subreddit by name
- Thumbnail images from post previews
- Threaded comments viewer
- Classic old-Reddit look and feel

## Stack

- **Backend:** Node.js + Express, proxies Reddit's public RSS and JSON APIs
- **Frontend:** Plain HTML, CSS, and vanilla JavaScript — no build step
- **Deployment:** Single Docker container

## Running

```bash
docker compose up --build
```

Then open [http://localhost:8888](http://localhost:8888).

To access from another machine on the network, use the host's IP address on port 8888.
