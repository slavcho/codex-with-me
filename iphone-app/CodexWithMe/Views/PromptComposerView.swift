import SwiftUI

struct PromptComposerView: View {
    let isConnected: Bool
    let isRunning: Bool
    let sendAction: (String) -> Void

    @State private var prompt = ""
    @FocusState private var isPromptFocused: Bool

    var body: some View {
        HStack(spacing: 8) {
            TextField("Message Codex", text: $prompt)
                .focused($isPromptFocused)
                .font(.callout)
                .textFieldStyle(.plain)
                .submitLabel(isRunning ? .continue : .send)
                .onSubmit {
                    sendCurrentPrompt()
                }
                .disabled(!isConnected)
                .padding(.leading, 14)
                .frame(height: 40)

            Button {
                sendCurrentPrompt()
            } label: {
                Image(systemName: isRunning ? "text.badge.plus" : "paperplane.fill")
                    .font(.caption.weight(.semibold))
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.circle)
            .disabled(!isConnected || prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .accessibilityLabel(isRunning ? "Queue Prompt" : "Send")
        }
        .padding(.trailing, 5)
        .background(.quaternary.opacity(0.45), in: Capsule())
        .padding(.horizontal, 8)
        .padding(.top, 4)
        .padding(.bottom, 0)
        .background(Color(.systemGroupedBackground).ignoresSafeArea(.container, edges: .bottom))
        .ignoresSafeArea(.container, edges: .bottom)
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
