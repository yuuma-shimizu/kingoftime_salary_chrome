// 設定のデフォルト値
const DEFAULT_HOURLY_RATE = 1150;
const DEFAULT_NIGHT_RATE = 1438;

let currentSettings = null;
let workStartTime = null;
let updateInterval = null;

// 設定を読み込む
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      hourlyRate: DEFAULT_HOURLY_RATE,
      nightRate: DEFAULT_NIGHT_RATE
    }, (settings) => {
      currentSettings = settings;
      resolve(settings);
    });
  });
}

// 時刻文字列をDateオブジェクトに変換
function parseTimeToDate(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// 経過時間をフォーマット
function formatElapsedTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}時間${minutes}分${secs}秒`;
}

// 現在の時給を取得
function getCurrentHourlyRate() {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 22 || hour < 5) {
    return currentSettings.nightRate;
  }
  return currentSettings.hourlyRate;
}

// 表示を更新
function updateDisplay() {
  if (!workStartTime) return;

  const now = new Date();
  const elapsedSeconds = (now - workStartTime) / 1000;
  const hourlyRate = getCurrentHourlyRate();
  const currentEarnings = (elapsedSeconds / 3600) * hourlyRate;

  const hour = now.getHours();
  const rateType = (hour >= 22 || hour < 5) ? '深夜' : '通常';

  document.getElementById('elapsed').textContent = formatElapsedTime(elapsedSeconds);
  document.getElementById('rate-type').textContent = rateType;
  document.getElementById('earnings').textContent = currentEarnings.toFixed(2);
}

// 勤務中UIを表示
function showWorkingUI(startTimeStr) {
  workStartTime = parseTimeToDate(startTimeStr);

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="status working">勤務中</div>
    <div class="info-row">
      <span class="label">出勤時間</span>
      <span class="value">${startTimeStr}</span>
    </div>
    <div class="info-row">
      <span class="label">経過時間</span>
      <span class="value" id="elapsed">0時間0分0秒</span>
    </div>
    <div class="info-row">
      <span class="label">時給区分</span>
      <span class="value" id="rate-type">通常</span>
    </div>
    <div class="earnings">
      <span id="earnings">0.00</span>円
    </div>
  `;

  updateDisplay();
  updateInterval = setInterval(updateDisplay, 1000);
}

// 非勤務中UIを表示
function showNotWorkingUI() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="status not-working">勤務外</div>
    <p style="text-align: center; color: #666; font-size: 13px;">
      KingOfTimeで出勤打刻すると<br>リアルタイム給与が表示されます
    </p>
  `;
}

// エラーUIを表示
function showErrorUI(message) {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="error">${message}</div>`;
}

// 初期化
async function init() {
  await loadSettings();

  // 設定リンクのイベント
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // アクティブなタブに問い合わせ
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    // KingOfTimeのページかチェック
    if (!tab.url || !tab.url.includes('kingoftime.jp')) {
      showErrorUI('KingOfTimeのページを開いてください');
      return;
    }

    // コンテントスクリプトにメッセージ送信
    chrome.tabs.sendMessage(tab.id, { action: 'getWorkStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        showErrorUI('ページを再読み込みしてください');
        return;
      }

      if (response && response.isWorking && response.startTime) {
        showWorkingUI(response.startTime);
      } else {
        showNotWorkingUI();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
