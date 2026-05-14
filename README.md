# About
Codex and Claude Code have become a must-have for every developer.
This tool allows us to code directly from our phones in a friendly and flexible manner.

# How
We run this service on a developer's local server. 
For example, Mac Minis have become more and more popular and many people have some kind of always-running machine.
The service implements a web interface and an API. 
It allows for multiple projects to be configured. 

# Codex web cli
Codex CLI is very good. But it also works in a server mode and has a great API. 
This allows us to build a multi-project multi-task web CLI. 
Those are basically chats in the web version or in the app. 

# Security and authentication
The server and the interface (web or app) need to share a secret. 
The web UI exchanges that shared secret for a short-lived session token.
The token is used for backend API calls and websocket connections.

# Configurations
Besides the token - we need to configure the endpoint of our server.
So some kind of external IP address is needed. A VPN to the local network would also work.
All configuration is done in a codex-with-me.yaml file.

# Development

```bash
npm install
npm run dev
```

The default server binds to `127.0.0.1:8011`.
The React development server can be started with `npm run dev:web`.

Build both the backend and web UI:

```bash
npm run build
```

The production server serves the built UI from `/`.

Default local login secret:

```text
codex-with-me
```

Current API surface:

- `GET /health`
- `GET /api/auth/status`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/sessions`
- `POST /api/projects/:projectId/sessions`
- `GET /api/projects/:projectId/sessions/:sessionId`
- `DELETE /api/projects/:projectId/sessions/:sessionId`

Session websocket:

- `/ws/projects/:projectId/sessions/:sessionId?token=:sessionToken`

## Nginx reverse proxy

When serving Codex With Me through nginx, proxy websocket upgrades for `/ws/`
separately from normal HTTP traffic:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name your-host.example;

    location / {
        proxy_pass http://127.0.0.1:8011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

If `/ws/...` returns a JSON 404, nginx is forwarding it as a normal HTTP GET
instead of a websocket upgrade.
