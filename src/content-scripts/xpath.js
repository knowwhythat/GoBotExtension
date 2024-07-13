const elementsShareFamily = (primaryEl, siblingEl) => {
  const p = primaryEl,
    s = siblingEl;
  return (
    p.tagName === s.tagName &&
    (!p.className || p.className === s.className) &&
    (!p.id || p.id === s.id)
  );
};

const getElementIndex = (el) => {
  let index = 1; // XPath is one-indexed
  let sib;
  for (sib = el.previousSibling; sib; sib = sib.previousSibling) {
    if (sib.nodeType === Node.ELEMENT_NODE && elementsShareFamily(el, sib)) {
      index++;
    }
  }
  if (index > 1) {
    return index;
  }
  for (sib = el.nextSibling; sib; sib = sib.nextSibling) {
    if (sib.nodeType === Node.ELEMENT_NODE && elementsShareFamily(el, sib)) {
      return 1;
    }
  }
  return 0;
};

const isValidId = function (id) {
  const maxNumericEndingLength = 8;
  // 检查ID是否以数字结尾，并且数字长度超过阈值
  const match = id.match(/\d+$/);
  return !match || match[0].length <= maxNumericEndingLength;
};

const makeQueryForElement = (el, toShort = false, batch = false) => {
  let query = "";
  for (; el && el.nodeType === Node.ELEMENT_NODE; el = el.parentNode) {
    let component = el.tagName.toLowerCase();
    const index = getElementIndex(el);
    if (el.id && isValidId(el.id)) {
      component += "[@id='" + el.id + "']";
    } else if (el.className) {
      component += "[@class='" + el.className + "']";
    }
    if (!batch && index >= 1) {
      component += "[" + index + "]";
    }
    try {
      const nodes = getElementByXpath(
        "//" + component,
        el.ownerDocument.defaultView
      );
      if (toShort && nodes.length === 1) {
        query = "//" + component + query;
        break;
      }
    } catch (e) {
      // If the query is invalid, just return the component.
      console.log(e);
    }
    query = "/" + component + query;
  }
  return query;
};

function makePathByAttribute(element) {
  const list = [];
  const text = "//" + element.tagName.toLowerCase();
  const attributeNames = element.getAttributeNames();
  if (attributeNames.length === 0) {
    list.push(text);
  }
  attributeNames.forEach((name) => {
    if (name !== "class" && element.getAttribute(name)) {
      list.push(text + "[@" + name + "='" + element.getAttribute(name) + "']");
    }
  });
  if (element.innerText) {
    if (element.innerText.length < 10) {
      list.push(text + "[string()='" + element.innerText + "']");
    } else {
      list.push(
        text +
          "[contains(string(),'" +
          element.innerText.substring(0, 10) +
          "')]"
      );
      list.push(
        text +
          "[starts-with(string(),'" +
          element.innerText.substring(0, 10) +
          "')]"
      );
    }
  }
  return list;
}

function splitStringBySpacedPipe(str) {
  // 正则表达式匹配左右各有一个空格的 | 字符
  const regex = /\s\|(?=\s)/;
  // 检查字符串是否包含这样的 | 字符
  if (regex.test(str)) {
    // 使用匹配的 | 字符分割字符串
    return str.split(regex);
  } else {
    // 如果没有找到匹配的 | 字符，返回原始字符串
    return [str];
  }
}

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

const getFrameByXpath = function (path) {
  const paths = splitStringBySpacedPipe(path);
  let win = window;
  for (let index = 0; index < paths.length; index++) {
    const element = paths[index];
    win = getElementByXpath(element, win.document)[0].contentWindow;
  }
  return win;
};

function isXPath(str) {
  const regex = /^([(/@]|id\()/;

  return regex.test(str);
}

export {
  makeQueryForElement,
  makePathByAttribute,
  getElementByXpath,
  getFrameByXpath,
  isXPath,
};
