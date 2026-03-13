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

// ストレージから勤務状態を読み込む
function loadWorkStatusFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['workStatus'], (result) => {
      resolve(result.workStatus || null);
    });
  });
}

// 監視状態を取得
function getMonitoringStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getMonitoringStatus' }, (response) => {
      resolve(response || { isMonitoring: false });
    });
  });
}

// 監視ボタンを追加
async function addMonitoringButton() {
  const status = await getMonitoringStatus();
  const content = document.getElementById('content');

  // 既存のボタンを削除
  const existingBtn = document.getElementById('monitor-btn');
  if (existingBtn) existingBtn.remove();
  const existingStatus = document.getElementById('monitoring-status');
  if (existingStatus) existingStatus.remove();

  const btn = document.createElement('button');
  btn.id = 'monitor-btn';

  if (status.isMonitoring) {
    btn.className = 'monitor-btn stop';
    btn.textContent = '監視を停止';
    btn.onclick = async () => {
      await chrome.runtime.sendMessage({ action: 'stopMonitoring' });
      addMonitoringButton();
    };

    const statusDiv = document.createElement('div');
    statusDiv.id = 'monitoring-status';
    statusDiv.className = 'monitoring-status';
    statusDiv.textContent = '監視中（5分ごとに更新）';
    content.appendChild(statusDiv);
  } else {
    btn.className = 'monitor-btn start';
    btn.textContent = '監視を開始';
    btn.onclick = async () => {
      const result = await chrome.runtime.sendMessage({ action: 'startMonitoring' });
      if (result && result.success) {
        addMonitoringButton();
        // 少し待ってから状態を更新
        setTimeout(async () => {
          const workStatus = await loadWorkStatusFromStorage();
          const today = new Date().toDateString();
          if (workStatus && workStatus.date === today && workStatus.isWorking) {
            showWorkingUI(workStatus.startTime);
            addMonitoringButton();
          }
        }, 3000);
      }
    };
  }

  content.appendChild(btn);
}

// 初期化
async function init() {
  await loadSettings();

  // 設定リンクのイベント
  document.getElementById('settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // ストレージから勤務状態を取得
  const workStatus = await loadWorkStatusFromStorage();
  const today = new Date().toDateString();

  // データが今日のものかチェック
  if (workStatus && workStatus.date === today) {
    if (workStatus.isWorking && workStatus.startTime) {
      showWorkingUI(workStatus.startTime);
    } else {
      showNotWorkingUI();
    }
    addMonitoringButton();
  } else {
    // データがない場合
    showErrorUI('監視を開始してください');
    addMonitoringButton();
  }
}

document.addEventListener('DOMContentLoaded', init);
