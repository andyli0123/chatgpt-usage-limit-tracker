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
        panel.innerHTML = `<div class="${isError ? 'cqt-error' : 'cqt-loader'}">${message}</div>`;
    }

    function updatePanelContent() {
        chrome.runtime.sendMessage({ action: 'getUsageData' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Popup Error:", chrome.runtime.lastError.message);
                updateStatus("Error.", true);
                return;
            }

            if (response && response.data) {
                let content = '';

                response.data.forEach(model => {
                    const percentage = model.quota > 0 ? (model.used / model.quota) * 100 : 0;
                    content += `
                        <div class="cqt-model-row">
                            <div class="cqt-model-info">
                                <div class="cqt-model-name-group">
                                    <span class="cqt-model-name">${model.id}</span>
                                    <span class="cqt-model-period">${formatPeriod(model.hours)}</span>
                                </div>
                                <span class="cqt-model-usage">${model.used} / ${model.quota > 0 ? model.quota : '∞'}</span>
                            </div>
                            <div class="cqt-progress-bar-container">
                                <div class="cqt-progress-bar" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    `;
                });

                panel.innerHTML = content;
            } else {
                updateStatus("Error.", true);
            }
        });
    }

    updatePanelContent();
});
