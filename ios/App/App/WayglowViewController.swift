import Capacitor
import UIKit

final class WayglowViewController: CAPBridgeViewController {
    override func router() -> Router { StaticExportRouter() }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}

// Next exports a separate index.html for each route. Capacitor's default SPA
// router always returns the root index, which breaks cold launches and reloads.
struct StaticExportRouter: Router {
    var basePath: String = ""

    func route(for path: String) -> String {
        let root = URL(fileURLWithPath: basePath, isDirectory: true).standardizedFileURL
        let relativePath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let file = root.appendingPathComponent(relativePath).standardizedFileURL
        guard file.path == root.path || file.path.hasPrefix(root.path + "/") else {
            return root.appendingPathComponent("404.html").path
        }
        if file.pathExtension.isEmpty {
            let index = file.appendingPathComponent("index.html")
            if FileManager.default.fileExists(atPath: index.path) { return index.path }
            return root.appendingPathComponent("404.html").path
        }
        return file.path
    }
}
