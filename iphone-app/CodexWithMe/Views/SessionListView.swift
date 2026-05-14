import SwiftUI

struct SessionListView: View {
    @ObservedObject var viewModel: WorkspaceViewModel

    var body: some View {
        List(selection: $viewModel.selectedSessionId) {
            if let project = viewModel.selectedProject {
                Section {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(project.name)
                            .font(.subheadline.weight(.semibold))
                        Text(project.directory)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                    .padding(.vertical, 2)
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
        .contentMargins(.top, 0, for: .scrollContent)
        .listSectionSpacing(.compact)
        .environment(\.defaultMinListRowHeight, 36)
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
                .font(.subheadline)
                .foregroundStyle(session.status == .running ? .green : .secondary)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text(session.title)
                    .font(.subheadline.weight(.semibold))
                Text(session.threadId.map { "Thread \($0)" } ?? "Thread starts with first prompt")
                    .font(.caption2)
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
        .padding(.vertical, 2)
    }
}
