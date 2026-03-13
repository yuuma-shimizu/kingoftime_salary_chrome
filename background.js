// アイコンクリック時にオプションページを開く
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
