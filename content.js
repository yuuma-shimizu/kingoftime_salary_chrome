// 給与設定
const HOURLY_RATE = 1150;  // 基本時給（円）
const OVERTIME_RATE = 1438; // 残業時給（円）

function calculateSalary(workData) {
  const salary = {
    regular: 0,    // 通常勤務の給与
    overtime: 0,   // 残業代
    total: 0       // 合計
  };

  // 平日の計算
  if (workData.weekday) {
    const regularHours = workData.weekday['所定時間'] || 0;
    salary.regular += (regularHours * 60) * (HOURLY_RATE / 60);

    const overtimeHours = workData.weekday['残業'] || 0;
    salary.overtime += (overtimeHours * 60) * (OVERTIME_RATE / 60);
  }

  // 休日の計算
  if (workData.holiday) {
    const holidayHours = workData.holiday['所定時間'] || 0;
    const holidayOvertime = workData.holiday['残業'] || 0;
    salary.overtime += ((holidayHours + holidayOvertime) * 60) * (OVERTIME_RATE / 60);
  }

  // 合計の計算
  salary.total = salary.regular + salary.overtime;

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
          <th class="all_work_time"><p>合計</p></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="fixed_work">${Math.floor(salary.regular).toLocaleString()}円</td>
          <td class="overtime_work">${Math.floor(salary.overtime).toLocaleString()}円</td>
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
    cells[2].textContent = `${Math.floor(salary.total).toLocaleString()}円`;
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

  // 給与表示を更新
  const salary = updateSalaryDisplay(workData);

  console.log('勤務時間データ:', workData);
  console.log('給与計算結果:', {
    基本給: Math.floor(salary.regular) + '円',
    残業代: Math.floor(salary.overtime) + '円',
    合計: Math.floor(salary.total) + '円'
  });

  return {
    workData,
    salary
  };
}

// テーブルの変更を監視（メインテーブルのみ）
const observer = new MutationObserver((mutations) => {
  const targetTable = mutations[0].target.querySelector('.specific-table_800');
  if (targetTable && !mutations[0].target.matches('#salary-calculation-section')) {
    parseWorkTimeTable();
  }
});

// 初期実行とObserver開始
window.addEventListener('load', () => {
  setTimeout(() => {
    parseWorkTimeTable();
    const targetNode = document.querySelector('.htBlock-normalTable');
    if (targetNode) {
      observer.observe(targetNode, { 
        childList: true,
        subtree: true 
      });
    }
  }, 1000);
});