if ("serviceWorker" in navigator) {
  const pwaScriptUrl = new URL(document.currentScript.src);
  const serviceWorkerUrl = new URL("../../service-worker.js", pwaScriptUrl);
  const serviceWorkerScope = new URL("../../", pwaScriptUrl);

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register(serviceWorkerUrl.pathname, {
        scope: serviceWorkerScope.pathname,
      });
    } catch (error) {
      console.warn("Service worker 註冊失敗:", error);
    }
  });
}
