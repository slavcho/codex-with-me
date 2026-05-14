import Foundation

@MainActor
final class WorkspaceViewModel: ObservableObject {
    @Published private(set) var projects: [Project] = []
    @Published private(set) var sessions: [CodexSessionSummary] = []
    @Published var selectedProjectId: String?
    @Published var selectedSessionId: String?
    @Published var isLoadingProjects = false
    @Published var isLoadingSessions = false
    @Published var errorMessage: String?
    @Published var requiresAuthentication = false

    let socket = SessionWebSocket()

    var selectedProject: Project? {
        projects.first(where: { $0.id == selectedProjectId })
    }

    var selectedSession: CodexSessionSummary? {
        sessions.first(where: { $0.id == selectedSessionId })
    }

    private let authenticatedClient: AuthenticatedClient
    private let apiClient: APIClient

    init(authenticatedClient: AuthenticatedClient) {
        self.authenticatedClient = authenticatedClient
        self.apiClient = APIClient(
            baseURL: authenticatedClient.baseURL,
            tokenProvider: { authenticatedClient.session.token }
        )
        socket.authenticationRequiredHandler = { [weak self] in
            self?.markAuthenticationRequired()
        }
    }

    deinit {
        Task { @MainActor [socket] in
            socket.disconnect()
        }
    }

    func loadInitialData() async {
        await loadProjects()
    }

    func refresh() async {
        await loadProjects(keepSelection: true)
        guard !requiresAuthentication else {
            return
        }
        if let selectedProjectId {
            await loadSessions(projectId: selectedProjectId, keepSelection: true)
        }
    }

    func loadProjects(keepSelection: Bool = false) async {
        isLoadingProjects = true
        errorMessage = nil
        defer { isLoadingProjects = false }

        do {
            let nextProjects = try await apiClient.listProjects()
            projects = nextProjects
            if keepSelection, let selectedProjectId, nextProjects.contains(where: { $0.id == selectedProjectId }) {
                return
            }
            selectedProjectId = nextProjects.first?.id
            if let selectedProjectId {
                await loadSessions(projectId: selectedProjectId)
            } else {
                sessions = []
                selectedSessionId = nil
                socket.disconnect()
            }
        } catch {
            handle(error)
        }
    }

    func selectProject(_ project: Project) async {
        guard selectedProjectId != project.id else {
            return
        }
        selectedProjectId = project.id
        selectedSessionId = nil
        socket.disconnect()
        await loadSessions(projectId: project.id)
    }

    func registerProject(name: String, directory: String) async {
        errorMessage = nil
        do {
            let project = try await apiClient.registerProject(
                RegisterProjectInput(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    directory: directory.trimmingCharacters(in: .whitespacesAndNewlines),
                    id: nil
                )
            )
            projects.append(project)
            await selectProject(project)
        } catch {
            handle(error)
        }
    }

    func loadSessions(projectId: String, keepSelection: Bool = false) async {
        isLoadingSessions = true
        errorMessage = nil
        defer { isLoadingSessions = false }

        do {
            let nextSessions = try await apiClient.listSessions(projectId: projectId)
            sessions = nextSessions

            let nextSelection: String?
            if keepSelection, let selectedSessionId, nextSessions.contains(where: { $0.id == selectedSessionId }) {
                nextSelection = selectedSessionId
            } else {
                nextSelection = nextSessions.first?.id
            }
            selectSessionId(nextSelection)
        } catch {
            sessions = []
            selectedSessionId = nil
            socket.disconnect()
            handle(error)
        }
    }

    func createSession() async {
        guard let projectId = selectedProjectId else {
            return
        }
        errorMessage = nil
        do {
            let created = try await apiClient.createSession(projectId: projectId, title: "Session \(sessions.count + 1)")
            await loadSessions(projectId: projectId, keepSelection: true)
            selectSessionId(created.id)
        } catch {
            handle(error)
        }
    }

    func deleteSelectedSession() async {
        guard let projectId = selectedProjectId, let selectedSessionId else {
            return
        }
        errorMessage = nil
        do {
            try await apiClient.deleteSession(projectId: projectId, sessionId: selectedSessionId)
            await loadSessions(projectId: projectId)
        } catch {
            handle(error)
        }
    }

    func selectSession(_ session: CodexSessionSummary) {
        selectSessionId(session.id)
    }

    func closeSelectedSession() {
        selectSessionId(nil)
    }

    func sendPrompt(_ prompt: String) {
        socket.sendPrompt(prompt)
    }

    func resetSession() {
        socket.resetSession()
    }

    private func selectSessionId(_ sessionId: String?) {
        selectedSessionId = sessionId
        guard let projectId = selectedProjectId, let sessionId else {
            socket.disconnect()
            return
        }
        socket.connect(
            baseURL: authenticatedClient.baseURL,
            projectId: projectId,
            sessionId: sessionId,
            token: authenticatedClient.session.token
        )
    }

    private func handle(_ error: Error) {
        if let apiError = error as? APIClientError, apiError.isAuthenticationRequired {
            markAuthenticationRequired()
            return
        }
        errorMessage = error.localizedDescription
    }

    private func markAuthenticationRequired() {
        socket.disconnect()
        projects = []
        sessions = []
        selectedProjectId = nil
        selectedSessionId = nil
        requiresAuthentication = true
        errorMessage = APIClientError.authenticationRequired.localizedDescription
    }
}

private extension APIClientError {
    var isAuthenticationRequired: Bool {
        if case .authenticationRequired = self {
            return true
        }
        return false
    }
}
