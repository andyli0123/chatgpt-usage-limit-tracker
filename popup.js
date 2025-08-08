document.addEventListener('DOMContentLoaded', async function () {
  const list = document.getElementById('cqt-list');
  const loader = document.getElementById('cqt-loader');
  const seg = document.querySelector('.cqt-segment');
  const segBtns = Array.from(document.querySelectorAll('.cqt-seg-btn'));

  // i18n button labels
  const labels = {
    free: chrome.i18n.getMessage('plan_free') || 'Free',
    plus: chrome.i18n.getMessage('plan_plus') || 'Plus',
    team: chrome.i18n.getMessage('plan_team') || 'Team',
    pro: chrome.i18n.getMessage('plan_pro') || 'Pro'
  };
  segBtns.forEach(btn => { btn.textContent = labels[btn.dataset.plan]; });
  loader.textContent = chrome.i18n.getMessage('loading') || 'Loading…';

  let currentPlan = 'plus';

  function formatPeriod(hours) {
    const prefix = chrome.i18n.getMessage("period_prefix");
    const lang = chrome.i18n.getUILanguage();
    let value, unit;

    if (hours >= 168) {
      value = Math.round(hours / 168);
      unit = chrome.i18n.getMessage(value > 1 ? "period_weeks" : "period_week");
    } else if (hours >= 24) {
      value = Math.round(hours / 24);
      unit = chrome.i18n.getMessage(value > 1 ? "period_days" : "period_day");
    } else {
      value = hours;
      unit = chrome.i18n.getMessage(value > 1 ? "period_hours" : "period_hour");
    }

    if (lang && lang.startsWith("en") && value === 1) {
      return `${prefix} ${unit}`;
    }
    return `${prefix} ${value} ${unit}`;
  }

  function setActiveButton(plan) {
    segBtns.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.plan === plan);
      btn.setAttribute('aria-selected', btn.dataset.plan === plan ? 'true' : 'false');
    });
  }

  function renderRows(data, plan) {
    list.textContent = '';
    data.forEach(model => {
      const row = document.createElement('div');
      row.className = 'cqt-model-row';

      const info = document.createElement('div');
      info.className = 'cqt-model-info';

      const nameGroup = document.createElement('div');
      nameGroup.className = 'cqt-model-name-group';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'cqt-model-name';
      // Free 方案：auto 顯示為 gpt-5
      const displayName = (plan === 'free' && model.id === 'auto') ? 'gpt-5' : model.id;
      nameSpan.textContent = displayName;
      nameGroup.appendChild(nameSpan);

      // 無上限則不顯示期間灰塊
      if (model.quota > 0) {
        const periodSpan = document.createElement('span');
        periodSpan.className = 'cqt-model-period';
        periodSpan.textContent = formatPeriod(model.hours);
        nameGroup.appendChild(periodSpan);
      }

      info.appendChild(nameGroup);

      const usageSpan = document.createElement('span');
      usageSpan.className = 'cqt-model-usage';
      usageSpan.textContent = `${model.used} / ${model.quota > 0 ? model.quota : '∞'}`;
      info.appendChild(usageSpan);

      row.appendChild(info);

      const barContainer = document.createElement('div');
      barContainer.className = 'cqt-progress-bar-container';

      // 視覺：無上限以 200 為最大值
      const denom = model.quota > 0 ? model.quota : 200;
      const percentage = Math.max(0, Math.min(100, (denom ? (model.used / denom) * 100 : 0)));

      const progressBar = document.createElement('div');
      progressBar.className = 'cqt-progress-bar';
      progressBar.style.width = `${percentage}%`;

      barContainer.appendChild(progressBar);
      row.appendChild(barContainer);

      list.appendChild(row);
    });
  }

  function refresh() {
    list.textContent = '';
    list.appendChild(loader);
    chrome.runtime.sendMessage({ action: 'getUsageData' }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        list.textContent = '';
        const err = document.createElement('div');
        err.className = 'cqt-error';
        err.textContent = chrome.i18n.getMessage('error') || 'Error.';
        list.appendChild(err);
        return;
      }
      currentPlan = resp.plan || 'plus';
      setActiveButton(currentPlan);
      renderRows(resp.data, currentPlan);
    });
  }

  // init
  chrome.runtime.sendMessage({ action: 'getActivePlan' }, (resp) => {
    currentPlan = (resp && resp.plan) || 'plus';
    setActiveButton(currentPlan);
    refresh();
  });

  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('.cqt-seg-btn');
    if (!btn) return;
    const plan = btn.dataset.plan;
    chrome.runtime.sendMessage({ action: 'setActivePlan', plan }, () => {
      currentPlan = plan;
      setActiveButton(currentPlan);
      refresh();
    });
  });
});
