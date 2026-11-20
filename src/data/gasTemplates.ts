export const CODE_GS_TEMPLATE = `/**
 * PulsePoint HR — Google Apps Script Backend (Code.gs)
 * ระบบเก็บสะสมคะแนนร่วมกิจกรรมพนักงานใน Google Sheets
 *
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheet ที่ต้องการใช้เก็บข้อมูล
 * 2. ไปที่เมนู Extensions > Apps Script
 * 3. ลบโค้ดเดิมและวางโค้ดนี้ลงในไฟล์ Code.gs
 * 4. กด Run ฟังก์ชัน setupSheets() เพื่อสร้างหัวตารางอัตโนมัติ 4 แท็บ
 * 5. กด Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone)
 */

const SHEET_NAMES = {
  EMPLOYEES: 'Employees',
  ACTIVITIES: 'Activities',
  LOGS: 'PointLogs',
  REWARDS: 'Rewards',
};

const HEADERS = {
  Employees: [
    'id', 'employeeCode', 'fullName', 'department', 'role', 'email',
    'availablePoints', 'lifetimePoints', 'activitiesCount', 'joinedDate'
  ],
  Activities: [
    'id', 'title', 'category', 'points', 'eventDate', 'status',
    'participantsCount', 'description'
  ],
  PointLogs: [
    'id', 'employeeId', 'employeeCode', 'employeeName', 'department',
    'activityId', 'activityTitle', 'pointsDelta', 'type', 'note',
    'recordedAt', 'recordedBy'
  ],
  Rewards: [
    'id', 'title', 'category', 'pointsCost', 'stock', 'redeemedCount', 'description'
  ],
};

/**
 * รันฟังก์ชันนี้ 1 ครั้งเพื่อสร้าง Sheet และหัวตารางให้ครบทั้ง 4 แท็บ
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      const headerRow = HEADERS[sheetName];
      sheet.appendRow(headerRow);
      const range = sheet.getRange(1, 1, 1, headerRow.length);
      range.setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  });
  return { ok: true, spreadsheetUrl: ss.getUrl() };
}

function doGet(e) {
  const mode = (e && e.parameter && e.parameter.mode) || '';
  const action = (e && e.parameter && e.parameter.action) || '';

  if (mode === 'api' || action === 'getAll') {
    return jsonResponse(getAllData());
  }

  // หากสร้างไฟล์ Index.html ไว้ใน Apps Script จะเปิดเป็นเว็บแอปได้โดยตรง
  try {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('PulsePoint HR — ระบบสะสมคะแนนกิจกรรมพนักงาน')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return jsonResponse(getAllData());
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const action = body.action || '';
    const payload = body.payload || {};

    ensureAllSheets();

    switch (action) {
      case 'ping':
        return jsonResponse({
          ok: true,
          message: 'เชื่อมต่อ Google Apps Script สำเร็จ',
          spreadsheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
        });
      case 'getAll':
        return jsonResponse(getAllData());
      case 'pushSeedData':
        return jsonResponse(pushSeedData(payload));
      case 'addEmployee':
        return jsonResponse(upsertEmployee(payload, false));
      case 'updateEmployee':
        return jsonResponse(upsertEmployee(payload, true));
      case 'deleteEmployee':
        return jsonResponse(deleteEmployeeById(payload.id));
      case 'addActivity':
        return jsonResponse(upsertActivity(payload, false));
      case 'updateActivity':
        return jsonResponse(upsertActivity(payload, true));
      case 'logPoints':
        return jsonResponse(logActivityPoints(payload));
      case 'redeemReward':
        return jsonResponse(redeemEmployeeReward(payload));
      case 'addReward':
        return jsonResponse(insertRow(SHEET_NAMES.REWARDS, HEADERS.Rewards, payload));
      default:
        return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  } finally {
    lock.releaseLock();
  }
}

function ensureAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const missing = Object.keys(HEADERS).some(function (name) {
    return !ss.getSheetByName(name);
  });
  if (missing) {
    setupSheets();
  }
}

function getAllData() {
  ensureAllSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    ok: true,
    spreadsheetUrl: ss.getUrl(),
    employees: readSheetObjects(SHEET_NAMES.EMPLOYEES, ['availablePoints', 'lifetimePoints', 'activitiesCount']),
    activities: readSheetObjects(SHEET_NAMES.ACTIVITIES, ['points', 'participantsCount']),
    logs: readSheetObjects(SHEET_NAMES.LOGS, ['pointsDelta']).reverse(),
    rewards: readSheetObjects(SHEET_NAMES.REWARDS, ['pointsCost', 'stock', 'redeemedCount']),
  };
}

function readSheetObjects(sheetName, numericFields) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      let val = row[c];
      if (numericFields.indexOf(key) !== -1) {
        val = Number(val) || 0;
      } else if (val instanceof Date) {
        val = val.toISOString();
      } else {
        val = String(val);
      }
      obj[key] = val;
    }
    rows.push(obj);
  }
  return rows;
}

function pushSeedData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  writeAllRows(ss.getSheetByName(SHEET_NAMES.EMPLOYEES), HEADERS.Employees, data.employees || []);
  writeAllRows(ss.getSheetByName(SHEET_NAMES.ACTIVITIES), HEADERS.Activities, data.activities || []);
  writeAllRows(ss.getSheetByName(SHEET_NAMES.LOGS), HEADERS.PointLogs, (data.logs || []).slice().reverse());
  writeAllRows(ss.getSheetByName(SHEET_NAMES.REWARDS), HEADERS.Rewards, data.rewards || []);
  return getAllData();
}

function writeAllRows(sheet, headers, items) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
  }
  if (!items.length) return;
  const rows = items.map(function (item) {
    return headers.map(function (h) {
      return item[h] !== undefined ? item[h] : '';
    });
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function insertRow(sheetName, headers, obj) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const row = headers.map(function (h) {
    return obj[h] !== undefined ? obj[h] : '';
  });
  sheet.appendRow(row);
  return getAllData();
}

function upsertEmployee(emp, isUpdate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EMPLOYEES);
  const data = sheet.getDataRange().getValues();
  if (isUpdate) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(emp.id)) {
        const row = HEADERS.Employees.map(function (h) {
          return emp[h] !== undefined ? emp[h] : data[i][HEADERS.Employees.indexOf(h)];
        });
        sheet.getRange(i + 1, 1, 1, HEADERS.Employees.length).setValues([row]);
        return getAllData();
      }
    }
  }
  return insertRow(SHEET_NAMES.EMPLOYEES, HEADERS.Employees, emp);
}

function deleteEmployeeById(empId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.EMPLOYEES);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(empId)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getAllData();
}

function upsertActivity(act, isUpdate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ACTIVITIES);
  const data = sheet.getDataRange().getValues();
  if (isUpdate) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(act.id)) {
        const row = HEADERS.Activities.map(function (h) {
          return act[h] !== undefined ? act[h] : data[i][HEADERS.Activities.indexOf(h)];
        });
        sheet.getRange(i + 1, 1, 1, HEADERS.Activities.length).setValues([row]);
        return getAllData();
      }
    }
  }
  return insertRow(SHEET_NAMES.ACTIVITIES, HEADERS.Activities, act);
}

function logActivityPoints(payload) {
  const logs = payload.logs || [];
  if (!logs.length) return { ok: false, error: 'ไม่มีรายการคะแนนที่จะบันทึก' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);
  const empSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
  const actSheet = ss.getSheetByName(SHEET_NAMES.ACTIVITIES);

  const empValues = empSheet.getDataRange().getValues();
  const actValues = actSheet.getDataRange().getValues();

  logs.forEach(function (entry) {
    const row = HEADERS.PointLogs.map(function (h) {
      return entry[h] !== undefined ? entry[h] : '';
    });
    logSheet.appendRow(row);

    const delta = Number(entry.pointsDelta) || 0;
    for (let i = 1; i < empValues.length; i++) {
      if (String(empValues[i][0]) === String(entry.employeeId)) {
        const availCol = HEADERS.Employees.indexOf('availablePoints') + 1;
        const lifeCol = HEADERS.Employees.indexOf('lifetimePoints') + 1;
        const countCol = HEADERS.Employees.indexOf('activitiesCount') + 1;

        const newAvail = (Number(empValues[i][availCol - 1]) || 0) + delta;
        const newLife = (Number(empValues[i][lifeCol - 1]) || 0) + (delta > 0 ? delta : 0);
        const newCount = (Number(empValues[i][countCol - 1]) || 0) + (entry.type === 'earn' ? 1 : 0);

        empValues[i][availCol - 1] = newAvail;
        empValues[i][lifeCol - 1] = newLife;
        empValues[i][countCol - 1] = newCount;

        empSheet.getRange(i + 1, availCol).setValue(newAvail);
        empSheet.getRange(i + 1, lifeCol).setValue(newLife);
        empSheet.getRange(i + 1, countCol).setValue(newCount);
        break;
      }
    }

    if (entry.type === 'earn') {
      for (let j = 1; j < actValues.length; j++) {
        if (String(actValues[j][0]) === String(entry.activityId)) {
          const pCol = HEADERS.Activities.indexOf('participantsCount') + 1;
          const newParticipants = (Number(actValues[j][pCol - 1]) || 0) + 1;
          actValues[j][pCol - 1] = newParticipants;
          actSheet.getRange(j + 1, pCol).setValue(newParticipants);
          break;
        }
      }
    }
  });

  return getAllData();
}

function redeemEmployeeReward(payload) {
  const { employeeId, rewardId, quantity, logEntry } = payload;
  const qty = Math.max(1, Number(quantity) || 1);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const empSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
  const rewSheet = ss.getSheetByName(SHEET_NAMES.REWARDS);
  const logSheet = ss.getSheetByName(SHEET_NAMES.LOGS);

  const empValues = empSheet.getDataRange().getValues();
  const rewValues = rewSheet.getDataRange().getValues();

  let cost = Math.abs(Number(logEntry.pointsDelta) || 0);
  let empRowIdx = -1;
  for (let i = 1; i < empValues.length; i++) {
    if (String(empValues[i][0]) === String(employeeId)) {
      empRowIdx = i + 1;
      const avail = Number(empValues[i][HEADERS.Employees.indexOf('availablePoints')]) || 0;
      if (avail < cost) {
        return { ok: false, error: 'คะแนนคงเหลือของพนักงานไม่เพียงพอ' };
      }
      empSheet.getRange(empRowIdx, HEADERS.Employees.indexOf('availablePoints') + 1).setValue(avail - cost);
      break;
    }
  }
  if (empRowIdx === -1) return { ok: false, error: 'ไม่พบข้อมูลพนักงาน' };

  if (rewardId && rewardId !== 'custom') {
    for (let j = 1; j < rewValues.length; j++) {
      if (String(rewValues[j][0]) === String(rewardId)) {
        const stockCol = HEADERS.Rewards.indexOf('stock') + 1;
        const redCol = HEADERS.Rewards.indexOf('redeemedCount') + 1;
        const stock = Number(rewValues[j][stockCol - 1]) || 0;
        const redeemed = Number(rewValues[j][redCol - 1]) || 0;
        if (stock < qty) return { ok: false, error: 'จำนวนของรางวัลคงเหลือไม่เพียงพอ' };
        rewSheet.getRange(j + 1, stockCol).setValue(stock - qty);
        rewSheet.getRange(j + 1, redCol).setValue(redeemed + qty);
        break;
      }
    }
  }

  const row = HEADERS.PointLogs.map(function (h) {
    return logEntry[h] !== undefined ? logEntry[h] : '';
  });
  logSheet.appendRow(row);

  return getAllData();
}

/**
 * ฟังก์ชันสำหรับเรียกใช้จาก Index.html (กรณี Deploy เป็นหน้าเว็บใน Apps Script โดยตรง)
 */
function apiClientGetAll() {
  return getAllData();
}

function apiClientLogPoints(payload) {
  return logActivityPoints(payload);
}

function apiClientRedeemReward(payload) {
  return redeemEmployeeReward(payload);
}

function apiClientAddEmployee(emp) {
  ensureAllSheets();
  return upsertEmployee(emp, false);
}
`;

