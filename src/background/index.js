import browser from "webextension-polyfill";

console.log("background is running");

const nativeMessageConn = (function () {
    let _nativeMsgPort = null;
    initMsPort();

    function initMsPort() {
        const nativeHostName = "com.gobot.chrome";
        if (_nativeMsgPort === undefined) {
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
        browser.tabs.query({active: true}).then((tabs) => {
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
    return true;
});
