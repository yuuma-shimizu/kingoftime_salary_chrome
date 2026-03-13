// KingOfTime監視用のタブID
let monitoringTabId = null;

// KingOfTimeのURL
const KINGOFTIME_URL = 'https://s3.ta.kingoftime.jp/admin/';

// 監視タブが存在するかチェック
async function checkMonitoringTab() {
  if (!monitoringTabId) return false;

  try {
    const tab = await chrome.tabs.get(monitoringTabId);
    return tab && tab.url && tab.url.includes('kingoftime.jp');
  } catch (e) {
    monitoringTabId = null;
    return false;
  }
}

// 監視を開始
async function startMonitoring() {
  // 既存の監視タブがあるか確認
  const exists = await checkMonitoringTab();
  if (exists) {
    // タブをリフレッシュ
    chrome.tabs.reload(monitoringTabId);
    return { success: true, message: 'リフレッシュしました' };
  }

  // 既存のKingOfTimeタブを探す
  const tabs = await chrome.tabs.query({ url: '*://*.kingoftime.jp/*' });
  if (tabs.length > 0) {
    monitoringTabId = tabs[0].id;
    chrome.tabs.reload(monitoringTabId);
    return { success: true, message: '既存のタブで監視を開始しました' };
  }

  // 新しいタブをバックグラウンドで開く
  const tab = await chrome.tabs.create({
    url: KINGOFTIME_URL,
    active: false
  });
  monitoringTabId = tab.id;

  // 定期リフレッシュ用のアラームを設定（5分ごと）
  chrome.alarms.create('refreshMonitoring', { periodInMinutes: 5 });

  return { success: true, message: '監視タブを作成しました' };
}

// 監視を停止
async function stopMonitoring() {
  chrome.alarms.clear('refreshMonitoring');

  if (monitoringTabId) {
    try {
      await chrome.tabs.remove(monitoringTabId);
    } catch (e) {
      // タブが既に閉じられている場合
    }
    monitoringTabId = null;
  }

  // ストレージをクリア
  chrome.storage.local.remove(['workStatus']);

  return { success: true };
}

// 監視状態を取得
async function getMonitoringStatus() {
  const exists = await checkMonitoringTab();
  return { isMonitoring: exists, tabId: monitoringTabId };
}

// アラームのリスナー
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshMonitoring') {
    const exists = await checkMonitoringTab();
    if (exists) {
      chrome.tabs.reload(monitoringTabId);
    } else {
      // タブが閉じられていたらアラームを停止
      chrome.alarms.clear('refreshMonitoring');
    }
  }
});

// タブが閉じられたときの処理
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === monitoringTabId) {
    monitoringTabId = null;
    chrome.alarms.clear('refreshMonitoring');
  }
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMonitoring') {
    startMonitoring().then(sendResponse);
    return true;
  }
  if (request.action === 'stopMonitoring') {
    stopMonitoring().then(sendResponse);
    return true;
  }
  if (request.action === 'getMonitoringStatus') {
    getMonitoringStatus().then(sendResponse);
    return true;
  }
});

// 拡張機能インストール時に自動監視開始
chrome.runtime.onInstalled.addListener(() => {
  startMonitoring();
});

// ブラウザ起動時に自動監視開始
chrome.runtime.onStartup.addListener(() => {
  startMonitoring();
});
