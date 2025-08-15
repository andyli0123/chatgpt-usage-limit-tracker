const DEBUG = false;
const QUOTA_DATA_URL = 'https://raw.githubusercontent.com/andyli0123/chatgpt-usage-limit-tracker/main/quota.json';

const CACHE_DURATION_MS = 60 * 60 * 1000; // Cache for 1 hour

function readStoredCache() {
  return new Promise(resolve => {
    chrome.storage.local.get(
      ['cachedQuotaAll', 'lastFetchTimestamp', 'activePlan'],
      items => {
        resolve({
          cachedQuotaAll: items.cachedQuotaAll || null,
          lastFetchTimestamp: items.lastFetchTimestamp || 0,
          activePlan: items.activePlan || 'plus'
        });
      }
    );
  });
}

function writeStoredCache(quotaAll, timestamp) {
  chrome.storage.local.set({
    cachedQuotaAll: quotaAll,
    lastFetchTimestamp: timestamp
  });
}

async function getActivePlan() {
  const { activePlan } = await readStoredCache();
  return activePlan || 'plus';
}

function setActivePlan(plan) {
  return new Promise(resolve => {
    chrome.storage.local.set({ activePlan: plan }, resolve);
  });
}

function normalizeQuotaShape(raw) {
  if (!raw) return { models: [], free: [], plus: [], team: [], pro: [] };
  if (Array.isArray(raw)) {
    return { models: raw, free: [], plus: raw, team: [], pro: [] };
  }
  if (raw.free || raw.plus || raw.team || raw.pro) {
    return {
      models: raw.models && raw.models.length ? raw.models : (raw.plus || []),
      free: raw.free || [],
      plus: raw.plus || raw.models || [],
      team: raw.team || [],
      pro: raw.pro || []
    };
  }
  if (raw.models) {
    return { models: raw.models, free: [], plus: raw.models, team: [], pro: [] };
  }
  return { models: [], free: [], plus: [], team: [], pro: [] };
}

