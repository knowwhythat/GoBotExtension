import browser from "webextension-polyfill";
import { getCssSelector } from "css-selector-generator";

var prev = void 0;
var record = false;
browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("[test]" + message.message);

  if (message.message == "start") {
    deepAddStyle(window);
    deepAddListener(window);
  }

  //录制开始
  if (message.message == "startRecord") {
    deepAddStyle(window);
    deepAddListener(window);
    record = true;
  }

  //录制结束
  if (message.message == "stop") {
    deepRemoveListener(window);
    if (prev) {
      prev.className = prev.className.replace(/\s?\bhighlight\b/, "");
      prev = void 0;
    }
    record = false;
  }

  //高亮元素
  if (message.message == "highlight") {
    highlightElement(message.frame, message.xpath);
  }
});

var highlightElement = function (frame, xpath) {
  var win = window;
  if (frame && frame !== "") {
    win = getElementByXpath(frame, win.document).contentWindow;
  }
  if (isXPath(xpath)) {
    var element = getElementByXpath(xpath, win.document);
  } else {
    var element = win.document.querySelector(xpath);
  }
  if (element) {
    element.className += " highlight";
    setTimeout(function () {
      element.className = element.className.replace(/\s?\bhighlight\b/, "");
      browser.runtime.sendMessage({
        type: "highlight",
        message: element.length,
      });
    }, 2000);
  } else {
    browser.runtime.sendMessage({
      type: "highlight",
      message: "0",
    });
  }
};

var getElementByXpath = function (path, document) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
};

function isXPath(str) {
  const regex = /^([(/@]|id\()/;

  return regex.test(str);
}

var addStyle = function (doc, css) {
  var head, style;
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

var mouseover_event = function (event) {
  if (event.target === document.body || prev === event.target) {
    return;
  }
  if (prev) {
    prev.className = prev.className.replace(/\s?\bhighlight\b/, "");
    prev = void 0;
  }

  if (event.target) {
    prev = event.target;
    prev.className += " highlight";
  }
};

var mousedown_event = function (event) {
  var target = "target" in event ? event.target : event.srcElement;
  target.className = target.className.replace(/\s?\bhighlight\b/, "");

  var JsonData = MakeJson(target, event);

  browser.runtime.sendMessage({ type: "click", message: JsonData });

  //采集情况下终止监听
  if (!record) {
    deepRemoveListener(window);
  }
};

String.prototype.trimEnd = function (c) {
  if (c == null || c == "") {
    var str = this;
    var rg = /s/;
    var i = str.length;
    while (rg.test(str.charAt(--i)));
    return str.slice(0, i + 1);
  } else {
    var str = this;
    var rg = new RegExp(c);
    var i = str.length;
    while (rg.test(str.charAt(--i)));
    return str.slice(0, i + 1);
  }
};

var deepAddStyle = function (win) {
  try {
    addStyle(
      win.document,
      ".highlight { background:#ffcccc !important;outline:2px dashed #6366f1 !important;transition: all 0.15s linear}"
    );
  } catch (err) {
    console.log("[UERPA Err] : " + err);
  }

  for (var i = 0; i < win.frames.length; i++) {
    try {
      deepAddStyle(win.frames[i].window);
    } catch (err) {
      console.log("[UERPA Err] : " + err);
    }
  }
};

var deepAddListener = function (win) {
  try {
    //移动事件
    win.document.addEventListener("mouseover", mouseover_event);
    //鼠标点击事件
    win.document.addEventListener("mousedown", mousedown_event);
    //input变更事件
    win.document.addEventListener("change", change_event);
  } catch (err) {
    console.log("[UERPA Err] : " + err);
  }

  for (var i = 0; i < win.frames.length; i++) {
    try {
      deepAddListener(win.frames[i].window);
    } catch (err) {
      console.log("[UERPA Err] : " + err);
    }
  }

  //提交事件
  for (i = 0; i < win.document.forms.length; i++) {
    win.document.forms[i].addEventListener("submit", onsubmit_event);
  }
};

var deepRemoveListener = function (win) {
  try {
    //移动事件
    win.document.removeEventListener("mouseover", mouseover_event);
    //鼠标点击事件
    win.document.removeEventListener("mousedown", mousedown_event);
    //input变更事件
    win.document.removeEventListener("change", change_event);
  } catch (err) {
    console.log("[UERPA Err] : " + err);
  }

  for (var i = 0; i < win.frames.length; i++) {
    try {
      deepRemoveListener(win.frames[i].window);
    } catch (err) {
      console.log("[UERPA Err] : " + err);
    }
  }

  //提交事件
  for (i = 0; i < win.document.forms.length; i++) {
    win.document.forms[i].removeEventListener("submit", onsubmit_event);
  }
};

//文本变更处理
var change_event = function (event) {
  var target = "target" in event ? event.target : event.srcElement;
  target.className = target.className.replace(/\s?\bhighlight\b/, "");

  browser.runtime.sendMessage({
    type: "text",
    message: MakeJson(target, event),
  });
  if (!record) {
    deepRemoveListener(window);
  }
};

//表单提交事件处理
var onsubmit_event = function (event) {
  var target = "target" in event ? event.target : event.srcElement;
  target.className = target.className.replace(/\s?\bhighlight\b/, "");

  browser.runtime.sendMessage({
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
  if (element == document.body) {
    //递归到body处，结束递归
    return "/html/" + element.tagName.toLowerCase();
  }
  var ix = 1, //在nodelist中的位置，且每次点击初始化
    brothers = element.parentNode.childNodes; //同级的子元素

  for (var i = 0, l = brothers.length; i < l; i++) {
    var brother = brothers[i];
    //如果这个元素是brothers数组中的元素，则执行递归操作
    if (brother == element) {
      return (
        getElementXPath(element.parentNode) +
        "/" +
        element.tagName.toLowerCase() +
        "[" +
        ix +
        "]"
      );
      //如果不符合，判断是否是element元素，并且是否是相同元素，如果是相同的就开始累加
    } else if (brother.nodeType == 1 && brother.tagName == element.tagName) {
      ix++;
    }
  }
}

function getElementPath(element) {
  var paths = [];
  paths.push(makePathByAttribute(element));
  try {
    var selector = getCssSelector(element);
    paths.push(selector);
  } catch (e) {}
  var fullPath = getElementXPath(element);
  paths.push(fullPath);
  return paths;
}

var getFramePath = function (element) {
  var win = element.ownerDocument.defaultView;

  var paths = [];
  if (win != win.parent) {
    paths.push(makePathByAttribute(win.frameElement));
    var fullPath = getElementXPath(win.frameElement);
    paths.push(fullPath);
  }

  return paths;
};

function makePathByAttribute(element) {
  var list = [];
  var text = "//" + element.tagName.toLowerCase();
  var attributeNames = element.getAttributeNames();
  if (attributeNames.length == 0) {
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

//消息统一格式
var MakeJson = function (target, event) {
  //frame结构路径
  var framePaths = getFramePath(target);
  var elementPaths = getElementPath(target);

  return {
    framePath: framePaths,
    elementPath: elementPaths,
  };
};

deepAddStyle(window);
console.log("loaded");
