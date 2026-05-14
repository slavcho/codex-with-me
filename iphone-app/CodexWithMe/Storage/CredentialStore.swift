import Foundation
import Security

struct StoredCredentials: Codable, Equatable {
    let baseURL: URL
    let session: AuthSession
}

enum CredentialStoreError: LocalizedError {
    case unexpectedStatus(OSStatus)

    var errorDescription: String? {
        switch self {
        case .unexpectedStatus(let status):
            return "Keychain operation failed with status \(status)."
        }
    }
}

final class CredentialStore {
    private let service = "CodexWithMe"
    private let account = "auth-session"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    func load() -> StoredCredentials? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {
            return nil
        }

        guard let credentials = try? decoder.decode(StoredCredentials.self, from: data) else {
            try? clear()
            return nil
        }

        if credentials.session.isExpired {
            try? clear()
            return nil
        }

        return credentials
    }

    func save(_ credentials: StoredCredentials) throws {
        let data = try encoder.encode(credentials)
        var query = baseQuery()
        let attributes = [kSecValueData as String: data]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess {
            return
        }
        guard updateStatus == errSecItemNotFound else {
            throw CredentialStoreError.unexpectedStatus(updateStatus)
        }

        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(query as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw CredentialStoreError.unexpectedStatus(addStatus)
        }
    }

    func clear() throws {
        let status = SecItemDelete(baseQuery() as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw CredentialStoreError.unexpectedStatus(status)
        }
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}

private extension AuthSession {
    var isExpired: Bool {
        guard let expiry = ISO8601DateFormatter.withFractionalSeconds.date(from: expiresAt)
            ?? ISO8601DateFormatter.standard.date(from: expiresAt) else {
            return true
        }
        return expiry <= Date()
    }
}

private extension ISO8601DateFormatter {
    static let withFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let standard: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
