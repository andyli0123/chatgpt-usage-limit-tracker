const DEBUG = false;
const QUOTA_DATA_URL = 'https://raw.githubusercontent.com/andyli0123/chatgpt-usage-limit-tracker/main/quota.json';

const CACHE_DURATION_MS = 60 * 60 * 1000; // Cache for 1 hour

function readStoredCache() {
    return new Promise(resolve => {
        chrome.storage.local.get(['cachedQuotaData', 'lastFetchTimestamp'], items => {
            resolve({
                cachedQuotaData: items.cachedQuotaData || null,
                lastFetchTimestamp: items.lastFetchTimestamp || 0
            });
        });
    });
}

function writeStoredCache(dataModels, timestamp) {
    chrome.storage.local.set({
        cachedQuotaData: dataModels,
        lastFetchTimestamp: timestamp
    });
}

async function getQuotaData() {
  const now = Date.now();
  const { cachedQuotaData: storedData, lastFetchTimestamp: storedTs } = await readStoredCache();
  
    if (storedData && (now - storedTs < CACHE_DURATION_MS)) {
        return storedData;
    }
  
  let sourceUrl;
  if (DEBUG) {
    sourceUrl = chrome.runtime.getURL('quota.json');
  } else {
    sourceUrl = QUOTA_DATA_URL;
  }
  
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch from ${sourceUrl}, status: ${response.status}`);
    }
    const data = await response.json();
    writeStoredCache(data.models, now);
    return data.models;
  } catch (error) {
    console.error(`Error fetching quota data from ${sourceUrl}:`, error, 'Falling back to local file.');
    try {
        const fallbackResponse = await fetch(chrome.runtime.getURL('quota.json'));
        const fallbackData = await fallbackResponse.json();
        writeStoredCache(fallbackData.models, now);
        return fallbackData.models;
    } catch (fallbackError) {
        console.error('CRITICAL: Could not load quota data from local fallback either.', fallbackError);
        return [];
    }
  }
}

async function mapApiModelToId(apiModelSlug) {
    const quotaData = await getQuotaData();
    if (!apiModelSlug || !Array.isArray(quotaData)) return null;

    // 尋找完全匹配的
    const exactMatch = quotaData.find(m => m.id === apiModelSlug);
    if (exactMatch) return exactMatch.id;

    // 尋找包含匹配的，從最長 ID 開始以避免 "4.1" 錯誤匹配 "4.1-mini"
    const sortedQuotaData = [...quotaData].sort((a, b) => b.id.length - a.id.length);
    
    for (const model of sortedQuotaData) {
        const id = model.id;
        // 處理特殊情況，如 '4.5' -> '4-5'
        const alternativeId = id.includes('.') ? id.replace('.', '-') : null;

        if (apiModelSlug.includes(id)) {
            return id;
        }
        if (alternativeId && apiModelSlug.includes(alternativeId)) {
            return id;
        }
    }

    // 特別處理 "auto"，指向 "4o"
    if (apiModelSlug === 'auto') {
        const autoModel = quotaData.find(m => m.id === '4o');
        if (autoModel) return autoModel.id;
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
                
                let apiModelSlug = body.model;
                if (!apiModelSlug) return;

                const modelId = await mapApiModelToId(apiModelSlug);
                if (modelId) {
                    const timestamp = Date.now();
                    const storageKey = `timestamps_${modelId}`;
                    
                    chrome.storage.local.get([storageKey], (result) => {
                        const timestamps = result[storageKey] || [];
                        timestamps.push(timestamp);
                        let dataToSave = {};
                        dataToSave[storageKey] = timestamps;
                        chrome.storage.local.set(dataToSave, () => {
                            console.log(`Message logged for model: ${modelId} (from API slug: ${apiModelSlug})`);
                        });
                    });
                }
            } catch (e) {
                console.warn("Could not parse request body.", e);
            }
        }
    },
    { urls: ["https://chatgpt.com/backend-api/conversation"] },
    ["requestBody"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getUsageData") {
        (async () => {
            const quotaData = await getQuotaData();
            const storageKeys = quotaData.map(m => `timestamps_${m.id}`);
            
            chrome.storage.local.get(storageKeys, (result) => {
                const usageData = quotaData.map(model => {
                    const timestamps = result[`timestamps_${model.id}`] || [];
                    const windowStart = Date.now() - (model.hours * 60 * 60 * 1000); 
                    
                    const used = timestamps.filter(ts => ts >= windowStart).length;
                    
                    return {
                        id: model.id,
                        used: used,
                        quota: model.quota,
                        hours: model.hours
                    };
                });
                sendResponse({ data: usageData });
            });
        })();
        return true; 
    }
});

function cleanupOldTimestamps() {
    console.log("Running daily cleanup of old timestamps...");
    getQuotaData().then(quotaData => {
        const storageKeys = quotaData.map(m => `timestamps_${m.id}`);
        chrome.storage.local.get(storageKeys, (result) => {
            let changes = {};
            const longestPeriodHours = Math.max(...quotaData.map(m => m.hours)); 
            const cleanupThreshold = Date.now() - (longestPeriodHours * 60 * 60 * 1000 * 1.5);

            for (const key in result) {
                if (Array.isArray(result[key])) {
                    changes[key] = result[key].filter(ts => ts >= cleanupThreshold);
                }
            }
            chrome.storage.local.set(changes);
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("dailyCleanup", {
        periodInMinutes: 1440 
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyCleanup") {
        cleanupOldTimestamps();
    }
});