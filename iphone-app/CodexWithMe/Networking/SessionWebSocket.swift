import Foundation

@MainActor
final class SessionWebSocket: ObservableObject {
    @Published private(set) var status: SocketStatus = .idle
    @Published private(set) var snapshot: CodexSessionSnapshot?
    @Published private(set) var lastError: String?

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private var task: URLSessionWebSocketTask?
    private var reconnectTask: Task<Void, Never>?
    private var receiveTask: Task<Void, Never>?
    private var connection: Connection?

    func connect(baseURL: URL, projectId: String, sessionId: String, token: String) {
        disconnect(resetSnapshot: true)
        guard let url = websocketURL(baseURL: baseURL, projectId: projectId, sessionId: sessionId, token: token) else {
            status = .failed("Unable to build websocket URL.")
            return
        }

        connection = Connection(url: url)
        open(url: url)
    }

    func disconnect(resetSnapshot: Bool = true) {
        reconnectTask?.cancel()
        receiveTask?.cancel()
        reconnectTask = nil
        receiveTask = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
        connection = nil
        status = .idle
        lastError = nil
        if resetSnapshot {
            snapshot = nil
        }
    }

    func sendPrompt(_ prompt: String) {
        send(PromptSubmitMessage(prompt: prompt))
    }

    func resetSession() {
        send(SessionResetMessage())
    }

    private func open(url: URL) {
        status = .connecting
        let task = URLSession.shared.webSocketTask(with: url)
        self.task = task
        task.resume()
        status = .connected

        receiveTask = Task { [weak self] in
            await self?.receiveLoop()
        }
    }

    private func receiveLoop() async {
        while !Task.isCancelled {
            guard let task else {
                return
            }

            do {
                let message = try await task.receive()
                try handle(message)
            } catch {
                guard !Task.isCancelled else {
                    return
                }
                lastError = error.localizedDescription
                status = .disconnected
                scheduleReconnect()
                return
            }
        }
    }

    private func handle(_ message: URLSessionWebSocketTask.Message) throws {
        let data: Data
        switch message {
        case .data(let messageData):
            data = messageData
        case .string(let string):
            data = Data(string.utf8)
        @unknown default:
            return
        }

        switch try decoder.decode(CodexServerMessage.self, from: data) {
        case .snapshot(let nextSnapshot):
            snapshot = nextSnapshot
        case .state(let state):
            snapshot = snapshot?.applying(state: state)
        case .historyEntry(let entry):
            guard var current = snapshot else {
                return
            }
            if !current.history.contains(where: { $0.id == entry.id }) {
                current = current.appending(historyEntry: entry)
            }
            snapshot = current
        case .error(let message):
            lastError = message
        }
    }

    private func scheduleReconnect() {
        guard let connection else {
            return
        }
        reconnectTask?.cancel()
        reconnectTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled else {
                return
            }
            self?.open(url: connection.url)
        }
    }

    private func send<T: Encodable>(_ value: T) {
        guard let task else {
            return
        }
        do {
            let data = try encoder.encode(value)
            task.send(.data(data)) { [weak self] error in
                guard let error else {
                    return
                }
                Task { @MainActor in
                    self?.lastError = error.localizedDescription
                    self?.status = .failed(error.localizedDescription)
                }
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func websocketURL(baseURL: URL, projectId: String, sessionId: String, token: String) -> URL? {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }
        components.scheme = components.scheme == "https" ? "wss" : "ws"
        components.path = "/ws/projects/\(projectId.urlPathEscaped)/sessions/\(sessionId.urlPathEscaped)"
        components.queryItems = [URLQueryItem(name: "token", value: token)]
        return components.url
    }
}

private struct Connection {
    let url: URL
}

private extension CodexSessionSnapshot {
    func applying(state: CodexSessionState) -> CodexSessionSnapshot {
        CodexSessionSnapshot(
            id: state.id,
            projectId: state.projectId,
            title: state.title,
            workingDirectory: state.workingDirectory,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt,
            threadId: state.threadId,
            status: state.status,
            activePrompt: state.activePrompt,
            queue: state.queue,
            connectedClients: state.connectedClients,
            lastError: state.lastError,
            usageTotals: state.usageTotals,
            history: history
        )
    }

    func appending(historyEntry: CodexHistoryEntry) -> CodexSessionSnapshot {
        CodexSessionSnapshot(
            id: id,
            projectId: projectId,
            title: title,
            workingDirectory: workingDirectory,
            createdAt: createdAt,
            updatedAt: updatedAt,
            threadId: threadId,
            status: status,
            activePrompt: activePrompt,
            queue: queue,
            connectedClients: connectedClients,
            lastError: lastError,
            usageTotals: usageTotals,
            history: history + [historyEntry]
        )
    }
}

private extension String {
    var urlPathEscaped: String {
        addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? self
    }
}
