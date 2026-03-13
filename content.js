// デフォルトの給与設定
const DEFAULT_HOURLY_RATE = 1150;  // 基本時給（円）
const DEFAULT_OVERTIME_RATE = 1438; // 残業時給（円）
const DEFAULT_NIGHT_RATE = 1438; // 深夜時給（円）
const DEFAULT_NIGHT_OVERTIME_RATE = 1725; // 深夜残業時給（円）
const DEFAULT_TRANSPORTATION_FEE = 0; // 交通費（円/日）

// 現在の設定を保持する変数
let currentSettings = {
  hourlyRate: DEFAULT_HOURLY_RATE,
  overtimeRate: DEFAULT_OVERTIME_RATE,
  nightRate: DEFAULT_NIGHT_RATE,
  nightOvertimeRate: DEFAULT_NIGHT_OVERTIME_RATE,
  transportationFee: DEFAULT_TRANSPORTATION_FEE
};

// 設定を読み込む
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      hourlyRate: DEFAULT_HOURLY_RATE,
      overtimeRate: DEFAULT_OVERTIME_RATE,
      nightRate: DEFAULT_NIGHT_RATE,
      nightOvertimeRate: DEFAULT_NIGHT_OVERTIME_RATE,
      transportationFee: DEFAULT_TRANSPORTATION_FEE
    }, (settings) => {
      currentSettings = settings;
      resolve(settings);
    });
  });
}

function calculateSalary(workData) {
  const salary = {
    regular: 0,       // 通常勤務の給与
    overtime: 0,      // 残業代
    night: 0,         // 深夜労働代
    nightOvertime: 0, // 深夜残業代
    transportation: 0, // 交通費
    total: 0          // 合計
  };

  let totalWorkDays = 0;

  // 平日の計算
  if (workData.weekday) {
    const regularHours = workData.weekday['所定時間'] || 0;
    salary.regular += (regularHours * 60) * (currentSettings.hourlyRate / 60);

    const overtimeHours = workData.weekday['残業'] || 0;
    salary.overtime += (overtimeHours * 60) * (currentSettings.overtimeRate / 60);

    const nightHours = workData.weekday['深夜労働'] || 0;
    salary.night += (nightHours * 60) * (currentSettings.nightRate / 60);

    const nightOvertimeHours = workData.weekday['深夜残業'] || 0;
    salary.nightOvertime += (nightOvertimeHours * 60) * (currentSettings.nightOvertimeRate / 60);

    // 平日の出勤日数
    totalWorkDays += workData.weekday['出勤日数'] || 0;
  }

  // 休日の計算
  if (workData.holiday) {
    const holidayHours = workData.holiday['所定時間'] || 0;
    const holidayOvertime = workData.holiday['残業'] || 0;
    salary.overtime += ((holidayHours + holidayOvertime) * 60) * (currentSettings.overtimeRate / 60);

    const holidayNightHours = workData.holiday['深夜労働'] || 0;
    salary.night += (holidayNightHours * 60) * (currentSettings.nightRate / 60);

    const holidayNightOvertimeHours = workData.holiday['深夜残業'] || 0;
    salary.nightOvertime += (holidayNightOvertimeHours * 60) * (currentSettings.nightOvertimeRate / 60);

    // 休日の出勤日数
    totalWorkDays += workData.holiday['出勤日数'] || 0;
  }

  // 交通費の計算
  salary.transportation = currentSettings.transportationFee * totalWorkDays;

  // 合計の計算
  salary.total = salary.regular + salary.overtime + salary.night + salary.nightOvertime + salary.transportation;

  return salary;
}

