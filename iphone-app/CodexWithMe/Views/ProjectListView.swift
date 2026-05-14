import SwiftUI

struct ProjectListView: View {
    @ObservedObject var viewModel: WorkspaceViewModel
    @Binding var isRegisteringProject: Bool

    var body: some View {
        List(selection: $viewModel.selectedProjectId) {
            Section {
                if viewModel.projects.isEmpty && !viewModel.isLoadingProjects {
                    ContentUnavailableView("No Projects", systemImage: "folder.badge.questionmark", description: Text("Register a project directory to start working from your phone."))
                } else {
                    ForEach(viewModel.projects) { project in
                        Button {
                            Task {
                                await viewModel.selectProject(project)
                            }
                        } label: {
                            ProjectRow(project: project)
                        }
                        .buttonStyle(.plain)
                    }
                }
            } header: {
                HStack {
                    Text("Registered")
                    if viewModel.isLoadingProjects {
                        ProgressView()
                    }
                }
            }
        }
        .overlay(alignment: .bottom) {
            if let errorMessage = viewModel.errorMessage {
                ErrorBanner(message: errorMessage)
                    .padding()
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    isRegisteringProject = true
                } label: {
                    Label("Register Project", systemImage: "folder.badge.plus")
                }
            }
        }
    }
}

private struct ProjectRow: View {
    let project: Project

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "folder")
                .font(.title3)
                .foregroundColor(project.exists && project.isDirectory ? .accentColor : .secondary)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                Text(project.name)
                    .font(.headline)
                Text(project.directory)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Text("\(project.sessions.total) sessions")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !project.exists || !project.isDirectory {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 4)
    }
}
