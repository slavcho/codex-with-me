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
                    SessionHeaderView(
                        snapshot: snapshot,
                        socketStatus: socket.status,
                        deleteAction: { isConfirmingDelete = true }
                    )
                    Divider()
                    ActivityTimelineView(entries: snapshot.history)
                    Divider()
                    PromptComposerView(
                        isConnected: socket.status == .connected,
                        isRunning: snapshot.status == .running,
                        sendAction: viewModel.sendPrompt,
                        resetAction: viewModel.resetSession
                    )
                }
                .navigationTitle(snapshot.title)
                .navigationBarTitleDisplayMode(.inline)
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

private struct SessionHeaderView: View {
    let snapshot: CodexSessionSnapshot
    let socketStatus: SocketStatus
    let deleteAction: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label(socketStatus.label, systemImage: socketStatus == .connected ? "wifi" : "wifi.exclamationmark")
                    .font(.subheadline)
                    .foregroundStyle(socketStatus == .connected ? .green : .secondary)

                Spacer()

                Button(role: .destructive, action: deleteAction) {
                    Label("Delete", systemImage: "trash")
                        .labelStyle(.iconOnly)
                }
                .disabled(snapshot.status == .running)
            }

            Text(snapshot.threadId.map { "Thread \($0)" } ?? "Thread will start with the first prompt")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack(spacing: 16) {
                MetricView(value: "\(snapshot.usageTotals.completedTurns)", label: "Turns")
                MetricView(value: "\(snapshot.usageTotals.totalTokens)", label: "Tokens")
                MetricView(value: "\(snapshot.queue.count)", label: "Queued")
            }
        }
        .padding()
        .background(.background)
    }
}

private struct MetricView: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.headline.monospacedDigit())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
