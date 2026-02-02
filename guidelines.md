既然決定用 Vanilla JS，我們可以利用原生 DOM API 搭配 Data Attributes 來管理狀態，這樣代碼會非常乾淨且易於維護。

以下是針對你的需求整理出的 guidelines.md，包含了 HTML 結構建議、衝突檢測邏輯以及 UI 操作流程。
Access Control Planning Tool (Vanilla JS 版)
1. 資料結構設計 (Data Model)

在不使用框架的情況下，建議將資料集中在一個 state 物件中：
JavaScript

const state = {
  users: ['Marco', 'Jason', 'Milo', 'Vera', 'Mei', 'Ching', 'Jonas', 'Gary'],
  devices: ['台北', '桃園', '台中', '台南', '新竹'],
  groups: [
    {
      id: "default-all-day",
      name: "全天",
      members: ['Marco', 'Jason', 'Milo', 'Vera', 'Mei', 'Ching', 'Jonas', 'Gary'],
      configs: {
        "台北": { start: "00:00", end: "23:59" },
        "桃園": { start: "00:00", end: "23:59" },
        // ... 其他裝置
      }
    }
  ]
};

2. 介面規劃 (UI Layout)

網頁主要分為三個區塊：
A. 群組列表區 (Group Sidebar)

    顯示所有群組名稱。

    新增群組按鈕（點擊後開啟空白編輯區）。

    點擊特定群組時，右側編輯區載入該群組資料。

B. 成員選擇區 (User Selection)

    使用 checkbox 列表。

    重點邏輯：當勾選某人時，立即執行 checkConflict()。

    若有衝突，在該成員名字旁顯示 ⚠️ 標籤並阻斷儲存。

C. 裝置與 Template 設定區 (Device Config)

    列表顯示 5 個裝置。

    每個裝置配對一組 input type="time"（Start & End）。

    開關機制：只有勾選「啟用該裝置」後，才可調整時段。

3. 核心邏輯實現：衝突檢測 (Conflict Detection)

這是本專案最關鍵的規則：「一個人不能在兩組裡設定到同一台機器」。
JavaScript

function checkConflict(targetUserId, targetGroupId, targetDeviceKeys) {
  // 遍歷所有現有群組
  for (const group of state.groups) {
    // 跳過正在編輯的群組本身
    if (group.id === targetGroupId) continue;

    // 如果這個人已經在另一個群組中
    if (group.members.includes(targetUserId)) {
      const existingDevices = Object.keys(group.configs);
      
      // 檢查是否有重複的裝置
      const conflicts = targetDeviceKeys.filter(d => existingDevices.includes(d));
      if (conflicts.length > 0) {
        return {
          hasConflict: true,
          conflictingGroup: group.name,
          devices: conflicts
        };
      }
    }
  }
  return { hasConflict: false };
}

4. 前端開發 Guidelines (Vanilla JS 技巧)
1. 使用 Event Delegation

不要幫每個 checkbox 綁定 addEventListener。直接在父容器綁定一次：
JavaScript

document.querySelector('#user-list').addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    renderConflictWarnings();
  }
});

2. 視覺化衝突提示

當檢測到衝突時，UI 應：

    將該成員的 label 轉為紅色。

    禁用「儲存按鈕」。

    在下方顯示提示文字：Jason 已在 "全天" 群組中設定過 "台北" 裝置。

3. 表單驗證 (Validation)

    連續時段：End Time 必須大於 Start Time（Vanilla JS 可以直接比較字串 "17:00" > "07:00" 是成立的）。

    必填：若啟用了某裝置，則必須填寫時段。

5. 建議操作流程

    點擊「新增群組」 -> 右側表單清空。

    勾選成員 -> JS 動態檢查該成員在其他群組是否已佔用裝置。

    設定時段 -> JS 檢查時段合法性。

    點擊「儲存」 -> 更新 state.groups 並重新渲染左側列表。
