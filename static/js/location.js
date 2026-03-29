// ==========================================
// 🕵️‍♂️ 訪客全自動隱形監測系統 (GPS + IP 並行版)
// ==========================================
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdZ30njWwwzTRPCCF9Qg2EjpJ3kIoElXGXV1e6Nn0A1T_0H_w/formResponse";
const ENTRY_ID_FIELD = "entry.1795097192"; // 裝置 ID
const ENTRY_LOCATION_FIELD = "entry.1015767508"; // IP 粗略位置
const ENTRY_DEVICE_FIELD = "entry.1052886549"; // 裝置規格
const ENTRY_GPS_FIELD = "entry.579706436"; // ⚠️ 請改成你 Google Form 新增的「精確定位」欄位代碼！

async function stealthTracker() {
  if (sessionStorage.getItem("tracked_today")) return;

  // 1. 產生或讀取 Device ID
  let deviceId = localStorage.getItem("vocab_device_id");
  if (!deviceId) {
    deviceId = "用戶_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    localStorage.setItem("vocab_device_id", deviceId);
  }

  // 2. 獲取裝置資訊
  const userAgent = navigator.userAgent;
  const language = navigator.language || navigator.userLanguage;
  const screenRes = `${window.screen.width}x${window.screen.height}`;
  const deviceDetails = `解析度: ${screenRes} | 語系: ${language} | 系統: ${userAgent}`;

  // 3. 啟動並行任務：同時抓取 IP 與請求 GPS
  let ipLocationData = "IP 位置抓取失敗";
  let gpsLocationData = "使用者未允許或不支援 GPS";

  // 任務 A: 抓取 IP 資訊 (背景執行，不影響畫面)
  const ipTask = fetch("https://ipapi.co/json/")
    .then((res) => res.json())
    .then((ipInfo) => {
      ipLocationData = `${ipInfo.city || "未知"}, ${ipInfo.region || "未知"}, ${ipInfo.country_name || "未知"} | IP: ${ipInfo.ip || "未知"} | ISP: ${ipInfo.org || "未知"}`;
    })
    .catch((e) => console.log("IP API 呼叫失敗"));

  // 任務 B: 請求精確 GPS (會跳出視窗)
  const gpsTask = new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        gpsLocationData = `${lat},${lon} (誤差: ${Math.round(position.coords.accuracy)}m)`;
        resolve();
      },
      (error) => {
        console.log("GPS 定位被拒絕或超時");
        resolve();
      },
      { enableHighAccuracy: true, timeout: 8000 }, // 等待最多 8 秒
    );
  });

  // 等待兩個任務都完成 (或超時) 後，一併送出資料
  await Promise.all([ipTask, gpsTask]);

  // 4. 打包資料送往 Google Form
  const formData = new URLSearchParams();
  formData.append(ENTRY_ID_FIELD, deviceId);
  formData.append(ENTRY_LOCATION_FIELD, ipLocationData);
  formData.append(ENTRY_DEVICE_FIELD, deviceDetails);
  formData.append(ENTRY_GPS_FIELD, gpsLocationData);

  try {
    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    sessionStorage.setItem("tracked_today", "true");
  } catch (error) {
    console.error("同步失敗:", error);
  }
}
