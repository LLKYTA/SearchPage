let client;
let uapiReady = false;
let uapiReadyPromise = null;

async function UapiPreLoad() {
  if (uapiReadyPromise) return uapiReadyPromise;
  
  uapiReadyPromise = (async () => {
    try {
      let { UapiClient } = await import('https://cdn.jsdelivr.net/npm/uapi-browser-sdk@latest/dist/index.js')
      client = new UapiClient('https://uapis.cn');
      uapiReady = true;
      console.log("UapiPreLoad success");
      return true;
    }
    catch (err) {
      console.error("UAPI SDK 加载失败:", err);
      return false;
    }
  })();
  
  return uapiReadyPromise;
}

// 等待SDK就绪的辅助函数
async function waitForUapi() {
  if (uapiReady) return true;
  return await UapiPreLoad();
}

/* ========== 天气功能 ========== */
async function GetWeather() {
  await waitForUapi();
  if (!client) {
    console.warn("UAPI 客户端未初始化，无法获取天气");
    return null;
  }

  const payload = {
    extended: true, // 获取扩展字段：体感温度、湿度、紫外线、AQI 等
    forecast: false,
    hourly: false,
    minutely: false,
    indices: false,
    lang: "zh",
  };

  try {
    const data = await client.misc.getMiscWeather(payload);
    return data; // 现在会包含 feels_like、humidity、visibility、pressure、uv 等
  } catch (err) {
    console.error("获取天气失败:", err);
    return null;
  }
}
/* ========== 热榜功能 ========== */
/**
 * 获取指定平台的热榜数据（优先使用SDK，失败自动降级为REST API）
 * @param {string} type - 热榜平台类型
 * @returns {Promise<Object|null>} 热榜数据对象，失败返回 null
 */
async function GetHotboard(type) {
   try {
     const apiUrl = `https://uapis.cn/api/v1/misc/hotboard?type=${encodeURIComponent(type)}`;
     const response = await fetch(apiUrl);
     
     if (!response.ok) {
       console.warn(`热榜 API 请求失败 (${response.status}): ${type}`);
       return null;
     }
     
     const data = await response.json();
     console.log("热榜数据:", data);
     return data;
   } catch (err) {
     console.error("获取热榜失败:", type, err);
     return null;
   }
 }

/* ========== 网站元数据 / Favicon 获取 ========== */
async function GetWebsiteMetadata(url) {
  try {
    const apiUrl = `https://uapis.cn/api/v1/webparse/metadata?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.warn(`UAPI 请求失败 (${response.status}): ${url}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn("获取网站元数据失败:", url, err);
    return null;
  }
}

window.addEventListener('load', async () => {
  await UapiPreLoad();
  await GetWeather();
  // 通知 main.js SDK 已就绪，可以加载热榜了
  if (typeof onUapiReady === 'function') {
    onUapiReady();
  }
})
