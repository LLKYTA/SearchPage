/* ==========================================
   time-progress.js - 时间进度条小组件
   ========================================== */

class TimeProgressWidget extends Widget {
    static type = 'time-progress';
    static displayName = '时间进度条';
    static defaultSize = 'sm';
    static icon = 'fa-hourglass-half';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '';
        this.updateProgress();
        if (this.todayTimer) clearInterval(this.todayTimer);
        if (this.otherTimer) clearInterval(this.otherTimer);
        this.todayTimer = setInterval(() => this.updateTodayProgress(), 1000);
        this.otherTimer = setInterval(() => this.updateWeekYearProgress(), 60000);
    }

    updateProgress() {
        this.updateTodayProgress();
        this.updateWeekYearProgress();
    }

    updateTodayProgress() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const elapsed = (now - startOfDay) / 1000;
        const total = 24 * 60 * 60;
        const percent = Math.min(100, Math.floor((elapsed / total) * 100));
        this.setProgress('today', percent);
    }

    updateWeekYearProgress() {
        const now = new Date();
        const dayOfWeek = now.getDay() || 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0,0,0,0);
        const weekElapsed = (now - startOfWeek) / 1000;
        const weekTotal = 7 * 24 * 60 * 60;
        const weekPercent = Math.min(100, Math.floor((weekElapsed / weekTotal) * 100));
        this.setProgress('week', weekPercent);

        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const yearElapsed = (now - startOfYear) / 1000;
        const isLeap = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
        const yearTotal = (isLeap ? 366 : 365) * 24 * 60 * 60;
        const yearPercent = Math.min(100, Math.floor((yearElapsed / yearTotal) * 100));
        this.setProgress('year', yearPercent);
    }

    setProgress(type, percent) {
        const content = this.element.querySelector('.widget-content');
        if (!content) return;

        let types = [];
        if (this.currentSize === 'sm') {
            types = ['today'];
        } else if (this.currentSize === 'md') {
            types = ['today', 'week'];
        } else {
            types = ['today', 'week', 'year'];
        }

        if (!content.dataset.initialized || content.dataset.size !== this.currentSize) {
            content.innerHTML = '';
            types.forEach(t => {
                const item = document.createElement('div');
                item.className = 'progress-item';
                item.innerHTML = `
                    <div class="progress-label">
                        <span>${t === 'today' ? '今日' : t === 'week' ? '本周' : '今年'}</span>
                        <span class="progress-percent" id="${t}-percent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${t}-fill" id="${t}-fill" style="width: 0%"></div>
                    </div>
                `;
                content.appendChild(item);
            });
            content.dataset.initialized = 'true';
            content.dataset.size = this.currentSize;
        }

        const percentEl = content.querySelector(`#${type}-percent`);
        const fillEl = content.querySelector(`#${type}-fill`);
        if (percentEl) percentEl.textContent = percent + '%';
        if (fillEl) fillEl.style.width = percent + '%';
    }

    destroy() {
        clearInterval(this.todayTimer);
        clearInterval(this.otherTimer);
        super.destroy();
    }
}
