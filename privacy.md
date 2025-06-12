# Privacy Policy

**Effective Date:** June 13, 2025

## 1. Introduction

Welcome to the ChatGPT Usage Limit Tracker (the “Extension”). This Privacy Policy describes how the Extension handles data when you install and use it in your Chrome browser. By installing and using the Extension, you agree to the practices described below.

## 2. No Data Collection

- The Extension **does not** collect, transmit, or store any personal, usage, or behavioral data on external servers.
- All processing and storage of usage information happens **locally** in your browser via Chrome’s `storage` API.
- No user-identifiable data (e.g., name, email, IP address) is ever collected or shared.

## 3. Local Storage

- The Extension records timestamps of your own ChatGPT API requests solely to compute model-specific usage counts against quota windows.
- Timestamps are stored in [Chrome Local Storage](https://developer.chrome.com/docs/extensions/reference/storage/) under keys prefixed with `timestamps_`.
- A daily cleanup job (using Chrome Alarms) removes outdated timestamps to keep storage usage minimal and accurate.

## 4. Permissions

This Extension only requests the minimum permissions necessary to fulfill its single purpose:

- **`storage`** – to save and retrieve local usage timestamps.
- **`webRequest`** – to intercept outgoing POST requests to `https://chatgpt.com/backend-api/conversation` and detect which ChatGPT model is used.
- **`alarms`** – to schedule a daily cleanup of old timestamps.
- **Host permissions**:
  - `*://chatgpt.com/*` – to monitor ChatGPT API requests.
  - `*://raw.githubusercontent.com/*` – to fetch the publicly hosted `quota.json` file containing model quota configurations.

## 5. No Third-Party Sharing

- The Extension’s code is fully open-source and publicly available.
- No data is ever sold, shared, or transferred to any third parties for any purpose.

## 6. Remote Code

- The Extension does **not** load or execute any remote JavaScript, WebAssembly, or other code at runtime.
- All code is bundled within the extension package.

## 7. Changes to This Policy

We may update this Privacy Policy when necessary. The “Effective Date” at the top will reflect the last revision. Changes will be visible in the `privacy.md` file on GitHub.

## 8. Contact

If you have questions or concerns about this Privacy Policy, please open an issue on GitHub:

https://github.com/andyli0123/chatgpt-usage-limit-tracker/issues

---

_Last updated June 13, 2025_  
