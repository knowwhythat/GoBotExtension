import browser from "webextension-polyfill";
import { getCssSelector } from "css-selector-generator";
import {
  makePathByAttribute,
  makeQueryForElement,
  getElementByXpath,
  getFrameByXpath,
  isXPath,
} from "./xpath";

let prev = void 0;
let id = "";
browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("[test]" + message.message);

  //开始拾取
  if (message.message === "start") {
    id = message.id;
    deepAddStyle(window);
    deepAddListener(window);
  }

  //结束拾取
  if (message.message === "stop") {
    deepRemoveListener(window);
    if (prev) {
      prev.className = prev.className.replace(/\s?\bgobothighlight\b/, "");
      prev = void 0;
    }
  }

  //高亮元素
  if (message.message === "highlight") {
    id = message.id;
    highlightElement(message.frame, message.xpath);
  }
});

const highlightElement = function (frame, xpath) {
  let elements;
  let win = window;
  if (frame && frame !== "") {
    win = getFrameByXpath(frame);
  }
  if (isXPath(xpath)) {
    elements = getElementByXpath(xpath, win.document);
  } else {
    elements = win.document.querySelectorAll(xpath);
  }
  if (elements.length > 0) {
    elements.forEach((element) => {
      element.className += " gobothighlight";
    });
    setTimeout(function () {
      elements.forEach((element) => {
        element.className = element.className.replace(
          /\s?\bgobothighlight\b/,
          ""
        );
      });
      browser.runtime.sendMessage({
        id: id,
        type: "highlight",
        message: "ok",
      });
    }, 2000);
  } else {
    browser.runtime.sendMessage({
      id: id,
      type: "highlight",
      message: "error",
    });
  }
};

const addStyle = function (doc, css) {
  let head, style;
  head = doc.getElementsByTagName("head")[0];
  style = doc.createElement("style");
  style.type = "text/css";
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(doc.createTextNode(css));
  }
  head.appendChild(style);
};

const mouseover_event = function (event) {
  try {
    if (event.target === document.body || prev === event.target) {
      return;
    }
    if (prev) {
      prev.className = prev.className.replace(/\s?\bgobothighlight\b/, "");
      prev = void 0;
    }

    if (event.target) {
      prev = event.target;
      prev.className += " gobothighlight";
    }
  } catch (err) {
    console.error(err);
  }
};

//消息统一格式
const MakeJson = function (target, event) {
  //frame结构路径
  const framePaths = getFramePath(target);
  const elementPaths = getElementPath(target);

  return {
    framePath: [framePaths],
    elementPath: elementPaths,
  };
};

const mousedown_event = function (event) {
  const target = "target" in event ? event.target : event.srcElement;
  if (target.nodeType === Node.ELEMENT_NODE) {
    target.className = target.className.replace(/\s?\bgobothighlight\b/, "");

    const JsonData = MakeJson(target, event);

    browser.runtime.sendMessage({ type: "click", id: id, message: JsonData });

    //采集情况下终止监听
    deepRemoveListener(window);
  }
};

String.prototype.trimEnd = function (c) {
  let i;
  let rg;
  let str;
  if (c == null || c === "") {
    str = this;
    rg = /s/;
    i = str.length;
    while (rg.test(str.charAt(--i))) {}
    return str.slice(0, i + 1);
  } else {
    str = this;
    rg = new RegExp(c);
    i = str.length;
    while (rg.test(str.charAt(--i))) {}
    return str.slice(0, i + 1);
  }
};

const deepAddStyle = function (win) {
  try {
    addStyle(
      win.document,
      ".gobothighlight { background:#ffcccc !important;outline:2px dashed #6366f1 !important;transition: all 0.15s linear}"
    );
  } catch (err) {
    console.log("[GoBot Err] : " + err);
  }

  for (let i = 0; i < win.frames.length; i++) {
    try {
      deepAddStyle(win.frames[i].window);
    } catch (err) {
      console.log("[GoBot Err] : " + err);
    }
  }
};

const deepAddListener = function (win) {
  let i;
  try {
    //移动事件
    win.document.addEventListener("mouseover", mouseover_event);
    //鼠标点击事件
    win.document.addEventListener("mousedown", mousedown_event);
  } catch (err) {
    console.log("[GoBot Err] : " + err);
  }

  for (i = 0; i < win.frames.length; i++) {
    try {
      deepAddListener(win.frames[i].window);
    } catch (err) {
      console.log("[GoBot Err] : " + err);
    }
  }
};

const deepRemoveListener = function (win) {
  let i;
  try {
    //移动事件
    win.document.removeEventListener("mouseover", mouseover_event);
    //鼠标点击事件
    win.document.removeEventListener("mousedown", mousedown_event);
  } catch (err) {
    console.log("[GoBot Err] : " + err);
  }

  for (i = 0; i < win.frames.length; i++) {
    try {
      deepRemoveListener(win.frames[i].window);
    } catch (err) {
      console.log("[GoBot Err] : " + err);
    }
  }
};

function getElementPath(element) {
  const paths = [];
  paths.push(makeQueryForElement(element, true));
  paths.push(...makePathByAttribute(element));
  try {
    const selector = getCssSelector(element);
    paths.push(selector);
  } catch (e) {}
  const fullPath = makeQueryForElement(element);
  paths.push(fullPath);
  return paths;
}

const getFramePath = function (element) {
  const win = element.ownerDocument.defaultView;
  if (win !== win.parent) {
    const fullPath = makeQueryForElement(win.frameElement, true);
    let outterXpath = getFramePath(win.frameElement);
    if (outterXpath) {
      return outterXpath + " | " + fullPath;
    } else {
      return fullPath;
    }
  }

  return "";
};

deepAddStyle(window);
console.log("loaded");
