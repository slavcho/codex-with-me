import SwiftUI

struct RegisterProjectView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: WorkspaceViewModel
    @State private var name = ""
    @State private var directory = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Project name", text: $name)
                        .textInputAutocapitalization(.words)
                    TextField("Directory", text: $directory)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } footer: {
                    Text("The directory is resolved on the server, not on this iPhone.")
                }
            }
            .navigationTitle("Register Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Register") {
                        Task {
                            await viewModel.registerProject(name: name, directory: directory)
                            dismiss()
                        }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || directory.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
