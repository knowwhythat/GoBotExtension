import browser from "webextension-polyfill";

const nativeMessageConn = (function () {
  let _nativeMsgPort = null;
  initMsPort();

  function initMsPort() {
    console.log("background is running");
    const nativeHostName = "com.gobot.chrome";
    if (_nativeMsgPort === null) {
      _nativeMsgPort = browser.runtime.connectNative(nativeHostName);
      _nativeMsgPort.onMessage.addListener(onNativeMessage);
      _nativeMsgPort.onDisconnect.addListener(onDisconnected);
      console.log(_nativeMsgPort);
    }
  }

  function onDisconnected() {
    console.log(browser.runtime.lastError);
    console.log("disconnected from native app.");
    _nativeMsgPort = null;
  }

  function onNativeMessage(message) {
    // console.log("received message from native app: " + JSON.stringify(message));

    sendMsgToContent(message, (response) => {
      if (response) console.log(response);
    });
  }

  function getCurrentTabId(callback) {
    browser.tabs.query({ active: true }).then((tabs) => {
      if (callback) callback(tabs.length ? tabs[0].id : null);
    });
  }

  function getAllTabId(callback) {
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (callback) callback(tab.id);
      });
    });
  }

  function sendMsgToContent(message, callback) {
    if (message.message === "start" || message.message === "highlight") {
      getCurrentTabId((tabId) => {
        if (tabId != null) {
          console.log(tabId, message);
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (callback) callback(response);
          });
        }
      });
    } else {
      getAllTabId((tabId) => {
        if (tabId != null) {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (callback) callback(response);
          });
        }
      });
    }
  }

  return {
    sendMsgToHost: (message) => {
      _nativeMsgPort.postMessage(message);
      // sendMsgToContent(message);
    },
  };
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  nativeMessageConn.sendMsgToHost(request);
  // return true;
});
/**
 * Tracks when a service worker was last alive and extends the service worker
 * lifetime by writing the current time to extension storage every 20 seconds.
 * You should still prepare for unexpected termination - for example, if the
 * extension process crashes or your extension is manually stopped at
 * chrome://serviceworker-internals.
 */
let heartbeatInterval;

async function runHeartbeat() {
  await chrome.storage.local.set({ "last-heartbeat": new Date().getTime() });
}

/**
 * Starts the heartbeat interval which keeps the service worker alive. Call
 * this sparingly when you are doing work which requires persistence, and call
 * stopHeartbeat once that work is complete.
 */
async function startHeartbeat() {
  // Run the heartbeat once at service worker startup.
  runHeartbeat().then(() => {
    // Then again every 20 seconds.
    heartbeatInterval = setInterval(runHeartbeat, 20 * 1000);
  });
}

async function stopHeartbeat() {
  clearInterval(heartbeatInterval);
}

/**
 * Returns the last heartbeat stored in extension storage, or undefined if
 * the heartbeat has never run before.
 */
async function getLastHeartbeat() {
  return (await chrome.storage.local.get("last-heartbeat"))["last-heartbeat"];
}

startHeartbeat();
