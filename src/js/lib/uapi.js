/* ==========================================
   uapi.js - 天气 & 热榜 & 网站元数据获取
   含失败缓存，避免重复请求失败的URL
   ========================================== */

let client;
let uapiReady = false;
let uapiReadyPromise = null;

// ----- 失败缓存（避免重复请求失败的URL） -----
const FAILURE_CACHE = {
  // 存储结构：{ "https://example.com": timestamp }
  map: new Map(),
  // 缓存有效期（毫秒），默认 5 分钟
  TTL: 5 * 60 * 1000,
  
  // 检查是否在缓存中（且未过期）
  has(url) {
    const timestamp = this.map.get(url);
    if (!timestamp) return false;
    if (Date.now() - timestamp > this.TTL) {
      this.map.delete(url);
      return false;
    }
    return true;
  },
  
  // 记录失败
  set(url) {
    this.map.set(url, Date.now());
  },
  
  // 清除某个 URL 的失败记录（用于手动重试）
  clear(url) {
    this.map.delete(url);
  },
  
  // 清除所有失败记录
  clearAll() {
    this.map.clear();
  }
};

// ----- UAPI SDK 加载 -----
async function UapiPreLoad() {
  if (uapiReadyPromise) return uapiReadyPromise;
  
  uapiReadyPromise = (async () => {
    try {
      let { UapiClient } = await import('https://cdn.jsdelivr.net/npm/uapi-browser-sdk@latest/dist/index.js')
      client = new UapiClient('https://uapis.cn');
      uapiReady = true;
      console.log("UapiPreLoad success");
      return true;
    } catch (err) {
      console.error("UAPI SDK 加载失败:", err);
      return false;
    }
  })();
  
  return uapiReadyPromise;
}

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
    extended: true,
    forecast: false,
    hourly: false,
    minutely: false,
    indices: false,
    lang: "zh",
  };
  
  try {
    const data = await client.misc.getMiscWeather(payload);
    return data;
  } catch (err) {
    console.error("获取天气失败:", err);
    return null;
  }
}

/* ========== 热榜功能 ========== */
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

/* ========== 网站元数据 / Favicon 获取（含失败缓存） ========== */
async function GetWebsiteMetadata(url) {
  // 1. 检查失败缓存
  if (FAILURE_CACHE.has(url)) {
    console.log(`⏭️ 跳过失败的 URL: ${url} (缓存中)`);
    return null;
  }
  
  // 2. 检查 URL 是否有效
  if (!url || !url.startsWith('http')) {
    FAILURE_CACHE.set(url);
    return null;
  }
  
  try {
    const apiUrl = `https://uapis.cn/api/v1/webparse/metadata?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.warn(`UAPI 请求失败 (${response.status}): ${url}`);
      // 记录失败到缓存
      FAILURE_CACHE.set(url);
      return null;
    }
    
    const data = await response.json();
    
    // 如果返回数据中没有有效的图标信息，也视为失败
    if (!data || !data.favicon) {
      console.warn(`未找到图标: ${url}`);
      FAILURE_CACHE.set(url);
      return null;
    }
    
    // 成功获取，清除失败记录（如果有）
    FAILURE_CACHE.clear(url);
    return data;
    
  } catch (err) {
    console.warn("获取网站元数据失败:", url, err);
    // 网络错误等也记录失败
    FAILURE_CACHE.set(url);
    return null;
  }
}

/* ========== 手动重试（暴露给全局，用于调试或用户主动刷新） ========== */
function retryFailedFavicon(url) {
  FAILURE_CACHE.clear(url);
  console.log(`🔄 已清除失败缓存，可重试: ${url}`);
  // 触发所有小组件重新渲染（可选）
  // 如果有小组件使用了 GetWebsiteMetadata，它们会在下次 render 时重试
}
/* ========== 每日单词功能 ========== */
/**
 * 获取每日单词
 * @param {string} category - 词库: all/cet4/cet6/ielts/toefl/gre
 * @param {number} count - 返回数量 1-20
 * @returns {Promise<Object|null>} 单词数据
 */
async function GetDailyWord(category = 'all', count = 1) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const url = `https://uapis.cn/api/v1/daily/word?lang=en&category=${category}&count=${count}&date=${today}&example=true&phonetic=true&define=false`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`每日单词 API 请求失败 (${response.status})`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("获取每日单词失败:", err);
    return null;
  }
}
// 暴露到全局，方便调试
window.retryFailedFavicon = retryFailedFavicon;
window.clearFaviconCache = FAILURE_CACHE.clearAll.bind(FAILURE_CACHE);

// ----- 初始化 -----
window.addEventListener('load', async () => {
  await UapiPreLoad();
  await GetWeather();
  if (typeof onUapiReady === 'function') {
    onUapiReady();
  }
});