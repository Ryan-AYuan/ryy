# Ryy's Creative Space

這是一個展示 Ryy 的創意編程項目和珍貴回憶的個人網站。網站採用現代化的響應式設計，並通過 **GitHub API** 實現內容的自動發現與動態加載。這意味著您只需將文件上傳到 GitHub 倉庫的指定目錄，網站即可自動更新，無需手動修改代碼。

此外，本項目還提供了一個便捷的 **Web 上傳工具 (`upload.html`)**，讓您可以直接通過瀏覽器管理網站內容。

## ✨ 功能特性 (Features)

### 1. 核心技術：GitHub 驅動 (GitHub-Driven)
- **自動化內容管理**：網站通過 `github-data.js` 直接調用 GitHub API 掃描倉庫文件。
- **零代碼更新**：新增照片、音樂或代碼作品只需上傳文件，無需編輯 HTML 或 JS。
- **隱私安全**：支持配置 GitHub Personal Access Token (PAT)，可完美支持私有倉庫 (Private Repo)。

### 2. 便捷上傳工具 (Upload Helper)
- **可視化界面**：訪問 `upload.html` 即可使用。
- **多類型支持**：支持上傳 **音樂 (BGM)**、**代碼作品 (Code)** 和 **照片 (Photo)**。
- **智能歸檔**：上傳照片時可選擇年份和月份，系統自動將文件歸檔到 `photo/YYYY/MM/` 目錄。
- **防重複檢測**：上傳前自動檢查文件是否已存在。
- **配置持久化**：GitHub Token 和倉庫信息會保存在本地瀏覽器 (LocalStorage)，無需重複輸入。

### 3. 夢幻背景特效 (Dreamy Background Effects)
為了營造浪漫與夢幻的氛圍，網站集成了多種 Canvas 粒子特效，且針對淺色背景進行了視覺優化：
- **❤️ 飄動愛心 (Floating Hearts)**：粉色愛心從底部隨機升起，象徵溫馨與愛意。
- **✨ 金色螢火蟲 (Golden Fireflies)**：帶有呼吸燈效果的金色光點，在背景中緩慢飛舞，若隱若現。
- **❄️ 淡紫飄雪 (Lavender Snow)**：柔和的淡紫色雪花/星塵緩慢飄落並輕微搖擺，增加靜謐感。
- **🌠 絢麗流星 (Pink Meteors)**：偶爾從天際劃過的亮粉色流星，帶有漸變拖尾，帶來驚喜感。
- **🖱️ 鼠標拖尾 (Mouse Trail)**：跟隨鼠標移動產生的彩色粒子軌跡，隨機擴散並消失，增加交互趣味性。

### 4. 豐富的交互功能
- **智能照片牆 (Photo Gallery)**：
    - **自動分組**：按「年份 > 月份」自動歸檔展示。
    - **沉浸式燈箱 (Lightbox)**：支持全屏查看、滾輪縮放、拖拽移動、鍵盤導航。
- **懸停式音樂播放器**：
    - 自動掃描 `bgm/` 目錄下的 MP3 文件。
    - 支持列表循環播放、懸停顯示歌名。
- **紀念日計時器**：實時計算並展示相戀天數、時、分、秒。
- **創意編程作品集**：自動展示 `code/` 目錄下的 HTML 作品。

---

## 📂 項目結構 (Project Structure)

```text
ryy/
├── index.html          # 網站主頁 (展示層)
├── upload.html         # 上傳工具 (管理層)
├── github-data.js      # 數據核心 (負責調用 GitHub API)
├── code/               # [自動掃描] 存放創意編程項目 (.html)
├── bgm/                # [自動掃描] 存放背景音樂 (.mp3)
└── photo/              # [自動掃描] 照片資源目錄
    ├── 2025/
    │   ├── January/    # 或 "01"
    │   └── February/
    └── 2026/
        └── ...
```

---

## 🚀 如何使用與更新 (How to Update)

您可以選擇以下兩種方式來更新網站內容：

### 方法一：使用上傳工具 (推薦)

1. 在瀏覽器中打開 `upload.html`。
2. 點擊 **"⚙️ Configure GitHub Settings"** 進行首次配置：
   - **Token**: 您的 GitHub Personal Access Token (需要 `repo` 權限)。
   - **Owner**: 用戶名 (例如 `Ryan-AYuan`)。
   - **Repository**: 倉庫名 (例如 `ryy`)。
   - **Branch**: 分支名 (例如 `main`)。
3. 選擇 **Target Folder** (目標類型)：
   - `BGM`: 上傳音樂。
   - `Code`: 上傳 HTML 作品。
   - `Photo`: 上傳照片 (需進一步選擇年份和月份)。
