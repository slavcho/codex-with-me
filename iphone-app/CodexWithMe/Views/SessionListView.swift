import SwiftUI

struct SessionListView: View {
    @ObservedObject var viewModel: WorkspaceViewModel

    var body: some View {
        List(selection: $viewModel.selectedSessionId) {
            if let project = viewModel.selectedProject {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(project.name)
                            .font(.headline)
                        Text(project.directory)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Current Project")
                }

                Section {
                    if viewModel.sessions.isEmpty && !viewModel.isLoadingSessions {
                        ContentUnavailableView("No Sessions", systemImage: "bubble.left.and.bubble.right", description: Text("Create a session to start sending prompts."))
                    } else {
                        ForEach(viewModel.sessions) { session in
                            Button {
                                viewModel.selectSession(session)
                            } label: {
                                SessionRow(session: session)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                } header: {
                    HStack {
                        Text("Sessions")
                        if viewModel.isLoadingSessions {
                            ProgressView()
                        }
                    }
                }
            } else {
                ContentUnavailableView("Select a Project", systemImage: "folder", description: Text("Choose or register a project first."))
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        await viewModel.createSession()
                    }
                } label: {
                    Label("New Session", systemImage: "plus")
                }
                .disabled(viewModel.selectedProject == nil)
            }
        }
    }
}

private struct SessionRow: View {
    let session: CodexSessionSummary

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: session.status == .running ? "bolt.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(session.status == .running ? .green : .secondary)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                Text(session.title)
                    .font(.headline)
                Text(session.threadId.map { "Thread \($0)" } ?? "Thread starts with first prompt")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Text(session.status.rawValue)
                    Text("\(session.queuedPrompts) queued")
                    Text("\(session.usageTotals.completedTurns) turns")
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
