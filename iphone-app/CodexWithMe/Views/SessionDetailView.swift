import SwiftUI

struct SessionDetailView: View {
    @ObservedObject var viewModel: WorkspaceViewModel
    @ObservedObject private var socket: SessionWebSocket
    @State private var isConfirmingDelete = false

    init(viewModel: WorkspaceViewModel) {
        self.viewModel = viewModel
        self.socket = viewModel.socket
    }

    var body: some View {
        Group {
            if let snapshot = socket.snapshot {
                VStack(spacing: 0) {
                    FloatingSessionControls(
                        status: socket.status,
                        isRunning: snapshot.status == .running,
                        backAction: viewModel.closeSelectedSession,
                        resetAction: viewModel.resetSession,
                        deleteAction: { isConfirmingDelete = true }
                    )
                    .padding(.horizontal, 8)
                    .padding(.top, 6)
                    .padding(.bottom, 8)

                    ActivityTimelineView(entries: snapshot.history)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                    PromptComposerView(
                        isConnected: socket.status == .connected,
                        isRunning: snapshot.status == .running,
                        sendAction: viewModel.sendPrompt
                    )
                }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemGroupedBackground).ignoresSafeArea())
                    .toolbar(.hidden, for: .navigationBar)
                    .confirmationDialog("Delete this session?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                        Button("Delete Session", role: .destructive) {
                            Task {
                                await viewModel.deleteSelectedSession()
                            }
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("The session history will be removed from this server.")
                    }
            } else if viewModel.selectedSessionId != nil {
                ContentUnavailableView("Connecting Session", systemImage: "wifi", description: Text("Waiting for the websocket snapshot."))
            } else {
                ContentUnavailableView("No Session Selected", systemImage: "bubble.left", description: Text("Create or select a session to start working."))
            }
        }
        .overlay(alignment: .top) {
            if let lastError = socket.lastError {
                ErrorBanner(message: lastError)
                    .padding()
            }
        }
    }
}

private struct FloatingSessionControls: View {
    let status: SocketStatus
    let isRunning: Bool
    let backAction: () -> Void
    let resetAction: () -> Void
    let deleteAction: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: backAction) {
                Image(systemName: "chevron.left")
                    .font(.subheadline.weight(.semibold))
                    .frame(width: 32, height: 32)
                    .background(.regularMaterial, in: Circle())
            }
            .accessibilityLabel("Back")

            Spacer()

            ConnectionBadge(status: status, isRunning: isRunning)

            Menu {
                Button {
                    resetAction()
                } label: {
                    Label("Reset Session", systemImage: "arrow.counterclockwise")
                }
                .disabled(status != .connected || isRunning)

                Button(role: .destructive) {
                    deleteAction()
                } label: {
                    Label("Delete Session", systemImage: "trash")
                }
                .disabled(isRunning)
            } label: {
                Image(systemName: "ellipsis")
                    .font(.subheadline.weight(.semibold))
                    .frame(width: 32, height: 32)
                    .background(.regularMaterial, in: Circle())
            }
            .accessibilityLabel("Session Actions")
        }
    }
}

private struct ConnectionBadge: View {
    let status: SocketStatus
    let isRunning: Bool

    var body: some View {
        Image(systemName: iconName)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(8)
            .background(.regularMaterial, in: Circle())
            .symbolEffect(.pulse, options: .repeating, value: isRunning)
            .accessibilityLabel(status.label)
    }

    private var iconName: String {
        switch status {
        case .connected:
            return "point.3.connected.trianglepath.dotted"
        case .connecting:
            return "point.3.connected.trianglepath.dotted"
        case .failed:
            return "exclamationmark.triangle"
        default:
            return "point.3.filled.connected.trianglepath.dotted"
        }
    }

    private var color: Color {
        switch status {
        case .connected:
            return .green
        case .connecting:
            return .orange
        case .failed:
            return .red
        default:
            return .secondary
        }
    }
}
