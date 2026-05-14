import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var authenticatedClient: AuthenticatedClient?
    @Published var serverURLText: String
    @Published var secret: String = ""
    @Published var isSubmitting = false
    @Published var errorMessage: String?

    private let credentialStore = CredentialStore()

    init() {
        if let credentials = credentialStore.load() {
            authenticatedClient = AuthenticatedClient(baseURL: credentials.baseURL, session: credentials.session)
            serverURLText = credentials.baseURL.absoluteString
        } else {
            serverURLText = "http://127.0.0.1:8011"
        }
    }

    func login() async {
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let baseURL = try normalizedServerURL(from: serverURLText)
            let client = APIClient(baseURL: baseURL, tokenProvider: { nil })
            let session = try await client.login(secret: secret)
            let authenticated = AuthenticatedClient(baseURL: baseURL, session: session)
            try credentialStore.save(StoredCredentials(baseURL: baseURL, session: session))
            secret = ""
            authenticatedClient = authenticated
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        guard let authenticatedClient else {
            try? credentialStore.clear()
            return
        }

        let client = APIClient(baseURL: authenticatedClient.baseURL, tokenProvider: { authenticatedClient.session.token })
        do {
            try await client.logout()
        } catch {
            // Local logout should still clear stale or expired tokens.
        }
        try? credentialStore.clear()
        self.authenticatedClient = nil
    }

    func requireLogin(message: String = "Authentication required. Sign in again.") {
        try? credentialStore.clear()
        authenticatedClient = nil
        secret = ""
        errorMessage = message
    }

    private func normalizedServerURL(from text: String) throws -> URL {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let candidate = trimmed.contains("://") ? trimmed : "http://\(trimmed)"
        guard let url = URL(string: candidate), let scheme = url.scheme, let host = url.host, !host.isEmpty else {
            throw APIClientError.invalidBaseURL
        }
        guard scheme == "http" || scheme == "https" else {
            throw APIClientError.invalidBaseURL
        }
        return url
    }
}
