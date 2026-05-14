import SwiftUI
import MarkdownUI

struct ActivityTimelineView: View {
    let entries: [CodexHistoryEntry]
    private let bottomAnchorId = "activity-bottom-anchor"

    private var visibleEntries: [CodexHistoryEntry] {
        entries.filter { entry in
            entry.title != "Command started" && entry.title != "Command completed"
        }
    }

    var body: some View {
        if visibleEntries.isEmpty {
            ContentUnavailableView("No Messages Yet", systemImage: "bubble.left.and.bubble.right", description: Text("Send a message to start this session."))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(visibleEntries) { entry in
                            ChatMessageBubble(entry: entry)
                                .id(entry.id)
                        }
                        Color.clear
                            .frame(height: 1)
                            .id(bottomAnchorId)
                    }
                    .padding(.horizontal, 14)
                    .padding(.top, 2)
                    .padding(.bottom, 6)
                }
                .background(Color(.systemGroupedBackground))
                .contentMargins(.top, 0, for: .scrollContent)
                .contentMargins(.bottom, 0, for: .scrollContent)
                .onAppear {
                    scrollToBottomAfterLayout(with: proxy, animated: false)
                }
                .onChange(of: visibleEntries.count) { _, _ in
                    scrollToBottomAfterLayout(with: proxy, animated: true)
                }
                .onChange(of: visibleEntries.last?.id) { _, _ in
                    scrollToBottomAfterLayout(with: proxy, animated: true)
                }
                .task(id: visibleEntries.map(\.id).joined(separator: ",")) {
                    scrollToBottomAfterLayout(with: proxy, animated: false)
                }
            }
        }
    }

    private func scrollToBottomAfterLayout(with proxy: ScrollViewProxy, animated: Bool) {
        scrollToBottom(with: proxy, animated: animated)

        DispatchQueue.main.async {
            scrollToBottom(with: proxy, animated: animated)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            scrollToBottom(with: proxy, animated: animated)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            scrollToBottom(with: proxy, animated: animated)
        }
    }

    private func scrollToBottom(with proxy: ScrollViewProxy, animated: Bool) {
        let scroll = {
            proxy.scrollTo(bottomAnchorId, anchor: .bottom)
        }
        if animated {
            withAnimation(.easeOut(duration: 0.2), scroll)
        } else {
            scroll()
        }
    }
}

private struct ChatMessageBubble: View {
    let entry: CodexHistoryEntry