function createSalarySection(salary) {
  const section = document.createElement('div');
  section.id = 'salary-calculation-section';
  section.style.marginTop = '20px';

  // ヘッダー作成
  const header = document.createElement('h5');
  header.className = 'htBlock-box_caption';
  header.textContent = '給与集計（拡張機能）';

  // テーブルのdiv作成
  const tableDiv = document.createElement('div');
  tableDiv.className = 'htBlock-normalTable';
  
  // テーブル作成
  tableDiv.innerHTML = `
    <table class="specific-table_800">
      <thead>
        <tr>
          <th class="fixed_work"><p>基本給</p></th>
          <th class="overtime_work"><p>残業代</p></th>
          <th class="night_work"><p>深夜労働</p></th>
          <th class="night_overtime_work"><p>深夜残業</p></th>
          <th class="transportation"><p>交通費</p></th>
          <th class="all_work_time"><p>合計</p></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="fixed_work">${Math.floor(salary.regular).toLocaleString()}円</td>
          <td class="overtime_work">${Math.floor(salary.overtime).toLocaleString()}円</td>
          <td class="night_work">${Math.floor(salary.night).toLocaleString()}円</td>
          <td class="night_overtime_work">${Math.floor(salary.nightOvertime).toLocaleString()}円</td>
          <td class="transportation">${Math.floor(salary.transportation).toLocaleString()}円</td>
          <td class="all_work_time">${Math.floor(salary.total).toLocaleString()}円</td>
        </tr>
      </tbody>
    </table>
  `;

  // セクションに要素を追加
  section.appendChild(header);
  section.appendChild(tableDiv);

  return section;
}

function updateSalaryDisplay(workData) {
  // 既存の給与セクションを探す
  let salarySection = document.getElementById('salary-calculation-section');
  const parentDiv = document.querySelector('.htBlock-normalTable');
  
  if (!parentDiv) return;

  // 給与計算を実行
  const salary = calculateSalary(workData);

  if (!salarySection) {
    // 給与セクションが存在しない場合は新規作成
    salarySection = createSalarySection(salary);
    parentDiv.after(salarySection);
  } else {
    // 既存の給与テーブルを更新
    const cells = salarySection.querySelectorAll('td');
    cells[0].textContent = `${Math.floor(salary.regular).toLocaleString()}円`;
    cells[1].textContent = `${Math.floor(salary.overtime).toLocaleString()}円`;
    cells[2].textContent = `${Math.floor(salary.night).toLocaleString()}円`;
    cells[3].textContent = `${Math.floor(salary.nightOvertime).toLocaleString()}円`;
    cells[4].textContent = `${Math.floor(salary.transportation).toLocaleString()}円`;
    cells[5].textContent = `${Math.floor(salary.total).toLocaleString()}円`;
  }

  return salary;
}

function parseWorkTimeTable() {
  console.log("parseWorkTimeTable");
  const table = document.querySelector('.specific-table_800');
  if (!table) return;

  const workData = {
    weekday: {}, // 平日
    holiday: {}  // 休日
  };

  // Get header mappings
  const headers = {};
  const headerCells = table.querySelectorAll('thead th');
  headerCells.forEach((cell, index) => {
    if (cell.textContent.trim()) {
      headers[index] = {
        text: cell.textContent.trim(),
        class: cell.className
      };
    }
  });

  // Parse rows
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const type = row.querySelector('th p').textContent.trim();
    const isWeekday = type === '平日';
    const targetObj = isWeekday ? workData.weekday : workData.holiday;

    // Parse each cell in the row
    row.querySelectorAll('td').forEach((cell, index) => {
      if (headers[index + 1]) {
        const value = cell.textContent.trim();
        const header = headers[index + 1].text;
        if (value) {
          targetObj[header] = parseFloat(value) || 0;
        } else {
          targetObj[header] = 0;
        }
      }
    });
  });

  // 日数集計セクションから出勤日数を取得
  const daysCountSection = document.querySelector('.specific-daysCount_1');
  if (daysCountSection) {
    // 平日出勤日数
    const weekdayDiv = daysCountSection.querySelector('div.work_count');
    if (weekdayDiv) {
      workData.weekday['出勤日数'] = parseFloat(weekdayDiv.textContent.trim()) || 0;
    }
    // 休日出勤日数
    const holidayDiv = daysCountSection.querySelector('div.holiday_work_count');
    if (holidayDiv) {
      workData.holiday['出勤日数'] = parseFloat(holidayDiv.textContent.trim()) || 0;
    }
  }

  // 給与表示を更新
  const salary = updateSalaryDisplay(workData);

  // 給与データをストレージに保存（ポップアップ用）
  saveSalaryToStorage(salary);

  console.log('勤務時間データ:', workData);
  console.log('給与計算結果:', {
    基本給: Math.floor(salary.regular) + '円',
    残業代: Math.floor(salary.overtime) + '円',
    深夜労働: Math.floor(salary.night) + '円',
    深夜残業: Math.floor(salary.nightOvertime) + '円',
    交通費: Math.floor(salary.transportation) + '円',
    合計: Math.floor(salary.total) + '円'
  });

  return {
    workData,
    salary
  };
}

