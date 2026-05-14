import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @FocusState private var focusedField: Field?

    private enum Field {
        case server
        case secret
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Server URL", text: $authViewModel.serverURLText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .focused($focusedField, equals: .server)

                    SecureField("Shared secret", text: $authViewModel.secret)
                        .textContentType(.password)
                        .focused($focusedField, equals: .secret)
                } header: {
                    Text("Connection")
                } footer: {
                    Text("Use the Codex With Me server URL that your phone can reach, then sign in with the shared secret.")
                }

                if let errorMessage = authViewModel.errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button {
                        focusedField = nil
                        Task {
                            await authViewModel.login()
                        }
                    } label: {
                        if authViewModel.isSubmitting {
                            Label("Signing in", systemImage: "hourglass")
                        } else {
                            Label("Sign in", systemImage: "lock.open")
                        }
                    }
                    .disabled(authViewModel.isSubmitting || authViewModel.secret.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .navigationTitle("Codex With Me")
        }
    }
}
