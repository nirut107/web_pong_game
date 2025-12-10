import { eng } from "./language/eng";
import { th } from "./language/thai";
import { japanese } from "./language/japanese";

let dict = eng;

export function translatePage() {
  let language = localStorage.getItem("language");
  if (!language) {
    language = "en";
  }
  if (language == "jp") {
    dict = japanese;
  } else if (language == "th") {
    dict = th;
  } else {
    dict = eng;
  }
  document.querySelectorAll(".tsl").forEach((dom) => {
    const dictName = dom.getAttribute("data-tsl");
    if (dictName && dict[dictName]) {

      if (dom instanceof HTMLInputElement) {
        dom.placeholder = dict[dictName];
      } else {
        dom.textContent = dict[dictName];
      }
    }
  });
}

export function translateWord(key: string): string {
  let language = localStorage.getItem("language");
  if (!language) {
    language = "en";
  }
  if (language == "en") {
    if (eng[key]) return eng[key];
    else return key;
  } else if (language == "jp") {
    if (japanese[key]) return japanese[key];
    else return key;
  } else if (language == "th") {
    if (th[key]) return th[key];
    else return key;
  }
  return key
}

export { dict };
