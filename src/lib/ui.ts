export const select = (selector: string): HTMLElement | null => {
  return document.querySelector(`[data-handler='${selector}']`);
};

export const onInit = (callback: () => void) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }
};
