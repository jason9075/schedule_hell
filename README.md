# Access Control Planning Tool (門禁權限規劃工具)

本專案是一個純前端 (Vanilla JS) 的門禁系統原型，旨在探索兩種截然不同的權限管理架構。

## 🚀 快速開始 (Quick Start)

本專案使用 **Nix** 管理開發環境。

1. **進入開發環境**：
   ```bash
   nix develop
   # 或使用 direnv
   direnv allow
   ```

2. **啟動原型**：
   
   | 版本 | 架構模型 | 啟動指令 |
   |------|----------|----------|
   | **V1** | 嚴格互斥模型 (Mutual Exclusion) | `just dev` |
   | **V2** | 權重優先模型 (Priority-Based) | `just dev-v2` |

---

## 🏛️ 架構比較 (Architecture Comparison)

### 方案一：嚴格互斥模型 (V1)
**對應檔案**：`index.html`, `main.js`

這是最直觀的管理方式。將「人員」、「裝置」、「時間」全部綁定在一個「群組 (Group)」中。

*   **核心邏輯**：
    *   一個使用者 **不能** 同時存在於兩個設定了相同裝置的群組中。
    *   一旦偵測到衝突 (Conflict)，系統會立即報錯並禁止儲存。
*   **優點**：
    *   **直觀**：所見即所得，不會有「隱藏」的權限覆蓋問題。
    *   **安全**：絕對避免意外授予多餘權限。
*   **缺點**：
    *   **僵化**：在現實組織中，一個人常有多重身分（如：同時是「員工」也是「福委會成員」）。在此模型下，管理員必須手動創建一個合併後的「特殊群組」來處理這種狀況，維護成本極高。

---

### 方案二：權重優先模型 (V2)
**對應檔案**：`index-v2.html`, `main-v2.js`

這是更接近企業級 (Enterprise) 門禁系統的設計。將「時間模板」、「群組權重」、「授權規則」拆分管理。

*   **核心邏輯**：
    *   **Templates (模板)**：定義時間 (e.g., Office Hours, 24/7)，可重複使用。
    *   **Priority (權重)**：每個群組擁有優先級 (e.g., Managers P-90, Staff P-10)。
    *   **Resolution (決勝)**：使用者可以身兼多個群組。當多個群組對同一裝置有不同設定時，**權重最高者勝出 (Highlander Rule)**。
*   **優點**：
    *   **靈活**：可以輕鬆設定「基層員工」與「特殊專案組」的重疊人員，系統會自動算出最終權限。
    *   **可擴展**：修改一個 Template，所有相關聯的規則都會更新。
*   **缺點**：
    *   **邏輯隱晦**：管理員若不清楚權重規則，可能會困惑為何某個設定沒生效（因為被高權重覆蓋了）。
    *   **依賴 POV**：必須依賴「使用者視角 (Point of View)」工具來驗證最終計算結果。

---

## 🛠 技術堆疊 (Tech Stack)

*   **Runtime**: Browser (Vanilla JS, ES Modules)
*   **Environment**: NixOS / Nix Flakes
*   **Task Runner**: Just
*   **Live Server**: Browser-Sync

## 📂 專案結構

- `index.html` / `main.js`: V1 實作
- `index-v2.html` / `main-v2.js`: V2 實作
- `style.css` / `style-v2.css`: 樣式表
- `flake.nix`: Nix 環境定義
- `AGENTS.md`: AI Agent 協作指南
