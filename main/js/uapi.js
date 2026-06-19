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
    extended: false,
    forecast: false,
    hourly: false,
    minutely: false,
    indices: false,
    lang: "zh",
  };
  
  try {
    const data = await client.misc.getMiscWeather(payload);
    const Temp = document.querySelector('.weather-temp')
    const Desc = document.querySelector('.weather-desc')
    const Emoji = document.querySelector('.weather-icon')
    
    const weatherEmojiMap = {
      100: { emoji: "0x2600", name: "晴" },
      101: { emoji: "0x26C5", name: "多云" },
      102: { emoji: "0x1F324", name: "少云" },
      103: { emoji: "0x26C5", name: "晴间多云" },
      104: { emoji: "0x2601", name: "阴" },
      150: { emoji: "0x1F319", name: "晴（夜间）" },
      151: { emoji: "0x1F319", name: "多云（夜间）" },
      152: { emoji: "0x1F319", name: "少云（夜间）" },
      153: { emoji: "0x1F319", name: "晴间多云（夜间）" },
      300: { emoji: "0x1F326", name: "阵雨" },
      301: { emoji: "0x1F327", name: "强阵雨" },
      302: { emoji: "0x26C8", name: "雷阵雨" },
      303: { emoji: "0x26C8", name: "强雷阵雨" },
      304: { emoji: "0x26C8", name: "雷阵雨伴有冰雹" },
      305: { emoji: "0x1F327", name: "小雨" },
      306: { emoji: "0x1F327", name: "中雨" },
      307: { emoji: "0x1F327", name: "大雨" },
      308: { emoji: "0x1F327", name: "极端降雨" },
      309: { emoji: "0x1F327", name: "毛毛雨" },
      310: { emoji: "0x1F30A", name: "暴雨" },
      311: { emoji: "0x1F30A", name: "大暴雨" },
      312: { emoji: "0x1F30A", name: "特大暴雨" },
      313: { emoji: "0x1F974", name: "冻雨" },
      314: { emoji: "0x1F327", name: "小到中雨" },
      315: { emoji: "0x1F327", name: "中到大雨" },
      316: { emoji: "0x1F30A", name: "大雨到暴雨" },
      317: { emoji: "0x1F30A", name: "暴雨到大暴雨" },
      318: { emoji: "0x1F30A", name: "大暴雨到特大暴雨" },
      350: { emoji: "0x1F319", name: "阵雨（夜间）" },
      351: { emoji: "0x1F319", name: "强阵雨（夜间）" },
      399: { emoji: "0x1F327", name: "雨" },
      400: { emoji: "0x1F328", name: "小雪" },
      401: { emoji: "0x1F328", name: "中雪" },
      402: { emoji: "0x2744", name: "大雪" },
      403: { emoji: "0x2744", name: "暴雪" },
      404: { emoji: "0x1F328", name: "雨夹雪" },
      405: { emoji: "0x1F328", name: "雨雪天气" },
      406: { emoji: "0x1F328", name: "阵雨夹雪" },
      407: { emoji: "0x1F328", name: "阵雪" },
      408: { emoji: "0x1F328", name: "小到中雪" },
      409: { emoji: "0x2744", name: "中到大雪" },
      410: { emoji: "0x2744", name: "大雪到暴雪" },
      456: { emoji: "0x1F319", name: "阵雨夹雪（夜间）" },
      457: { emoji: "0x1F319", name: "阵雪（夜间）" },
      499: { emoji: "0x2744", name: "雪" },
      500: { emoji: "0x1F32B", name: "薄雾" },
      501: { emoji: "0x1F32B", name: "雾" },
      502: { emoji: ["0x1F636", "0x200D", "0x1F32B"], name: "霾" },
      503: { emoji: "0x1F4A8", name: "扬沙" },
      504: { emoji: "0x1F4A8", name: "浮尘" },
      507: { emoji: "0x1F3DC", name: "沙尘暴" },
      508: { emoji: "0x1F3DC", name: "强沙尘暴" },
      509: { emoji: "0x1F32B", name: "浓雾" },
      510: { emoji: "0x1F32B", name: "强浓雾" },
      511: { emoji: ["0x1F636", "0x200D", "0x1F32B"], name: "中度霾" },
      512: { emoji: ["0x1F636", "0x200D", "0x1F32B"], name: "重度霾" },
      513: { emoji: ["0x1F636", "0x200D", "0x1F32B"], name: "严重霾" },
      514: { emoji: "0x1F32B", name: "大雾" },
      515: { emoji: "0x1F32B", name: "特强浓雾" },
      800: { emoji: "0x1F311", name: "新月" },
      801: { emoji: "0x1F312", name: "蛾眉月" },
      802: { emoji: "0x1F313", name: "上弦月" },
      803: { emoji: "0x1F314", name: "盈凸月" },
      804: { emoji: "0x1F315", name: "满月" },
      805: { emoji: "0x1F316", name: "亏凸月" },
      806: { emoji: "0x1F317", name: "下弦月" },
      807: { emoji: "0x1F318", name: "残月" },
      900: { emoji: "0x1F975", name: "热" },
      901: { emoji: "0x1F976", name: "冷" },
      999: { emoji: "0x2753", name: "未知" },
      9999: { emoji: "0x26A0", name: "预警默认" }
    };
    
    function getWeather(code) {
      return weatherEmojiMap[code] || { emoji: "未知", name: "未知天气" };
    }
    
    Emoji.innerText = String.fromCodePoint(getWeather(data.weather_icon).emoji)
    Temp.innerText = data.temperature + String.fromCodePoint(0x2103)
    Desc.innerText = data.weather + String.fromCodePoint(0x00b7) + data.city
    return data;
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
