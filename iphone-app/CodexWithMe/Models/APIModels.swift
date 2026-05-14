import Foundation

struct AuthSession: Codable, Equatable {
    let token: String
    let expiresAt: String
}

struct ProjectSessionStats: Codable, Equatable {
    let total: Int
    let running: Int
}

struct Project: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let directory: String
    let exists: Bool
    let isDirectory: Bool
    let sessions: ProjectSessionStats
}

struct RegisterProjectInput: Encodable {
    let name: String
    let directory: String
    let id: String?
}

struct CodexQueuedPrompt: Codable, Identifiable, Equatable {
    let id: String
    let prompt: String
    let queuedAt: String
    let startedAt: String?
}

enum CodexHistoryStatus: String, Codable {
    case started
    case updated
    case completed
    case failed
}

enum CodexHistoryKind: String, Codable {
    case prompt
    case system
    case reasoning
    case agent
    case command
    case tool
    case fileChange = "file_change"
    case todo
    case webSearch = "web_search"
    case error
}

struct CodexHistoryEntry: Codable, Identifiable, Equatable {
    let id: String
    let sequence: Int
    let at: String
    let kind: CodexHistoryKind
    let status: CodexHistoryStatus?
    let title: String
    let text: String
    let detail: String?
}

struct CodexUsageTotals: Codable, Equatable {
    let inputTokens: Int
    let cachedInputTokens: Int
    let outputTokens: Int
    let completedTurns: Int

    var totalTokens: Int {
        inputTokens + outputTokens
    }
}

enum CodexSessionStatus: String, Codable {
    case idle
    case running
}

struct CodexSessionSummary: Codable, Identifiable, Equatable {
    let id: String
    let projectId: String
    let title: String
    let workingDirectory: String
    let createdAt: String
    let updatedAt: String
    let threadId: String?
    let status: CodexSessionStatus
    let activePrompt: CodexQueuedPrompt?
    let queuedPrompts: Int
    let connectedClients: Int
    let lastError: String?
    let usageTotals: CodexUsageTotals
}

struct CodexSessionSnapshot: Codable, Identifiable, Equatable {
    let id: String
    let projectId: String
    let title: String
    let workingDirectory: String
    let createdAt: String
    let updatedAt: String
    let threadId: String?
    let status: CodexSessionStatus
    let activePrompt: CodexQueuedPrompt?
    let queue: [CodexQueuedPrompt]
    let connectedClients: Int
    let lastError: String?
    let usageTotals: CodexUsageTotals
    let history: [CodexHistoryEntry]
}

struct CodexSessionState: Codable, Equatable {
    let id: String
    let projectId: String
    let title: String
    let workingDirectory: String
    let createdAt: String
    let updatedAt: String
    let threadId: String?
    let status: CodexSessionStatus
    let activePrompt: CodexQueuedPrompt?
    let queue: [CodexQueuedPrompt]
    let connectedClients: Int
    let lastError: String?
    let usageTotals: CodexUsageTotals
}

enum SocketStatus: Equatable {
    case idle
    case connecting
    case connected
    case disconnected
    case failed(String)

    var label: String {
        switch self {
        case .idle:
            return "Idle"
        case .connecting:
            return "Connecting"
        case .connected:
            return "Connected"
        case .disconnected:
            return "Reconnecting"
        case .failed:
            return "Error"
        }
    }
}
