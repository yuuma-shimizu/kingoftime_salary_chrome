// 設定のデフォルト値
const DEFAULT_HOURLY_RATE = 1150;
const DEFAULT_NIGHT_RATE = 1438;

let currentSettings = null;
let workStartTime = null;
let updateInterval = null;
let monthlySalaryTotal = 0;

// 設定を読み込む
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      hourlyRate: DEFAULT_HOURLY_RATE,
      nightRate: DEFAULT_NIGHT_RATE,
      deductBreakTime: false,
      breakTime6h: 45,
      breakTime8h: 60
    }, (settings) => {
      currentSettings = settings;
      resolve(settings);
    });
  });
}

// 休憩時間を計算（分）
function getBreakTimeMinutes(elapsedHours) {
  if (!currentSettings.deductBreakTime) return 0;
  if (elapsedHours > 8) return currentSettings.breakTime8h;
  if (elapsedHours > 6) return currentSettings.breakTime6h;
  return 0;
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
  const elapsedHours = elapsedSeconds / 3600;

  // 休憩時間を控除
  const breakTimeMinutes = getBreakTimeMinutes(elapsedHours);
  const breakTimeSeconds = breakTimeMinutes * 60;
  const workSeconds = Math.max(0, elapsedSeconds - breakTimeSeconds);

  const hourlyRate = getCurrentHourlyRate();
  const currentEarnings = (workSeconds / 3600) * hourlyRate;

  const hour = now.getHours();
  const rateType = (hour >= 22 || hour < 5) ? '深夜' : '通常';

  // 休憩控除ありの場合は表示を変える
  const breakInfo = breakTimeMinutes > 0 ? `（休憩${breakTimeMinutes}分控除）` : '';
  document.getElementById('elapsed').textContent = formatElapsedTime(workSeconds) + breakInfo;
  document.getElementById('rate-type').textContent = rateType;
  document.getElementById('earnings').textContent = Math.floor(currentEarnings).toLocaleString();

  // リアルタイム累積を更新
  const realtimeTotal = document.getElementById('realtime-total');
  if (realtimeTotal) {
    const total = monthlySalaryTotal + currentEarnings;
    realtimeTotal.textContent = Math.floor(total).toLocaleString();
  }
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

// ストレージから給与データを読み込む
function loadSalaryFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['salaryData'], (result) => {
      resolve(result.salaryData || null);
    });
  });
}

// 今月の累積給与を表示
async function showMonthlySalary() {
  const salaryData = await loadSalaryFromStorage();
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const content = document.getElementById('content');

  // 既存の月次給与セクションを削除
  const existingSection = document.getElementById('monthly-salary');
  if (existingSection) existingSection.remove();

  if (salaryData && salaryData.yearMonth === currentYearMonth) {
    monthlySalaryTotal = salaryData.total;

    const section = document.createElement('div');
    section.id = 'monthly-salary';
    section.className = 'monthly-salary';
    section.innerHTML = `
      <div class="monthly-header">${now.getMonth() + 1}月のリアルタイム累積</div>
      <div class="monthly-total"><span id="realtime-total">${salaryData.total.toLocaleString()}</span>円</div>
      <div class="monthly-details">
        <span>確定: ${salaryData.total.toLocaleString()}</span>
        <span>+本日</span>
      </div>
    `;

    // content の最初に挿入
    content.insertBefore(section, content.firstChild);
  }
}

// 監視状態を取得
function getMonitoringStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getMonitoringStatus' }, (response) => {
      resolve(response || { isMonitoring: false });
    });
  });
}

// 監視状態を表示
async function showMonitoringStatus() {
  const status = await getMonitoringStatus();
  const content = document.getElementById('content');

  // 既存のステータスを削除
  const existingStatus = document.getElementById('monitoring-status');
  if (existingStatus) existingStatus.remove();

  const statusDiv = document.createElement('div');
  statusDiv.id = 'monitoring-status';
  statusDiv.className = 'monitoring-status';

  if (status.isMonitoring) {
    statusDiv.textContent = '自動監視中（5分ごとに更新）';
  } else {
    statusDiv.style.color = '#dc3545';
    statusDiv.textContent = 'KingOfTimeにログインしてください';
  }

  content.appendChild(statusDiv);
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
  } else {
    // データがない場合
    showErrorUI('KingOfTimeにログインして<br>データを取得中...');
  }

  // 今月の累積給与を表示
  await showMonthlySalary();

  // 監視状態を表示
  showMonitoringStatus();
}

document.addEventListener('DOMContentLoaded', init);