export const INDEX_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PulsePoint HR — ระบบสะสมคะแนนกิจกรรมพนักงาน</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'IBM Plex Sans Thai', sans-serif; background: #F8FAFC; color: #0F172A; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="p-6 md:p-10 max-w-6xl mx-auto">
  <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">PulsePoint HR</h1>
      <p class="text-sm text-slate-500">ระบบบันทึกและสะสมคะแนนกิจกรรมพนักงาน (เชื่อมต่อ Google Sheets)</p>
    </div>
    <button onclick="openModal()" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">
      + บันทึกคะแนนกิจกรรม
    </button>
  </header>

  <section class="grid grid-cols-2 md:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 my-6">
    <div class="p-4">
      <div class="text-xs text-slate-500">พนักงานทั้งหมด</div>
      <div id="stat-emp" class="text-2xl font-semibold tabular-nums mt-1">0</div>
    </div>
    <div class="p-4">
      <div class="text-xs text-slate-500">คะแนนสะสมรวม</div>
      <div id="stat-pts" class="text-2xl font-semibold tabular-nums text-teal-700 mt-1">0</div>
    </div>
    <div class="p-4">
      <div class="text-xs text-slate-500">กิจกรรมที่เปิดรับ</div>
      <div id="stat-act" class="text-2xl font-semibold tabular-nums mt-1">0</div>
    </div>
    <div class="p-4">
      <div class="text-xs text-slate-500">ประวัติการบันทึก</div>
      <div id="stat-logs" class="text-2xl font-semibold tabular-nums mt-1">0</div>
    </div>
  </section>

  <section class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
      <h2 class="text-base font-semibold">อันดับคะแนนพนักงาน</h2>
      <input id="search" oninput="render()" placeholder="ค้นหาชื่อหรือรหัส..." class="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" />
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th class="px-5 py-3 font-medium">อันดับ</th>
            <th class="px-5 py-3 font-medium">พนักงาน</th>
            <th class="px-5 py-3 font-medium">แผนก</th>
            <th class="px-5 py-3 font-medium text-right">กิจกรรม</th>
            <th class="px-5 py-3 font-medium text-right">คะแนนคงเหลือ</th>
          </tr>
        </thead>
        <tbody id="tbody" class="divide-y divide-slate-100"></tbody>
      </table>
    </div>
  </section>

  <div id="modal" class="hidden fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
      <h3 class="text-lg font-semibold">บันทึกคะแนนกิจกรรม</h3>
      <div>
        <label class="block text-xs text-slate-600 mb-1">พนักงาน</label>
        <select id="m-emp" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"></select>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">กิจกรรม</label>
        <select id="m-act" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"></select>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">หมายเหตุ</label>
        <input id="m-note" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="ระบุรายละเอียดเพิ่มเติม..." />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeModal()" class="px-4 py-2 text-sm border border-slate-200 rounded-lg">ยกเลิก</button>
        <button onclick="submitPoints()" class="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg">บันทึก</button>
      </div>
    </div>
  </div>

  <script>
    let state = { employees: [], activities: [], logs: [], rewards: [] };

    function load() {
      google.script.run.withSuccessHandler(function(res) {
        state = res;
        render();
      }).apiClientGetAll();
    }

    function render() {
      const q = document.getElementById('search').value.toLowerCase();
      const sorted = state.employees.slice().sort((a, b) => b.availablePoints - a.availablePoints);
      const filtered = sorted.filter(e =>
        e.fullName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q)
      );

      document.getElementById('stat-emp').textContent = state.employees.length;
      document.getElementById('stat-pts').textContent = state.employees.reduce((s, e) => s + e.availablePoints, 0).toLocaleString();
      document.getElementById('stat-act').textContent = state.activities.filter(a => a.status === 'active').length;
      document.getElementById('stat-logs').textContent = state.logs.length;

      document.getElementById('tbody').innerHTML = filtered.map((e, idx) => \`
        <tr class="hover:bg-slate-50">
          <td class="px-5 py-3 tabular-nums text-slate-500">#\${idx + 1}</td>
          <td class="px-5 py-3 font-medium">\${e.fullName} <span class="text-xs text-slate-400 ml-1">\${e.employeeCode}</span></td>
          <td class="px-5 py-3 text-slate-600">\${e.department}</td>
          <td class="px-5 py-3 text-right tabular-nums">\${e.activitiesCount}</td>
          <td class="px-5 py-3 text-right tabular-nums font-semibold text-teal-700">\${e.availablePoints.toLocaleString()}</td>
        </tr>
      \`).join('');
    }

    function openModal() {
      document.getElementById('m-emp').innerHTML = state.employees.map(e => \`<option value="\${e.id}">\${e.employeeCode} · \${e.fullName}</option>\`).join('');
      document.getElementById('m-act').innerHTML = state.activities.map(a => \`<option value="\${a.id}">\${a.title} (+\${a.points})</option>\`).join('');
      document.getElementById('modal').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('modal').classList.add('hidden');
    }

    function submitPoints() {
      const empId = document.getElementById('m-emp').value;
      const actId = document.getElementById('m-act').value;
      const note = document.getElementById('m-note').value;
      const emp = state.employees.find(e => e.id === empId);
      const act = state.activities.find(a => a.id === actId);
      if (!emp || !act) return;

      const entry = {
        id: 'log-' + Date.now(),
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        department: emp.department,
        activityId: act.id,
        activityTitle: act.title,
        pointsDelta: act.points,
        type: 'earn',
        note: note,
        recordedAt: new Date().toISOString(),
        recordedBy: 'Apps Script Web App'
      };

      google.script.run.withSuccessHandler(function(res) {
        state = res;
        closeModal();
        render();
      }).apiClientLogPoints({ logs: [entry] });
    }

    load();
  </script>
</body>
</html>
`;
