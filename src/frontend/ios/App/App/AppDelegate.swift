import UIKit
import Capacitor
import WebKit
import SafariServices
import AuthenticationServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler, SFSafariViewControllerDelegate, ASWebAuthenticationPresentationContextProviding {

    var window: UIWindow?
    // TODO(auth-broker): Current app supports embedded II popups for Apple and opens Google in Safari for policy compliance.
    // We will migrate to a unified "broker" flow that uses a system browser (ASWebAuthenticationSession) for ALL providers
    // (Apple/Google/passkeys). The plan:
    // 1) Dev/first release: use a custom URL scheme callback like `doocoins://ii-callback?code=...&nonce=...`.
    //    - Add CFBundleURLTypes in Info.plist with the chosen scheme (e.g. "doocoins").
    //    - Use ASWebAuthenticationSession to open the relay page at https://<your-icp0>/auth/relay.
    //    - On return, handle application(_:open:options:) and forward code/nonce to the web app to import the session.
    // 2) Later (when Apple Developer Team ID is available): switch to Universal Links (pure HTTPS callback).
    //    - Add Associated Domains entitlement: applinks:<your-icp0-host> (e.g. applinks:zks5c-sqaaa-aaaah-qqf4a-cai.icp0.io).
    //    - Host AASA at `/.well-known/apple-app-site-association` on that domain, mapping /ii-callback.
    //    - Handle application(_:continue:) for NSUserActivityTypeBrowsingWeb and route /ii-callback to the web app.

    // Keep a strong reference to any child webview opened via window.open
    private var childWebView: WKWebView?
    private let scriptHandlerName = "iiAuth"
    private let brokerHandlerName = "broker"
    // Use a Mobile Safari user agent so providers like Google treat WKWebView as a secure browser
    private let safariMobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    // Internet Identity authorize URL we can reload to complete the handshake after Google auth
    private let iiAuthorizeURL = URL(string: "https://identity.ic0.app/#authorize")!
    private weak var presentedSafariVC: SFSafariViewController?
    // Keep a strong reference to ASWebAuthenticationSession
    private var brokerSession: ASWebAuthenticationSession?

    private func registerScriptHandler(for webView: WKWebView) {
        // Ensure only one handler is registered for this name
        webView.configuration.userContentController.removeScriptMessageHandler(forName: scriptHandlerName)
        webView.configuration.userContentController.add(self, name: scriptHandlerName)
        // Register broker bridge for starting ASWebAuthenticationSession from JS when we flip to broker
        webView.configuration.userContentController.removeScriptMessageHandler(forName: brokerHandlerName)
        webView.configuration.userContentController.add(self, name: brokerHandlerName)
    }
    private func attachDelegatesWhenReady() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
                if let rootVC = self.window?.rootViewController as? CAPBridgeViewController, let webView = rootVC.bridge?.webView {
                webView.uiDelegate = self
                webView.navigationDelegate = self
                webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
                if #available(iOS 14.0, *) {
                    webView.configuration.defaultWebpagePreferences.allowsContentJavaScript = true
                }
                // Match Mobile Safari user agent to improve federated login compatibility
                webView.customUserAgent = self.safariMobileUA
                self.registerScriptHandler(for: webView)
            } else {
                // Retry shortly until the webView is available
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    self.attachDelegatesWhenReady()
                }
            }
        }
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // DEVELOPMENT ONLY: Clear WKWebView cache on launch to ensure fresh bundle loads
        #if DEBUG
        clearWebViewCache()
        #endif
        
        // Ensure WKWebView popups (window.open) are handled in-app with an opener,
        // so Internet Identity can communicate via postMessage.
        // The WKWebView may not be instantiated yet; attach delegates when it's ready
        attachDelegatesWhenReady()
        return true
    }
    
    // MARK: - Clear WebView Cache
    private func clearWebViewCache() {
        let websiteDataTypes = NSSet(array: [
            WKWebsiteDataTypeDiskCache,
            WKWebsiteDataTypeMemoryCache,
            WKWebsiteDataTypeCookies,
            WKWebsiteDataTypeSessionStorage,
            WKWebsiteDataTypeLocalStorage,
            WKWebsiteDataTypeWebSQLDatabases,
            WKWebsiteDataTypeIndexedDBDatabases
        ])
        
        let date = Date(timeIntervalSince1970: 0)
        WKWebsiteDataStore.default().removeData(
            ofTypes: websiteDataTypes as! Set<String>,
            modifiedSince: date,
            completionHandler:{ 
                print("✅ WKWebView cache cleared - fresh bundle should load")
            }
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Handle custom scheme broker callback: doocoins://ii-callback?code=...&nonce=...
        if url.scheme == "doocoins" {
            // Forward the URL to the web app so it can parse code/nonce and import the session
            if let rootVC = self.window?.rootViewController as? CAPBridgeViewController, let webView = rootVC.bridge?.webView {
                    // Use a raw Swift string with interpolation to avoid complex escaping
                    let js = #"window.dispatchEvent(new CustomEvent('broker:callback', { detail: "\#(url.absoluteString)" }));"#
                webView.evaluateJavaScript(js, completionHandler: nil)
            }
            return true
        }
        // Called when the app was launched with a url. Keep Capacitor handler for plugins.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - WKUIDelegate (support window.open)
extension AppDelegate {
    // Allow navigation decisions to proceed and rely on createWebViewWith to handle popups.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, let host = url.host?.lowercased() {
            // Detect Google OAuth login flows and open them in a compliant browser context (SFSafariViewController)
            let googleHosts: [String] = [
                "accounts.google.com",
                "myaccount.google.com",
                "oauthaccountmanager.googleapis.com",
                "clients1.google.com",
                "clients6.google.com",
                "ssl.gstatic.com",
                "apis.google.com"
            ]
            let isGoogle = googleHosts.contains(where: { host == $0 || host.hasSuffix("." + $0) }) || host.hasSuffix(".google.com")
            if isGoogle {
                // Remove any popup overlay to avoid a blank/black screen remaining in-app
                if let popup = self.childWebView {
                    popup.removeFromSuperview()
                    self.childWebView = nil
                }
                let safariVC = SFSafariViewController(url: url)
                safariVC.delegate = self
                safariVC.modalPresentationStyle = .formSheet
                self.presentedSafariVC = safariVC
                if let rootVC = self.window?.rootViewController {
                    rootVC.present(safariVC, animated: true, completion: nil)
                } else {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    // SFSafariViewControllerDelegate: user closed sheet or initial load finished
    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        // Try to resume II flow in the popup webview by loading the authorize page again
        self.presentedSafariVC = nil
        if let popup = self.childWebView {
            popup.isHidden = false
            if popup.url?.absoluteString != iiAuthorizeURL.absoluteString {
                popup.load(URLRequest(url: iiAuthorizeURL))
            }
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Create a child WKWebView to represent the popup window and keep opener relationship intact.
        // Ensure popup shares the same process pool & data store as parent to preserve session and messaging behavior.
        configuration.processPool = webView.configuration.processPool
        if #available(iOS 11.0, *) {
            configuration.websiteDataStore = webView.configuration.websiteDataStore
        }
        let popup = WKWebView(frame: webView.bounds, configuration: configuration)
        // Ensure JS can open windows in the popup as well
        popup.configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        if #available(iOS 14.0, *) {
            popup.configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        }
        popup.uiDelegate = self
        popup.navigationDelegate = self
        self.registerScriptHandler(for: popup)
        popup.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        // Present the popup over the main webview
        if let parentView = webView.superview {
            popup.translatesAutoresizingMaskIntoConstraints = false
            parentView.addSubview(popup)
            NSLayoutConstraint.activate([
                popup.leadingAnchor.constraint(equalTo: parentView.leadingAnchor),
                popup.trailingAnchor.constraint(equalTo: parentView.trailingAnchor),
                popup.topAnchor.constraint(equalTo: parentView.topAnchor),
                popup.bottomAnchor.constraint(equalTo: parentView.bottomAnchor)
            ])
        }

        self.childWebView = popup
        return popup
    }

    func webViewDidClose(_ webView: WKWebView) {
        // Remove the popup when it is closed by JS
        if webView == childWebView {
            webView.removeFromSuperview()
            childWebView = nil
        }
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding
extension AppDelegate {
    @available(iOS 13.0, *)
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Provide the window to present ASWebAuthenticationSession from
        return self.window ?? UIWindow()
    }
}

// MARK: - WKNavigationDelegate (cleanup on navigation completion/failure)
extension AppDelegate {
    // Handle JS -> Native messages from the webview(s)
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == scriptHandlerName {
            // Expect a dictionary body with { type: "closePopup" }
            if let dict = message.body as? [String: Any], let type = dict["type"] as? String {
                if type == "closePopup" {
                    DispatchQueue.main.async { [weak self] in
                        guard let self = self else { return }
                        if let popup = self.childWebView {
                            popup.removeFromSuperview()
                            self.childWebView = nil
                        }
                    }
                }
            }
            return
        }
        if message.name == brokerHandlerName {
            // Start ASWebAuthenticationSession with relay URL
            NSLog("[broker] Swift handler received message!")
            if let dict = message.body as? [String: Any], let relayUrlStr = dict["relayUrl"] as? String {
                NSLog("[broker] Swift: relayUrl STRING = \(relayUrlStr)")
                NSLog("[broker] Swift: URL has '?': \(relayUrlStr.contains("?"))")
                NSLog("[broker] Swift: URL has 'nonce=': \(relayUrlStr.contains("nonce="))")
                NSLog("[broker] Swift: URL has 'publicKey=': \(relayUrlStr.contains("publicKey="))")
                
                guard let relayUrl = URL(string: relayUrlStr) else {
                    NSLog("[broker] Swift ERROR: Failed to parse URL from string!")
                    return
                }
                
                NSLog("[broker] Swift: URL object created successfully")
                NSLog("[broker] Swift: URL.absoluteString = \(relayUrl.absoluteString)")
                
                var callbackScheme = "doocoins" // custom scheme for dev/testing
                if #available(iOS 13.0, *) {
                    NSLog("[broker] Swift: Creating ASWebAuthenticationSession")
                    let session = ASWebAuthenticationSession(url: relayUrl, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                        guard let self = self else { return }
                        // Dispatch broker callback directly from completion; ASWebAuthenticationSession
                        // may not call application(_:open:options:) for custom-scheme callbacks.
                        if let err = error {
                            NSLog("[broker] session completed with error: \(err.localizedDescription)")
                        }
                        if let cb = callbackURL {
                            NSLog("[broker] session callback URL: \(cb.absoluteString)")
                            DispatchQueue.main.async {
                                if let rootVC = self.window?.rootViewController as? CAPBridgeViewController, let webView = rootVC.bridge?.webView {
                                    let js = #"window.dispatchEvent(new CustomEvent('broker:callback', { detail: "\#(cb.absoluteString)" }));"#
                                    webView.evaluateJavaScript(js, completionHandler: nil)
                                }
                            }
                        }
                        // Release strong ref
                        self.brokerSession = nil
                    }
                    if #available(iOS 13.0, *) {
                        session.presentationContextProvider = self as? ASWebAuthenticationPresentationContextProviding
                    }
                    session.prefersEphemeralWebBrowserSession = true
                    self.brokerSession = session
                    NSLog("[broker] Swift: Starting ASWebAuthenticationSession...")
                    session.start()
                    NSLog("[broker] Swift: ASWebAuthenticationSession.start() called")
                } else {
                    // Fallback to SFSafariViewController if ASWebAuthenticationSession is unavailable
                    let safariVC = SFSafariViewController(url: relayUrl)
                    safariVC.delegate = self
                    safariVC.modalPresentationStyle = .formSheet
                    if let rootVC = self.window?.rootViewController {
                        rootVC.present(safariVC, animated: true, completion: nil)
                    } else {
                        UIApplication.shared.open(relayUrl, options: [:], completionHandler: nil)
                    }
                }
            }
            return
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // If the child webview navigated back to about:blank or similar, remove it.
        if webView == childWebView {
            if webView.url?.absoluteString == "about:blank" {
                webView.removeFromSuperview()
                childWebView = nil
                return
            }
            // Heuristic: if II shows a success/return page, auto-close the popup
            // Inspect title, body text, and link/button text for common cues
            let checkScript = "(function(){try{var d=document;var bodyText=d.body?d.body.innerText:'';var title=d.title||'';var hasBtn=false;var nodes=d.querySelectorAll('a,button');for(var i=0;i<nodes.length;i++){var txt=nodes[i].textContent||'';if(/return to app|back to app|close this window|return/i.test(txt)){hasBtn=true;break;}}return JSON.stringify({title:title,body:bodyText,btn:hasBtn});}catch(e){return JSON.stringify({title:'',body:'',btn:false});}})();"
            webView.evaluateJavaScript(checkScript) { [weak self] result, _ in
                guard let self = self else { return }
                if let json = result as? String,
                   let data = json.data(using: .utf8),
                   let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let title = (obj["title"] as? String ?? "").lowercased()
                    let body = (obj["body"] as? String ?? "").lowercased()
                    let btn  = (obj["btn"] as? Bool) ?? false
                    let cues = [
                        "authentication successful",
                        "return to app",
                        "back to app",
                        "you can close this window",
                        "signed in successfully"
                    ]
                    let matched = btn || cues.contains(where: { body.contains($0) || title.contains($0) })
                    if matched {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                            webView.removeFromSuperview()
                            self.childWebView = nil
                            // Notify JS layer as well
                            if let rootVC = self.window?.rootViewController as? CAPBridgeViewController, let wv = rootVC.bridge?.webView {
                                let js = "try{window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iiAuth && window.webkit.messageHandlers.iiAuth.postMessage({type:'closePopup'});}catch(e){}"
                                wv.evaluateJavaScript(js, completionHandler: nil)
                            }
                        }
                        return
                    }
                }
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if webView == childWebView {
            // Best-effort cleanup on failure
            webView.removeFromSuperview()
            childWebView = nil
        }
    }
}
