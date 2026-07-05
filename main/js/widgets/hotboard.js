/* ==========================================
   hotboard.js - 多源实时热榜小组件
   ========================================== */

class HotboardWidget extends Widget {
    static type = 'hotboard';
    static displayName = '热榜';
    static defaultSize = 'md';
    static icon = 'fa-fire';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="hotboard-meta">
                <span class="hotboard-source-tag">加载中</span>
                <span class="hotboard-time"></span>
            </div>
            <div class="hotboard-list"></div>
        `;
        this.loadHotboard();
    }

    async loadHotboard() {
        const source = localStorage.getItem('hotboard-source') || 'weibo';
        const sourceInfo = {
            weibo: '微博热搜', zhihu: '知乎热榜', bilibili: 'B站热门', baidu: '百度热搜',
            douyin: '抖音热榜', toutiao: '今日头条', '36kr': '36氪', hupu: '虎扑'
        };
        this.element.querySelector('.hotboard-source-tag').textContent = sourceInfo[source] || source;
        if (typeof GetHotboard !== 'function') return;
        const data = await GetHotboard(source);
        if (!data || !data.list || !this.element) return;
        const listEl = this.element.querySelector('.hotboard-list');
        listEl.innerHTML = '';
        const size = this.currentSize;
        const max = size === 'sm' ? 5 : size === 'md' ? 10 : 15;
        const displayed = data.list.slice(0, max);

        displayed.forEach((item, idx) => {
            const a = document.createElement('a');
            a.href = item.url || '#';
            a.target = '_blank';
            a.className = 'hotboard-item';
            let hotValue = '';
            if (item.hot_value) {
                const hot = parseInt(item.hot_value);
                hotValue = hot >= 10000 ? (hot / 10000).toFixed(1) + '万' : hot.toString();
            }
            a.innerHTML = `
                <div class="hotboard-rank">${idx+1}</div>
                <span class="hotboard-title">${escapeHtml(item.title)}</span>
                ${hotValue && size !== 'sm' ? `<span class="hotboard-hot"><i class="fa fa-fire"></i>${hotValue}</span>` : ''}
            `;
            listEl.appendChild(a);
        });
    }

    onUpdate() { this.loadHotboard(); }
}
