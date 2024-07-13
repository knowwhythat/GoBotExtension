import browser from "webextension-polyfill";
import { getCssSelector } from "css-selector-generator";

let prev = void 0;
let record = false;
let id = "";
browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("[test]" + message.message);

  if (message.message === "start") {
    id = message.id;
    deepAddStyle(window);
    deepAddListener(window);
  }

  //录制开始
  if (message.message === "startRecord") {
    deepAddStyle(window);
    deepAddListener(window);
    record = true;
  }

  //录制结束
  if (message.message === "stop") {
    deepRemoveListener(window);
    if (prev) {
      prev.className = prev.className.replace(/\s?\bgobothighlight\b/, "");
      prev = void 0;
    }
    record = false;
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
    win = getElementByXpath(frame, win.document)[0].contentWindow;
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

const getElementByXpath = function (path, document) {
  const result = document.evaluate(
    path,
    document,
    null,
    XPathResult.ANY_TYPE,
    null
  );
  const elements = [];
  let element = result.iterateNext();
  while (element) {
    elements.push(element);
    element = result.iterateNext();
  }
  return elements;
};

function isXPath(str) {
  const regex = /^([(/@]|id\()/;

  return regex.test(str);
}

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
    framePath: framePaths,
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
    if (!record) {
      deepRemoveListener(window);
    }
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
    //input变更事件
    win.document.addEventListener("change", change_event);
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

  //提交事件
  for (i = 0; i < win.document.forms.length; i++) {
    win.document.forms[i].addEventListener("submit", onsubmit_event);
  }
};

const deepRemoveListener = function (win) {
  let i;
  try {
    //移动事件
    win.document.removeEventListener("mouseover", mouseover_event);
    //鼠标点击事件
    win.document.removeEventListener("mousedown", mousedown_event);
    //input变更事件
    win.document.removeEventListener("change", change_event);
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

  //提交事件
  for (i = 0; i < win.document.forms.length; i++) {
    win.document.forms[i].removeEventListener("submit", onsubmit_event);
  }
};

//文本变更处理
const change_event = function (event) {
  const target = "target" in event ? event.target : event.srcElement;
  target.className = target.className.replace(/\s?\bgobothighlight\b/, "");

  browser.runtime.sendMessage({
    id: id,
    type: "text",
    message: MakeJson(target, event),
  });
  if (!record) {
    deepRemoveListener(window);
  }
};

//表单提交事件处理
const onsubmit_event = function (event) {
  const target = "target" in event ? event.target : event.srcElement;
  target.className = target.className.replace(/\s?\bgobothighlight\b/, "");

  browser.runtime.sendMessage({
    id: id,
    type: "form",
    message: MakeJson(target, event),
  });

  //当画面局部刷新时补充样式设置
  setTimeout(function () {
    deepAddStyle(window);
  }, 2000);
};

function getElementXPath(element) {
  if (element.id !== "") {
    //判断id属性，如果这个元素有id，则显 示//*[@id="xPath"]  形式内容
    return '//*[@id="' + element.id + '"]';
  }
  //这里需要注意字符串转译问题，可参考js 动态生成html时字符串和变量转译（注意引号的作用）
  if (element === document.body) {
    //递归到body处，结束递归
    return "/html/" + element.tagName.toLowerCase();
  }
  let ix = 1, //在nodelist中的位置，且每次点击初始化
    brothers = element.parentNode.childNodes; //同级的子元素

  for (let i = 0, l = brothers.length; i < l; i++) {
    let brother = brothers[i];
    //如果这个元素是brothers数组中的元素，则执行递归操作
    if (brother === element) {
      return (
        getElementXPath(element.parentNode) +
        "/" +
        element.tagName.toLowerCase() +
        "[" +
        ix +
        "]"
      );
      //如果不符合，判断是否是element元素，并且是否是相同元素，如果是相同的就开始累加
    } else if (brother.nodeType === 1 && brother.tagName === element.tagName) {
      ix++;
    }
  }
}

function getElementPath(element) {
  const paths = [];
  paths.push(...makePathByAttribute(element));
  try {
    const selector = getCssSelector(element);
    paths.push(selector);
  } catch (e) {}
  const fullPath = getElementXPath(element);
  paths.push(fullPath);
  return paths;
}

const getFramePath = function (element) {
  const win = element.ownerDocument.defaultView;

  const paths = [];
  if (win !== win.parent) {
    paths.push(...makePathByAttribute(win.frameElement));
    const fullPath = getElementXPath(win.frameElement);
    paths.push(fullPath);
  }

  return paths;
};

function makePathByAttribute(element) {
  const list = [];
  const text = "//" + element.tagName.toLowerCase();
  const attributeNames = element.getAttributeNames();
  if (attributeNames.length === 0) {
    list.push(text);
  }
  attributeNames.forEach((name) => {
    list.push(text + "[@" + name + "='" + element.getAttribute(name) + "']");
  });
  if (element.innerText) {
    list.push(text + "[string()='" + element.innerText + "']");
    list.push(text + "[contains(string(),'" + element.innerText + "')]");
    list.push(text + "[starts-with(string(),'" + element.innerText + "')]");
  }
  return list;
}

deepAddStyle(window);
console.log("loaded");
