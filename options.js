// デフォルト値
const DEFAULT_HOURLY_RATE = 1150;
const DEFAULT_OVERTIME_RATE = 1438;
const DEFAULT_NIGHT_RATE = 1438;
const DEFAULT_NIGHT_OVERTIME_RATE = 1725;
const DEFAULT_TRANSPORTATION_FEE = 0;

// 設定を読み込んで入力欄に反映
function loadSettings() {
  chrome.storage.sync.get({
    hourlyRate: DEFAULT_HOURLY_RATE,
    overtimeRate: DEFAULT_OVERTIME_RATE,
    nightRate: DEFAULT_NIGHT_RATE,
    nightOvertimeRate: DEFAULT_NIGHT_OVERTIME_RATE,
    transportationFee: DEFAULT_TRANSPORTATION_FEE
  }, (settings) => {
    document.getElementById('hourlyRate').value = settings.hourlyRate;
    document.getElementById('overtimeRate').value = settings.overtimeRate;
    document.getElementById('nightRate').value = settings.nightRate;
    document.getElementById('nightOvertimeRate').value = settings.nightOvertimeRate;
    document.getElementById('transportationFee').value = settings.transportationFee;
  });
}

// 設定を保存
function saveSettings() {
  const hourlyRate = parseInt(document.getElementById('hourlyRate').value, 10);
  const overtimeRate = parseInt(document.getElementById('overtimeRate').value, 10);
  const nightRate = parseInt(document.getElementById('nightRate').value, 10);
  const nightOvertimeRate = parseInt(document.getElementById('nightOvertimeRate').value, 10);
  const transportationFee = parseInt(document.getElementById('transportationFee').value, 10);

  if (isNaN(hourlyRate) || isNaN(overtimeRate) || isNaN(nightRate) || isNaN(nightOvertimeRate) || isNaN(transportationFee)) {
    showStatus('数値を入力してください', false);
    return;
  }

  if (hourlyRate < 0 || overtimeRate < 0 || nightRate < 0 || nightOvertimeRate < 0 || transportationFee < 0) {
    showStatus('0以上の値を入力してください', false);
    return;
  }

  chrome.storage.sync.set({
    hourlyRate: hourlyRate,
    overtimeRate: overtimeRate,
    nightRate: nightRate,
    nightOvertimeRate: nightOvertimeRate,
    transportationFee: transportationFee
  }, () => {
    showStatus('設定を保存しました', true);
  });
}

// ステータスメッセージを表示
function showStatus(message, isSuccess) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + (isSuccess ? 'success' : 'error');

  setTimeout(() => {
    status.className = 'status';
  }, 2000);
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
