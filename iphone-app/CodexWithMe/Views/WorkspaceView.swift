import SwiftUI

struct WorkspaceView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @StateObject private var viewModel: WorkspaceViewModel
    @State private var isRegisteringProject = false

    init(apiClient: AuthenticatedClient) {
        _viewModel = StateObject(wrappedValue: WorkspaceViewModel(authenticatedClient: apiClient))
    }

    var body: some View {
        NavigationSplitView {
            ProjectListView(viewModel: viewModel, isRegisteringProject: $isRegisteringProject)
                .navigationTitle("Projects")
                .navigationBarTitleDisplayMode(.inline)
        } content: {
            SessionListView(viewModel: viewModel)
                .navigationTitle(viewModel.selectedProject?.name ?? "Sessions")
                .navigationBarTitleDisplayMode(.inline)
        } detail: {
            SessionDetailView(viewModel: viewModel)
        }
        .task {
            await viewModel.loadInitialData()
        }
        .sheet(isPresented: $isRegisteringProject) {
            RegisterProjectView(viewModel: viewModel)
        }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    Task {
                        await viewModel.refresh()
                    }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }

                Button(role: .destructive) {
                    Task {
                        await authViewModel.logout()
                    }
                } label: {
                    Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
    }
}
