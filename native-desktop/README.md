# Neel Browser — Native Cross-Platform Desktop Build

Neel Browser uses **Tauri v2 + Rust** bound to each operating system's built-in WebView engine (`Edge WebView2` on Windows, `WKWebView` on macOS, `WebKitGTK` on Linux) rather than shipping a redundant 130 MB Chromium binary.

## Target Footprint
- **Windows (`Neel Browser_1.0.0_x64-setup.exe`)**: ~4.2 MB installer · ~12 MB installed
- **macOS (`Neel Browser_1.0.0_universal.dmg`)**: ~6.1 MB installer · ~16 MB installed
- **Linux (`Neel Browser_1.0.0_amd64.AppImage` / `.deb`)**: ~4.8 MB installer · ~14 MB installed
- **Idle RAM**: ~45–75 MB (with automatic inactive tab hibernation)

## Local Build Prerequisites
1. Install [Rust](https://rustup.rs/) (`1.77+`) and Node.js (`20+`).
2. On Linux, install WebKitGTK headers:
   ```bash
   sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```
3. Build the web UI and native installer for your current OS:
   ```bash
   npm install
   npm run build
   cd native-desktop && npm install && npm run build
   ```

## Automated Cross-Platform Release (.exe + .dmg + .AppImage/.deb)
Push this project to GitHub and trigger the included `.github/workflows/release-installers.yml` workflow (or push a tag like `git tag v1.0.0 && git push --tags`) to generate downloadable installers for Windows, macOS, and Linux automatically.