// 給与データをストレージに保存
function saveSalaryToStorage(salary) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  chrome.storage.local.set({
    salaryData: {
      regular: Math.floor(salary.regular),
      overtime: Math.floor(salary.overtime),
      night: Math.floor(salary.night),
      nightOvertime: Math.floor(salary.nightOvertime),
      transportation: Math.floor(salary.transportation),
      total: Math.floor(salary.total),
      yearMonth: yearMonth,
      lastUpdated: Date.now()
    }
  });
}

// テーブルの変更を監視（メインテーブルのみ）
const observer = new MutationObserver((mutations) => {
  const targetTable = mutations[0].target.querySelector('.specific-table_800');
  if (targetTable && !mutations[0].target.matches('#salary-calculation-section')) {
    parseWorkTimeTable();
  }
});

// 定期的に勤務状態を監視（30秒ごと）
let statusCheckInterval = null;

function startStatusMonitoring() {
  if (statusCheckInterval) return;

  statusCheckInterval = setInterval(() => {
    const status = checkWorkingStatus();
    saveWorkStatusToStorage(status);

    // 退勤していたらリアルタイムカウントを停止
    if (!status.isWorking && realtimeInterval) {
      stopRealtime();
    }
  }, 30000); // 30秒ごとにチェック
}

// 初期実行とObserver開始
window.addEventListener('load', () => {
  setTimeout(async () => {
    // 設定を読み込んでから給与計算を実行
    await loadSettings();
    parseWorkTimeTable();
    const targetNode = document.querySelector('.htBlock-normalTable');
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
    }
    // 勤務中ならリアルタイムカウント開始
    checkAndStartRealtime();
    // 定期監視開始
    startStatusMonitoring();
  }, 1000);
});

// 設定が変更されたら再計算
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.hourlyRate) {
      currentSettings.hourlyRate = changes.hourlyRate.newValue;
    }
    if (changes.overtimeRate) {
      currentSettings.overtimeRate = changes.overtimeRate.newValue;
    }
    if (changes.nightRate) {
      currentSettings.nightRate = changes.nightRate.newValue;
    }
    if (changes.nightOvertimeRate) {
      currentSettings.nightOvertimeRate = changes.nightOvertimeRate.newValue;
    }
    if (changes.transportationFee) {
      currentSettings.transportationFee = changes.transportationFee.newValue;
    }
    parseWorkTimeTable();
  }
});

// ========== リアルタイムカウントアップ機能 ==========

let realtimeInterval = null;
let workStartTime = null;