    var body: some View {
        HStack(alignment: .bottom) {
            if isUserMessage {
                Spacer(minLength: 46)
            }

            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Label(roleLabel, systemImage: symbolName)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(symbolColor)

                    Spacer(minLength: 8)

                    Text(entry.at.codexDisplayTime)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if !messageText.isEmpty {
                    MarkdownText(messageText)
                }

                if let detail = entry.detail, !detail.isEmpty {
                    Text(detail)
                        .font(.caption2.monospaced())
                        .textSelection(.enabled)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(detailBackground, in: RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .frame(maxWidth: 620, alignment: .leading)
            .background(bubbleBackground, in: RoundedRectangle(cornerRadius: 18))
            .overlay {
                RoundedRectangle(cornerRadius: 18)
                    .stroke(borderColor, lineWidth: isUserMessage ? 0 : 0.5)
            }

            if !isUserMessage {
                Spacer(minLength: 46)
            }
        }
        .frame(maxWidth: .infinity, alignment: isUserMessage ? .trailing : .leading)
    }

    private var isUserMessage: Bool {
        entry.kind == .prompt
    }

    private var roleLabel: String {
        if isUserMessage {
            return "You"
        }
        if entry.kind == .error || entry.status == .failed {
            return "Error"
        }
        return "Codex"
    }

    private var messageText: String {
        if !entry.text.isEmpty {
            return entry.text
        }
        return entry.title
    }

    private var bubbleBackground: Color {
        if isUserMessage {
            return .accentColor.opacity(0.16)
        }
        if entry.kind == .error || entry.status == .failed {
            return .red.opacity(0.12)
        }
        return Color(.secondarySystemGroupedBackground)
    }

    private var detailBackground: Color {
        if isUserMessage {
            return .white.opacity(0.45)
        }
        return .black.opacity(0.05)
    }

    private var borderColor: Color {
        if entry.kind == .error || entry.status == .failed {
            return .red.opacity(0.28)
        }
        return .black.opacity(0.08)
    }

    private var symbolName: String {
        if entry.status == .failed || entry.kind == .error {
            return "exclamationmark.triangle.fill"
        }
        switch entry.kind {
        case .agent:
            return "sparkles"
        case .command:
            return "terminal.fill"
        case .fileChange:
            return "doc.text.magnifyingglass"
        case .tool:
            return "hammer.fill"
        case .prompt:
            return "person.fill"
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
        Markdown(text)
            .markdownTheme(.compactChat)
            .textSelection(.enabled)
    }
}

private extension Theme {
    static let compactChat = Theme.gitHub
        .text {
            ForegroundColor(.primary)
            BackgroundColor(nil)
            FontSize(12)
        }
        .code {
            FontFamilyVariant(.monospaced)
            FontSize(10.5)
            BackgroundColor(.black.opacity(0.08))
        }
        .heading1 { configuration in
            compactHeading(configuration, size: 14, top: 4, bottom: 4)
        }
        .heading2 { configuration in
            compactHeading(configuration, size: 13.5, top: 4, bottom: 4)
        }
        .heading3 { configuration in
            compactHeading(configuration, size: 13, top: 3, bottom: 3)
        }
        .heading4 { configuration in
            compactHeading(configuration, size: 12.5, top: 3, bottom: 3)
        }
        .heading5 { configuration in
            compactHeading(configuration, size: 12, top: 3, bottom: 3)
        }
        .heading6 { configuration in
            compactHeading(configuration, size: 11.5, top: 3, bottom: 3)
        }
        .paragraph { configuration in
            configuration.label
                .fixedSize(horizontal: false, vertical: true)
                .relativeLineSpacing(.em(0.12))
                .markdownMargin(top: 0, bottom: 5)
        }
        .blockquote { configuration in
            HStack(spacing: 5) {
                Rectangle()
                    .fill(Color.secondary.opacity(0.35))
                    .frame(width: 2)
                configuration.label
                    .markdownTextStyle {
                        ForegroundColor(.secondary)
                    }
            }
            .fixedSize(horizontal: false, vertical: true)
            .markdownMargin(top: 2, bottom: 5)
        }
        .codeBlock { configuration in
            ScrollView(.horizontal) {
                configuration.label
                    .fixedSize(horizontal: false, vertical: true)
                    .relativeLineSpacing(.em(0.1))
                    .markdownTextStyle {
                        FontFamilyVariant(.monospaced)
                        FontSize(10.5)
                    }
                    .padding(8)
            }
            .background(Color.black.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .markdownMargin(top: 2, bottom: 6)
        }
        .listItem { configuration in
            configuration.label
                .markdownMargin(top: 1)
        }
        .tableCell { configuration in
            configuration.label
                .markdownTextStyle {
                    if configuration.row == 0 {
                        FontWeight(.semibold)
                    }
                    BackgroundColor(nil)
                    FontSize(11)
                }
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, 4)
                .padding(.horizontal, 7)
                .relativeLineSpacing(.em(0.1))
        }
}

@ViewBuilder
private func compactHeading(_ configuration: BlockConfiguration, size: CGFloat, top: CGFloat, bottom: CGFloat) -> some View {
    configuration.label
        .relativeLineSpacing(.em(0.08))
        .markdownMargin(top: top, bottom: bottom)
        .markdownTextStyle {
            FontWeight(.semibold)
            FontSize(size)
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
