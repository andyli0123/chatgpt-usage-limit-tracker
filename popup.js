document.addEventListener('DOMContentLoaded', function() {
    const panel = document.getElementById('cqt-panel');

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

        if (lang.startsWith("en") && value === 1) {
            return `${prefix} ${unit}`;
        }
        return `${prefix} ${value} ${unit}`;
    }

    function updateStatus(message, isError = false) {
        panel.textContent = '';
        const statusDiv = document.createElement('div');
        statusDiv.className = isError ? 'cqt-error' : 'cqt-loader';
        statusDiv.textContent = message;
        panel.appendChild(statusDiv);
    }

    function updatePanelContent() {
        chrome.runtime.sendMessage({ action: 'getUsageData' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Popup Error:", chrome.runtime.lastError.message);
                updateStatus("Error.", true);
                return;
            }

            if (response && response.data) {
                panel.textContent = '';

                response.data.forEach(model => {
                    const row = document.createElement('div');
                    row.className = 'cqt-model-row';

                    // Model info container
                    const info = document.createElement('div');
                    info.className = 'cqt-model-info';

                    // Name + period group
                    const nameGroup = document.createElement('div');
                    nameGroup.className = 'cqt-model-name-group';

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'cqt-model-name';
                    nameSpan.textContent = model.id;
                    nameGroup.appendChild(nameSpan);

                    const periodSpan = document.createElement('span');
                    periodSpan.className = 'cqt-model-period';
                    periodSpan.textContent = formatPeriod(model.hours);
                    nameGroup.appendChild(periodSpan);

                    info.appendChild(nameGroup);

                    // Usage text
                    const usageSpan = document.createElement('span');
                    usageSpan.className = 'cqt-model-usage';
                    usageSpan.textContent = `${model.used} / ${model.quota > 0 ? model.quota : '∞'}`;
                    info.appendChild(usageSpan);

                    row.appendChild(info);

                    // Progress bar container
                    const barContainer = document.createElement('div');
                    barContainer.className = 'cqt-progress-bar-container';

                    const percentage = model.quota > 0 ? (model.used / model.quota) * 100 : 0;
                    const progressBar = document.createElement('div');
                    progressBar.className = 'cqt-progress-bar';
                    progressBar.style.width = `${percentage}%`;

                    barContainer.appendChild(progressBar);
                    row.appendChild(barContainer);

                    panel.appendChild(row);
                });
            } else {
                updateStatus("Error.", true);
            }
        });
    }

    updatePanelContent();
});