// 今日の日付の行を探す
function findTodayRow() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${month}/${day}`;

  const rows = document.querySelectorAll('.htBlock-adjastableTableF tbody tr');
  for (const row of rows) {
    const dateCell = row.querySelector('td[data-ht-sort-index="WORK_DAY"] p');
    if (dateCell && dateCell.textContent.includes(todayStr)) {
      return row;
    }
  }
  return null;
}

// localStorageから出退勤記録を取得
function getAttendanceRecordsFromLocalStorage() {
  try {
    // PARSONAL_BROWSER_RECORDER@RECORD_HISTORY_で始まるキーを探す
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('PARSONAL_BROWSER_RECORDER@RECORD_HISTORY_')) {
        const data = localStorage.getItem(key);
        if (data) {
          return JSON.parse(data);
        }
      }
    }
  } catch (e) {
    console.error('出退勤記録の取得に失敗:', e);
  }
  return null;
}

// record_timestampを解析（YYYYMMDDHHmmss形式）
function parseRecordTimestamp(timestamp) {
  if (!timestamp || timestamp.length < 12) return null;

  const year = parseInt(timestamp.substring(0, 4), 10);
  const month = parseInt(timestamp.substring(4, 6), 10) - 1;
  const day = parseInt(timestamp.substring(6, 8), 10);
  const hour = parseInt(timestamp.substring(8, 10), 10);
  const minute = parseInt(timestamp.substring(10, 12), 10);
  const second = timestamp.length >= 14 ? parseInt(timestamp.substring(12, 14), 10) : 0;

  return new Date(year, month, day, hour, minute, second);
}

// 勤務中かどうかを判断（localStorage優先、フォールバックでDOM）
function checkWorkingStatus() {
  // まずlocalStorageから取得を試みる
  const records = getAttendanceRecordsFromLocalStorage();

  if (records && Array.isArray(records) && records.length > 0) {
    // 今日の日付
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    // 今日のレコードをフィルタして時系列でソート
    const todayRecords = records
      .filter(r => r.record_timestamp && r.record_timestamp.startsWith(todayStr))
      .sort((a, b) => {
        const timeA = a.record_timestamp || '';
        const timeB = b.record_timestamp || '';
        return timeB.localeCompare(timeA); // 降順（最新が先頭）
      });

    if (todayRecords.length > 0) {
      const latestRecord = todayRecords[0];

      // 最新が「出勤」なら勤務中
      if (latestRecord.name === '出勤') {
        const recordDate = parseRecordTimestamp(latestRecord.record_timestamp);
        const startTime = recordDate ?
          `${String(recordDate.getHours()).padStart(2, '0')}:${String(recordDate.getMinutes()).padStart(2, '0')}` :
          null;

        console.log('localStorage: 勤務中 - 出勤時間:', startTime);
        return { isWorking: true, startTime: startTime };
      }

      // 最新が「退勤」なら勤務外
      if (latestRecord.name === '退勤') {
        console.log('localStorage: 勤務外（退勤済み）');
        return { isWorking: false, startTime: null };
      }
    }
  }

  // localStorageにデータがない場合はDOMからフォールバック
  console.log('localStorageにデータなし、DOMから取得を試みます');
  return checkWorkingStatusFromDOM();
}

// DOMから勤務状態を取得（フォールバック用）
function checkWorkingStatusFromDOM() {
  const todayRow = findTodayRow();
  if (!todayRow) {
    return { isWorking: false, startTime: null };
  }

  const cells = todayRow.querySelectorAll('td.start_end_timerecord p');
  if (cells.length < 2) {
    return { isWorking: false, startTime: null };
  }

  const startTimeText = cells[0].textContent.trim();
  const endTimeText = cells[1].textContent.trim();

  // 出勤時間があり、退勤時間がない = 勤務中
  if (startTimeText && !endTimeText) {
    return { isWorking: true, startTime: startTimeText };
  }

  return { isWorking: false, startTime: null };
}

// 時刻文字列をDateオブジェクトに変換（今日の日付で）
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

// 現在の時給を判定（深夜かどうか）
function getCurrentHourlyRate() {
  const now = new Date();
  const hour = now.getHours();

  // 22:00〜5:00は深夜
  if (hour >= 22 || hour < 5) {
    return currentSettings.nightRate;
  }
  return currentSettings.hourlyRate;
}

// リアルタイム表示を更新
function updateRealtimeDisplay() {
  if (!workStartTime) return;

  const now = new Date();
  const elapsedSeconds = (now - workStartTime) / 1000;
  const hourlyRate = getCurrentHourlyRate();
  const currentEarnings = (elapsedSeconds / 3600) * hourlyRate;

  const elapsedSpan = document.getElementById('realtime-elapsed');
  const earningsSpan = document.getElementById('realtime-earnings');
  const rateSpan = document.getElementById('realtime-rate');

  if (elapsedSpan) {
    elapsedSpan.textContent = formatElapsedTime(elapsedSeconds);
  }
  if (earningsSpan) {
    earningsSpan.textContent = currentEarnings.toFixed(2);
  }
  if (rateSpan) {
    const now = new Date();
    const hour = now.getHours();
    rateSpan.textContent = (hour >= 22 || hour < 5) ? '深夜' : '通常';
  }
}

// リアルタイムセクションを作成
function createRealtimeSection(startTimeStr) {
  const existingSection = document.getElementById('realtime-section');
  if (existingSection) {
    existingSection.remove();
  }

  const section = document.createElement('div');
  section.id = 'realtime-section';
  section.style.marginTop = '20px';

  // ヘッダー作成
  const header = document.createElement('h5');
  header.className = 'htBlock-box_caption';
  header.textContent = 'リアルタイム給与（勤務中）';

  // テーブルのdiv作成
  const tableDiv = document.createElement('div');
  tableDiv.className = 'htBlock-normalTable';

  // テーブル作成
  tableDiv.innerHTML = `
    <table class="specific-table_800">
      <thead>
        <tr>
          <th class="fixed_work"><p>出勤時間</p></th>
          <th class="overtime_work"><p>経過時間</p></th>
          <th class="night_work"><p>時給区分</p></th>
          <th class="all_work_time"><p>現在の稼ぎ</p></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="fixed_work">${startTimeStr}</td>
          <td class="overtime_work" id="realtime-elapsed">0時間0分0秒</td>
          <td class="night_work" id="realtime-rate">通常</td>
          <td class="all_work_time"><span id="realtime-earnings">0.00</span>円</td>
        </tr>
      </tbody>
    </table>
  `;

  // セクションに要素を追加
  section.appendChild(header);
  section.appendChild(tableDiv);

  const salarySection = document.getElementById('salary-calculation-section');
  if (salarySection) {
    salarySection.appendChild(section);
  }
}

// リアルタイムカウント開始
function startRealtime(startTimeStr) {
  workStartTime = parseTimeToDate(startTimeStr);
  if (!workStartTime) return;

  createRealtimeSection(startTimeStr);
  updateRealtimeDisplay();

  // 1秒ごとに更新
  realtimeInterval = setInterval(updateRealtimeDisplay, 1000);
}

// リアルタイムカウント停止
function stopRealtime() {
  if (realtimeInterval) {
    clearInterval(realtimeInterval);
    realtimeInterval = null;
  }
  workStartTime = null;

  const section = document.getElementById('realtime-section');
  if (section) {
    section.remove();
  }
}

// 勤務状態をストレージに保存
function saveWorkStatusToStorage(status) {
  const today = new Date().toDateString();
  chrome.storage.local.set({
    workStatus: {
      isWorking: status.isWorking,
      startTime: status.startTime,
      date: today,
      lastUpdated: Date.now()
    }
  });
}

// 勤務中チェックと自動開始
function checkAndStartRealtime() {
  const status = checkWorkingStatus();
  console.log('勤務状態:', status);

  // ストレージに保存（ポップアップ用）
  saveWorkStatusToStorage(status);

  if (status.isWorking && status.startTime) {
    startRealtime(status.startTime);
  }
}

// ポップアップからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getWorkStatus') {
    const status = checkWorkingStatus();
    sendResponse(status);
  }
  return true;
});