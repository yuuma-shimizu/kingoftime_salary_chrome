// デフォルト値
const DEFAULT_HOURLY_RATE = 1150;
const DEFAULT_OVERTIME_RATE = 1438;
const DEFAULT_NIGHT_RATE = 1438;
const DEFAULT_NIGHT_OVERTIME_RATE = 1725;
const DEFAULT_TRANSPORTATION_FEE = 0;
const DEFAULT_DEDUCT_BREAK_TIME = false;
const DEFAULT_BREAK_TIME_6H = 45;
const DEFAULT_BREAK_TIME_8H = 60;

// 自動計算の倍率
const OVERTIME_MULTIPLIER = 1.25;
const NIGHT_MULTIPLIER = 1.25;
const NIGHT_OVERTIME_MULTIPLIER = 1.5;

// 自動計算値を更新
function updateAutoCalcValues() {
  const hourlyRate = parseInt(document.getElementById('hourlyRate').value, 10) || 0;

  // 残業時給
  if (document.getElementById('autoCalcOvertime').checked) {
    const calcValue = Math.ceil(hourlyRate * OVERTIME_MULTIPLIER);
    document.getElementById('overtimeRate').value = calcValue;
    document.getElementById('overtimeCalcInfo').textContent = `${hourlyRate} × ${OVERTIME_MULTIPLIER} = ${calcValue}円`;
  } else {
    document.getElementById('overtimeCalcInfo').textContent = '';
  }

  // 深夜時給
  if (document.getElementById('autoCalcNight').checked) {
    const calcValue = Math.ceil(hourlyRate * NIGHT_MULTIPLIER);
    document.getElementById('nightRate').value = calcValue;
    document.getElementById('nightCalcInfo').textContent = `${hourlyRate} × ${NIGHT_MULTIPLIER} = ${calcValue}円`;
  } else {
    document.getElementById('nightCalcInfo').textContent = '';
  }

  // 深夜残業時給
  if (document.getElementById('autoCalcNightOvertime').checked) {
    const calcValue = Math.ceil(hourlyRate * NIGHT_OVERTIME_MULTIPLIER);
    document.getElementById('nightOvertimeRate').value = calcValue;
    document.getElementById('nightOvertimeCalcInfo').textContent = `${hourlyRate} × ${NIGHT_OVERTIME_MULTIPLIER} = ${calcValue}円`;
  } else {
    document.getElementById('nightOvertimeCalcInfo').textContent = '';
  }
}

// チェックボックスの状態に応じて入力欄を有効/無効にする
function updateInputStates() {
  document.getElementById('overtimeRate').disabled = document.getElementById('autoCalcOvertime').checked;
  document.getElementById('nightRate').disabled = document.getElementById('autoCalcNight').checked;
  document.getElementById('nightOvertimeRate').disabled = document.getElementById('autoCalcNightOvertime').checked;

  // 休憩時間設定の表示/非表示
  const breakTimeSettings = document.getElementById('breakTimeSettings');
  const deductBreakTime = document.getElementById('deductBreakTime').checked;
  breakTimeSettings.style.display = deductBreakTime ? 'block' : 'none';
  document.getElementById('breakTime6h').disabled = !deductBreakTime;
  document.getElementById('breakTime8h').disabled = !deductBreakTime;

  updateAutoCalcValues();
}

// 設定を読み込んで入力欄に反映
function loadSettings() {
  chrome.storage.sync.get({
    hourlyRate: DEFAULT_HOURLY_RATE,
    overtimeRate: DEFAULT_OVERTIME_RATE,
    nightRate: DEFAULT_NIGHT_RATE,
    nightOvertimeRate: DEFAULT_NIGHT_OVERTIME_RATE,
    transportationFee: DEFAULT_TRANSPORTATION_FEE,
    autoCalcOvertime: false,
    autoCalcNight: false,
    autoCalcNightOvertime: false,
    deductBreakTime: DEFAULT_DEDUCT_BREAK_TIME,
    breakTime6h: DEFAULT_BREAK_TIME_6H,
    breakTime8h: DEFAULT_BREAK_TIME_8H
  }, (settings) => {
    document.getElementById('hourlyRate').value = settings.hourlyRate;
    document.getElementById('overtimeRate').value = settings.overtimeRate;
    document.getElementById('nightRate').value = settings.nightRate;
    document.getElementById('nightOvertimeRate').value = settings.nightOvertimeRate;
    document.getElementById('transportationFee').value = settings.transportationFee;
    document.getElementById('autoCalcOvertime').checked = settings.autoCalcOvertime;
    document.getElementById('autoCalcNight').checked = settings.autoCalcNight;
    document.getElementById('autoCalcNightOvertime').checked = settings.autoCalcNightOvertime;
    document.getElementById('deductBreakTime').checked = settings.deductBreakTime;
    document.getElementById('breakTime6h').value = settings.breakTime6h;
    document.getElementById('breakTime8h').value = settings.breakTime8h;
    updateInputStates();
  });
}

// 設定を保存
function saveSettings() {
  const hourlyRate = parseInt(document.getElementById('hourlyRate').value, 10);
  const overtimeRate = parseInt(document.getElementById('overtimeRate').value, 10);
  const nightRate = parseInt(document.getElementById('nightRate').value, 10);
  const nightOvertimeRate = parseInt(document.getElementById('nightOvertimeRate').value, 10);
  const transportationFee = parseInt(document.getElementById('transportationFee').value, 10);
  const autoCalcOvertime = document.getElementById('autoCalcOvertime').checked;
  const autoCalcNight = document.getElementById('autoCalcNight').checked;
  const autoCalcNightOvertime = document.getElementById('autoCalcNightOvertime').checked;
  const deductBreakTime = document.getElementById('deductBreakTime').checked;
  const breakTime6h = parseInt(document.getElementById('breakTime6h').value, 10);
  const breakTime8h = parseInt(document.getElementById('breakTime8h').value, 10);

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
    transportationFee: transportationFee,
    autoCalcOvertime: autoCalcOvertime,
    autoCalcNight: autoCalcNight,
    autoCalcNightOvertime: autoCalcNightOvertime,
    deductBreakTime: deductBreakTime,
    breakTime6h: breakTime6h,
    breakTime8h: breakTime8h
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
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // 基本時給が変更されたら自動計算を更新
  document.getElementById('hourlyRate').addEventListener('input', updateAutoCalcValues);

  // チェックボックスの変更を監視
  document.getElementById('autoCalcOvertime').addEventListener('change', updateInputStates);
  document.getElementById('autoCalcNight').addEventListener('change', updateInputStates);
  document.getElementById('autoCalcNightOvertime').addEventListener('change', updateInputStates);
  document.getElementById('deductBreakTime').addEventListener('change', updateInputStates);

  // 保存ボタン
  document.getElementById('save').addEventListener('click', saveSettings);
});
