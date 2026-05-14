# Codex With Me iPhone App

Native SwiftUI client for the Codex With Me server.

## Build

Open `CodexWithMe.xcodeproj` in Xcode, or build from the repository root:

```bash
xcodebuild -project iphone-app/CodexWithMe.xcodeproj -scheme CodexWithMe -configuration Debug -destination 'generic/platform=iOS Simulator' build
```

## Connect

The app asks for:

- Server URL, for example `http://127.0.0.1:8011` in the iOS simulator.
- Shared secret, matching the server's configured login secret.

For a physical iPhone, use a URL that the phone can reach, such as the Mac's LAN address or a VPN address. `127.0.0.1` on a physical iPhone points to the phone itself, not the development machine.

If the app logs in but sessions stay disconnected behind nginx, make sure nginx
proxies websocket upgrades for `/ws/`. A `GET /ws/...` returning 404 usually
means the request reached the HTTP router as a normal GET instead of the
server's websocket upgrade handler.

## Supported Workflows

- Persist a logged-in session in the iOS keychain.
- List and refresh registered projects.
- Register a new server-side project directory.
- List, create, select, and delete Codex sessions.
- Stream session history over the existing websocket API.
- Send prompts and queue prompts while a session is running.
- Reset a connected session.
- Sign out and revoke the current session token.
