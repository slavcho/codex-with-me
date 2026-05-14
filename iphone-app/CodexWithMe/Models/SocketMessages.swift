import Foundation

enum CodexServerMessage: Decodable {
    case snapshot(CodexSessionSnapshot)
    case state(CodexSessionState)
    case historyEntry(CodexHistoryEntry)
    case error(String)

    private enum CodingKeys: String, CodingKey {
        case type
        case snapshot
        case state
        case entry
        case message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "session.snapshot":
            self = .snapshot(try container.decode(CodexSessionSnapshot.self, forKey: .snapshot))
        case "session.state":
            self = .state(try container.decode(CodexSessionState.self, forKey: .state))
        case "history.entry":
            self = .historyEntry(try container.decode(CodexHistoryEntry.self, forKey: .entry))
        case "session.error":
            self = .error(try container.decode(String.self, forKey: .message))
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unsupported websocket message type: \(type)"
            )
        }
    }
}

struct PromptSubmitMessage: Encodable {
    let type = "prompt.submit"
    let prompt: String
}

struct SessionResetMessage: Encodable {
    let type = "session.reset"
}
