import Foundation

struct AuthenticatedClient: Equatable {
    let baseURL: URL
    let session: AuthSession
}

enum APIClientError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case authenticationRequired
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Enter a valid server URL."
        case .invalidResponse:
            return "The server returned an invalid response."
        case .authenticationRequired:
            return "Authentication required."
        case .server(let message):
            return message
        }
    }
}

final class APIClient {
    private struct ErrorPayload: Decodable {
        let error: String?
    }

    private struct AuthPayload: Decodable {
        let session: AuthSession
    }

    private struct ProjectsPayload: Decodable {
        let projects: [Project]
    }

    private struct ProjectPayload: Decodable {
        let project: Project
    }

    private struct SessionsPayload: Decodable {
        let sessions: [CodexSessionSummary]
    }

    private struct SessionPayload: Decodable {
        let session: CodexSessionSnapshot
    }

    private let baseURL: URL
    private let tokenProvider: () -> String?
    private let urlSession: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init(baseURL: URL, tokenProvider: @escaping () -> String?, urlSession: URLSession = .shared) {
        self.baseURL = baseURL
        self.tokenProvider = tokenProvider
        self.urlSession = urlSession
    }

    func login(secret: String) async throws -> AuthSession {
        let payload: AuthPayload = try await request(
            "/api/auth/login",
            method: "POST",
            body: ["secret": secret],
            authenticated: false
        )
        return payload.session
    }

    func logout() async throws {
        try await requestEmpty("/api/auth/logout", method: "POST")
    }

    func listProjects() async throws -> [Project] {
        let payload: ProjectsPayload = try await request("/api/projects")
        return payload.projects
    }

    func registerProject(_ input: RegisterProjectInput) async throws -> Project {
        let payload: ProjectPayload = try await request("/api/projects", method: "POST", body: input)
        return payload.project
    }

    func listSessions(projectId: String) async throws -> [CodexSessionSummary] {
        let payload: SessionsPayload = try await request("/api/projects/\(projectId.urlPathEscaped)/sessions")
        return payload.sessions
    }

    func createSession(projectId: String, title: String) async throws -> CodexSessionSnapshot {
        let payload: SessionPayload = try await request(
            "/api/projects/\(projectId.urlPathEscaped)/sessions",
            method: "POST",
            body: ["title": title]
        )
        return payload.session
    }

    func getSession(projectId: String, sessionId: String) async throws -> CodexSessionSnapshot {
        let payload: SessionPayload = try await request(
            "/api/projects/\(projectId.urlPathEscaped)/sessions/\(sessionId.urlPathEscaped)"
        )
        return payload.session
    }

    func deleteSession(projectId: String, sessionId: String) async throws {
        try await requestEmpty(
            "/api/projects/\(projectId.urlPathEscaped)/sessions/\(sessionId.urlPathEscaped)",
            method: "DELETE"
        )
    }

    private func request<T: Decodable, Body: Encodable>(
        _ path: String,
        method: String = "GET",
        body: Body? = Optional<String>.none,
        authenticated: Bool = true
    ) async throws -> T {
        let data = try await dataRequest(path, method: method, body: body, authenticated: authenticated)
        return try decoder.decode(T.self, from: data)
    }

    private func requestEmpty<Body: Encodable>(
        _ path: String,
        method: String,
        body: Body? = Optional<String>.none,
        authenticated: Bool = true
    ) async throws {
        _ = try await dataRequest(path, method: method, body: body, authenticated: authenticated)
    }

    private func dataRequest<Body: Encodable>(
        _ path: String,
        method: String,
        body: Body?,
        authenticated: Bool
    ) async throws -> Data {
        var request = URLRequest(url: try url(for: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            request.httpBody = try encoder.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if authenticated, let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        if (200..<300).contains(httpResponse.statusCode) {
            return data
        }

        let message = (try? decoder.decode(ErrorPayload.self, from: data).error) ?? "Request failed with \(httpResponse.statusCode)."
        if httpResponse.statusCode == 401 || message.isAuthenticationRequiredMessage {
            throw APIClientError.authenticationRequired
        }
        throw APIClientError.server(message)
    }

    private func url(for path: String) throws -> URL {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw APIClientError.invalidBaseURL
        }
        return url
    }
}

private extension String {
    var urlPathEscaped: String {
        addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? self
    }

    var isAuthenticationRequiredMessage: Bool {
        localizedCaseInsensitiveContains("Authentication required")
    }
}
