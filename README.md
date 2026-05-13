# gemini-light-reddit-reader-1.1

A lightweight Reddit reader with an old-Reddit aesthetic. No accounts, no tracking, no JavaScript frameworks — just an Express proxy and plain HTML.

Built with [Google Gemini](https://gemini.google.com) and [Claude](https://claude.ai).

## Features

- Browse any subreddit by name with autocomplete
- Sort by hot, new, top, or rising — with time filter for top
- Reddit-wide search with relevance, hot, new, top, and comments sorts
- Post scores and comment counts on every listing
- Thumbnail images from post previews; subreddit Snoo icons for self-posts
- Threaded comments viewer with color-coded depth levels and collapse/expand
- **Card view** — toggle between classic list and a responsive card grid; choice persists across sessions
- **Card images** open full-screen in a lightbox (tap image, Escape or tap outside to dismiss)
- Classic old-Reddit look and feel

## Stack

- **Backend:** Node.js + Express, proxies Reddit's public JSON APIs
- **Frontend:** Plain HTML, CSS, and vanilla JavaScript — no build step
- **Deployment:** Single Docker container

## Running

```bash
docker compose up --build
```

Then open [http://localhost:8888](http://localhost:8888).

To access from another machine on the network, use the host's IP address on port 8888.
