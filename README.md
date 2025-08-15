# ChatGPT Usage Limit Tracker

A **Chrome Extension** to monitor your **ChatGPT usage limits** (quotas) in real time.

## 📦 Installation

| Browser   | Install Link |
| :-------: | ------------ |
| <img src="https://github.com/user-attachments/assets/5463ef88-873b-4516-8514-5277664cfde7" alt="Chromium"> | <a href="https://chrome.google.com/webstore/detail/pbgiljgknpehngkimlhaemngkgglnden">Chrome Web Store</a> |
| <img src="https://github.com/user-attachments/assets/b0136512-56a5-4856-8c50-4971c957a24f" alt="Firefox"> | <a href="https://addons.mozilla.org/addon/chatgpt-usage-limit-tracker/">Firefox Add-ons</a> |
| <img src="https://github.com/user-attachments/assets/3a7569f8-688b-4eb1-a643-8d0fe173aefe" alt="Microsoft Edge"> | <a href="https://microsoftedge.microsoft.com/addons/detail/peikfceajfmjjnifhmlhocldheffmdjo">Edge Add-ons</a> |

## 🚀 Features

- **Track usage limits for GPT-5 models** — including `gpt-5`, `gpt-5-thinking`, and `gpt-5-pro`.
- **Plan switcher** — switch between **Free**, **Plus**, **Team**, and **Pro** plans.
- **Visual progress bars** — see your quota usage at a glance.
- **Local & private** — all data is stored locally in your browser; **no tracking**.
- **Auto-updates** — we’ll update model limits when OpenAI changes them.

## 🖥️ How It Works

1. The extension listens for requests to ChatGPT’s backend API.  
2. It detects which model you’re using (`gpt-5`, `gpt-5-thinking`, etc.).  
3. Each request is timestamped locally and compared against your plan’s quota rules.  
4. Displays usage progress, remaining quota, and plan-specific limits.

## 🔒 Privacy

- **No tracking**: The extension does **not** collect, transmit, or store any personal data on external servers.
- **Open source**: Full code is available on [GitHub](https://github.com/andyli0123/chatgpt-usage-limit-tracker).

## 📜 Changelog

### 2.2 — 2025-08-15
- Added monthly period.

### 2.1 — 2025-08-12
- Added Japanese and Korean.

### 2.0 — 2025-08-08
- Added **GPT-5 support** (`gpt-5`, `gpt-5-thinking`, `gpt-5-pro`).
- Added **plan switcher** (Free, Plus, Team, Pro).

### 1.1 — 2025-07-16
- Adapted to OpenAI API endpoint changes.  

### 1.0 — 2025-06-13
- Initial release.
- Supported models: `o3`, `o4-mini-high`, `o4-mini`, `4.5`, `4.1`, `4.1-mini`, `4o`.