4. 拖拽文件或點擊選擇文件，然後點擊 **"Start Upload"**。

### 方法二：手動提交 (Git / GitHub Web)

只需遵守以下目錄規範上傳文件，網站即可自動識別：

1. **新增項目**：將 `.html` 文件上傳至 `code/` 目錄。
   - 如需自定義標題/日期，可在 `github-data.js` 的 `PROJECT_METADATA` 中配置（可選）。
2. **新增音樂**：將 `.mp3` 文件上傳至 `bgm/` 目錄。
3. **新增照片**：將圖片上傳至 `photo/年份/月份/` 目錄。
   - 例如：`photo/2025/March/pic1.jpg`。
   - 月份文件夾推薦使用英文全稱 (如 `March`) 或 兩位數字 (如 `03`)。

---

## 🛠️ 配置說明 (Configuration)

### 1. GitHub Token 設置
如果您的倉庫是 **私有 (Private)** 的，或者您遇到了 API 速率限制 (Rate Limit)，您必須配置 Access Token。
- 訪問網站時，如果加載失敗，頁面會顯示錯誤提示並提供 "Configure Settings" 按鈕。
- 輸入 Token 後，Token 會存儲在本地瀏覽器中，不會上傳到服務器。

### 2. 如何獲取 GitHub Personal Access Token (PAT)
為了讓你的網頁能夠「寫入」檔案到 GitHub，你需要申請一把「鑰匙」，也就是 Personal Access Token (PAT)。
現在 GitHub 推薦使用 **Fine-grained tokens (細粒度權杖)**，因為它可以限制這把鑰匙只能開啟這一個倉庫，就算不小心洩漏，別人也無法動你其他的專案，比較安全。

請跟著以下步驟操作：

**第一步：進入設定頁面**
1. 登入你的 GitHub。
2. 點擊右上角的 **個人頭像**。
3. 在選單最下方點擊 **「Settings」**。
4. 在左側選單滑到最底，點擊 **「Developer settings」**。
5. 在左側點擊 **「Personal access tokens」**，然後選擇 **「Fine-grained tokens」**。

**第二步：建立新 Token**
1. 點擊右上角的按鈕： **「Generate new token」**。
2. **Token name (名稱)**：隨便取一個，例如 `Upload-Photo-Web`。
3. **Expiration (過期日)**： 預設是 30 天。 如果你不想常常換 Token，可以選 `Custom` 然後設為一年後（這是上限）。
4. **Description**：可以留空。
5. **Resource owner**：確認是你自己。

**第三步：設定權限 (最關鍵！)**
這裡設定錯了就無法上傳，請仔細看：
1. **Repository access (倉庫權限)**：
   - 🔴 不要選 "All repositories"。
   - 🟢 請選 **「Only select repositories」**。
   - 然後在下拉選單中，選取你存放這個網頁的那個倉庫 (例如 `love-memory`或者 `ryy` )。
2. **Permissions (具體權限)**：
   - 點開下方的 **「Repository permissions」** (點擊箭頭展開)。
   - 往下捲，找到 **「Contents」** 這個項目。
   - 將 Access 權限從 "Read-only" 改為 **「Read and write」**。
   - (說明：這代表允許讀取和寫入檔案內容)。

**第四步：產生並複製**
1. 滑到最下方，點擊綠色的 **「Generate token」** 按鈕。
2. 畫面會跳轉，你現在會看到一串以 `github_pat_` 開頭的亂碼。
3. ⚠️ **注意：這串代碼只會出現這一次！**
4. 點擊旁邊的複製按鈕，把它存到你的電腦記事本裡，或者直接貼到你的程式碼中。

### 3. 修改紀念日
打開 `github-data.js`，修改 `siteData.anniversary` 字段：
```javascript
siteData.anniversary = "2025-12-23"; // 格式：YYYY-MM-DD
```

### 4. 自定義項目信息
默認情況下，項目標題會根據文件名自動生成。如需自定義，請編輯 `github-data.js` 中的 `PROJECT_METADATA` 常量：
```javascript
const PROJECT_METADATA = {
    "my_project.html": {
        title: "自定義標題",
        date: "2025-12-25",
        desc: "這裡可以寫更詳細的描述..."
    }
};
```

---

## 🎨 技術棧 (Tech Stack)

- **Frontend**: HTML5, CSS3 (Variables, Flexbox, Grid), Vanilla JavaScript (ES6+).
- **Animation**: HTML5 Canvas API (自定義粒子系統).
- **API**: GitHub REST API (用於獲取倉庫樹結構和上傳文件).
- **Storage**: Browser LocalStorage (用於存儲用戶配置).
