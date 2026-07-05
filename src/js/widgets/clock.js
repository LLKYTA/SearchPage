/* ==========================================
   clock.js - 实时数字时钟小组件
   ========================================== */

class ClockWidget extends Widget {
    static type = 'clock';
    static displayName = '时间';
    static defaultSize = 'sm';
    static icon = 'fa-clock-o';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="time-display">00:00</div>
            <div class="date-display">----年--月--日 星期-</div>
        `;
        if (this.timer) clearInterval(this.timer);
        this._update();
        this.timer = setInterval(() => this._update(), 1000);
    }

    _update() {
        if (!this.element) return;
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        this.element.querySelector('.time-display').textContent = `${h}:${m}`;
        const weeks = ['周日','周一','周二','周三','周四','周五','周六'];
        const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${weeks[now.getDay()]}`;
        this.element.querySelector('.date-display').textContent = dateStr;
    }

    destroy() {
        clearInterval(this.timer);
        super.destroy();
    }
}
