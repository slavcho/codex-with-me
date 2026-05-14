import SwiftUI

struct ActivityTimelineView: View {
    let entries: [CodexHistoryEntry]

    private var visibleEntries: [CodexHistoryEntry] {
        entries.filter { entry in
            entry.title != "Command started" && entry.title != "Command completed"
        }
    }

    var body: some View {
        if visibleEntries.isEmpty {
            ContentUnavailableView("No Activity Yet", systemImage: "sparkles", description: Text("Start a prompt and Codex events will stream here."))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollViewReader { proxy in
                List(visibleEntries) { entry in
                    ActivityRow(entry: entry)
                        .id(entry.id)
                }
                .listStyle(.plain)
                .onChange(of: visibleEntries.last?.id) { _, id in
                    guard let id else {
                        return
                    }
                    withAnimation {
                        proxy.scrollTo(id, anchor: .bottom)
                    }
                }
            }
        }
    }
}

private struct ActivityRow: View {
    let entry: CodexHistoryEntry

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbolName)
                .font(.headline)
                .foregroundStyle(symbolColor)
                .frame(width: 26)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(entry.title)
                        .font(.headline)
                    Spacer()
                    Text(entry.at.codexDisplayTime)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                MarkdownText(entry.text)
                    .font(.body)

                if let detail = entry.detail, !detail.isEmpty {
                    Text(detail)
                        .font(.caption.monospaced())
                        .textSelection(.enabled)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(.vertical, 8)
    }

    private var symbolName: String {
        if entry.status == .failed || entry.kind == .error {
            return "exclamationmark.triangle.fill"
        }
        switch entry.kind {
        case .agent:
            return "person.2.fill"
        case .command:
            return "terminal.fill"
        case .fileChange:
            return "doc.text.magnifyingglass"
        case .tool:
            return "hammer.fill"
        case .prompt:
            return "text.bubble.fill"
        default:
            return "checkmark.circle.fill"
        }
    }

    private var symbolColor: Color {
        if entry.status == .failed || entry.kind == .error {
            return .red
        }
        if entry.status == .completed {
            return .green
        }
        if entry.kind == .command || entry.kind == .tool {
            return .orange
        }
        return .accentColor
    }
}

private struct MarkdownText: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        if let attributed = try? AttributedString(markdown: text) {
            Text(attributed)
                .textSelection(.enabled)
        } else {
            Text(text)
                .textSelection(.enabled)
        }
    }
}

private extension String {
    var codexDisplayTime: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: self) {
            return date.formatted(date: .omitted, time: .shortened)
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: self) {
            return date.formatted(date: .omitted, time: .shortened)
        }
        return self
    }
}
