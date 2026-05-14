import SwiftUI

struct PromptComposerView: View {
    let isConnected: Bool
    let isRunning: Bool
    let sendAction: (String) -> Void
    let resetAction: () -> Void

    @State private var prompt = ""
    @FocusState private var isPromptFocused: Bool

    var body: some View {
        VStack(spacing: 10) {
            TextEditor(text: $prompt)
                .focused($isPromptFocused)
                .frame(minHeight: 92, maxHeight: 150)
                .padding(8)
                .background(.quaternary.opacity(0.45), in: RoundedRectangle(cornerRadius: 8))
                .overlay(alignment: .topLeading) {
                    if prompt.isEmpty {
                        Text("Ask Codex to inspect, change, test, or explain this project")
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 16)
                            .allowsHitTesting(false)
                    }
                }
                .disabled(!isConnected)

            HStack {
                Button {
                    resetAction()
                } label: {
                    Label("Reset", systemImage: "arrow.counterclockwise")
                }
                .disabled(!isConnected || isRunning)

                Spacer()

                Button {
                    sendCurrentPrompt()
                } label: {
                    Label(isRunning ? "Queue Prompt" : "Send", systemImage: isRunning ? "text.badge.plus" : "paperplane.fill")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!isConnected || prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding()
        .background(.background)
    }

    private func sendCurrentPrompt() {
        let nextPrompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !nextPrompt.isEmpty else {
            return
        }
        sendAction(nextPrompt)
        prompt = ""
        isPromptFocused = false
    }
}