async function fetchQuotaAll() {
  let sourceUrl = DEBUG ? chrome.runtime.getURL('quota.json') : QUOTA_DATA_URL;
  const now = Date.now();
  const { cachedQuotaAll, lastFetchTimestamp } = await readStoredCache();

  if (cachedQuotaAll && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
    return cachedQuotaAll;
  }

  async function loadFrom(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed ${resp.status}`);
    const data = await resp.json();
    return normalizeQuotaShape(data);
  }

  try {
    const normalized = await loadFrom(sourceUrl);
    writeStoredCache(normalized, now);
    return normalized;
  } catch (err) {
    console.error('Remote quota fetch failed:', err, 'Falling back to local quota.json');
    try {
      const fallback = await loadFrom(chrome.runtime.getURL('quota.json'));
      writeStoredCache(fallback, now);
      return fallback;
    } catch (fallbackErr) {
      console.error('CRITICAL: local quota.json failed too', fallbackErr);
      return { models: [], free: [], plus: [], team: [], pro: [] };
    }
  }
}

async function getQuotaForPlan(planOverride = null) {
  const plan = planOverride || await getActivePlan();
  const all = await fetchQuotaAll();
  const map = {
    free: all.free,
    plus: all.plus || all.models,
    team: all.team,
    pro: all.pro
  };
  return map[plan] || all.plus || all.models || [];
}

async function getAllKnownModels() {
  const all = await fetchQuotaAll();
  const buckets = [all.free, all.plus || all.models, all.team, all.pro].filter(Boolean);
  const dedup = new Map();
  for (const list of buckets) {
    (list || []).forEach(m => {
      if (m && m.id && !dedup.has(m.id)) dedup.set(m.id, m);
    });
  }
  return Array.from(dedup.values());
}

async function mapApiModelToId(apiModelSlug) {
  if (!apiModelSlug) return null;
  const known = await getAllKnownModels();

  // 尋找完全匹配的
  const exact = known.find(m => m.id === apiModelSlug);
  if (exact) return exact.id;

  // 尋找包含匹配的，從最長 ID 開始以避免 "4.1" 錯誤匹配 "4.1-mini"
  const sorted = [...known].sort((a, b) => b.id.length - a.id.length);
  for (const m of sorted) {
    const id = m.id;
    // 處理特殊情況，如 '4.5' -> '4-5'
    const alt = id.includes('.') ? id.replace('.', '-') : null;
    if (apiModelSlug.includes(id)) return id;
    if (alt && apiModelSlug.includes(alt)) return id;
  }

  if (apiModelSlug === 'auto') {
    const hasAuto = known.find(m => m.id === 'auto');
    if (hasAuto) return 'auto';
  }

  console.warn(`No matching model found for API slug: ${apiModelSlug}`);
  return null;
}

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.method === "POST" && details.requestBody && details.requestBody.raw) {
      try {
        const bodyStr = new TextDecoder("utf-8").decode(details.requestBody.raw[0].bytes);
        const body = JSON.parse(bodyStr);
        const apiModelSlug = body.model;
        if (!apiModelSlug) return;

        const modelId = await mapApiModelToId(apiModelSlug);
        if (!modelId) return;

        const timestamp = Date.now();

        // 主要 model 計數
        const primaryKey = `timestamps_${modelId}`;
        // 若偵測到 gpt-5，同時也加到 auto（for Free 視覺一致）
        const extraKey = (modelId === 'gpt-5') ? 'timestamps_auto' : null;

        const keys = extraKey ? [primaryKey, extraKey] : [primaryKey];
        chrome.storage.local.get(keys, (result) => {
          const changes = {};
          const primaryArr = result[primaryKey] || [];
          primaryArr.push(timestamp);
          changes[primaryKey] = primaryArr;

          if (extraKey) {
            const extraArr = result[extraKey] || [];
            extraArr.push(timestamp);
            changes[extraKey] = extraArr;
          }

          chrome.storage.local.set(changes, () => {
            if (DEBUG) {
              console.log(`Logged ${primaryKey}${extraKey ? ' & '+extraKey : ''} (slug: ${apiModelSlug})`);
            }
          });
        });
      } catch (e) {
        console.warn("Could not parse request body.", e);
      }
    }
  },
  {
    urls: [
      "*://chatgpt.com/backend-api/conversation",
      "*://chatgpt.com/backend-api/*/conversation"
    ]
  },
  ["requestBody"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.action === "getUsageData") {
      const plan = await getActivePlan();
      const quotaData = await getQuotaForPlan(plan);
      const storageKeys = quotaData.map(m => `timestamps_${m.id}`);

      chrome.storage.local.get(storageKeys, (result) => {
        const now = Date.now();
        const usageData = quotaData.map(model => {
          const timestamps = result[`timestamps_${model.id}`] || [];
          const windowStart = now - (model.hours * 60 * 60 * 1000);
          const used = timestamps.filter(ts => ts >= windowStart).length;
          return {
            id: model.id,
            used,
            quota: model.quota,
            hours: model.hours,
            max: typeof model.max === 'number' ? model.max : undefined
          };
        });
        sendResponse({ data: usageData, plan });
      });
    } else if (request.action === "getActivePlan") {
      const plan = await getActivePlan();
      sendResponse({ plan });
    } else if (request.action === "setActivePlan") {
      await setActivePlan(request.plan);
      sendResponse({ ok: true });
    }
  })();
  return true;
});

async function cleanupOldTimestamps() {
  const allModels = await getAllKnownModels();
  if (!allModels.length) return;

  const storageKeys = allModels.map(m => `timestamps_${m.id}`);
  chrome.storage.local.get(storageKeys, (result) => {
    let changes = {};
    const longest = Math.max(...allModels.map(m => m.hours || 24));
    const cleanupThreshold = Date.now() - (longest * 60 * 60 * 1000 * 1.5);

    for (const key in result) {
      if (Array.isArray(result[key])) {
        changes[key] = result[key].filter(ts => ts >= cleanupThreshold);
      }
    }
    chrome.storage.local.set(changes);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyCleanup", { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyCleanup") {
    cleanupOldTimestamps();
  }
});