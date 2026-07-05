/* ==========================================
   daily-word.js - 每日单词小组件
   ========================================== */

class DailyWordWidget extends Widget {
    static type = 'daily-word';
    static displayName = '每日单词';
    static defaultSize = 'sm';
    static icon = 'fa-book';
    static maxPerArea = 1;

    constructor(container, index) {
        super(container, index);
        this.data = null;
        this.isLoading = false;
    }

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `<div class="dailyword-loading"><i class="fa fa-spinner fa-spin"></i> 加载中...</div>`;
        this.fetchWord();
    }

    onResize(newSize) {
        if (this.data) {
            this._renderBySize(newSize);
        } else {
            this.render();
        }
    }

    async fetchWord() {
        if (this.isLoading) return;
        this.isLoading = true;
        const category = localStorage.getItem('dailyword-category') || 'all';
        const data = await GetDailyWord(category);
        this.isLoading = false;

        if (!data || !data.words || data.words.length === 0) {
            this._renderError();
            return;
        }
        this.data = data.words[0];
        this._renderBySize(this.currentSize);
    }

    _renderError() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = `
            <div class="dailyword-error" style="text-align:center;color:var(--text-secondary);padding:16px;cursor:pointer;">
                <i class="fa fa-refresh" style="display:block;font-size:20px;margin-bottom:6px;"></i>
                点击重试
            </div>
        `;
        content.querySelector('.dailyword-error')?.addEventListener('click', () => this.fetchWord());
    }

    _renderBySize(size) {
        if (!this.data) return;
        const content = this.element.querySelector('.widget-content');
        const word = this.data;
        const phonetic = word.phonetic || '';
        const definition = word.definition || '';
        const examples = word.examples || [];

        if (size === 'sm') {
            content.innerHTML = `
                <div class="dailyword-sm">
                    <div class="dailyword-word">${escapeHtml(word.word)}</div>
                    <div class="dailyword-def">${escapeHtml(definition)}</div>
                </div>
            `;
        } else if (size === 'md') {
            content.innerHTML = `
                <div class="dailyword-md">
                    <div class="dailyword-word">${escapeHtml(word.word)}</div>
                    <div class="dailyword-phonetic">${escapeHtml(phonetic)}</div>
                    <div class="dailyword-def">${escapeHtml(definition)}</div>
                    ${examples.length > 0 ? `<div class="dailyword-example">“${escapeHtml(examples[0].text)}”</div>` : ''}
                </div>
            `;
        } else {
            let examplesHtml = '';
            if (examples.length > 0) {
                examplesHtml = examples.map(ex => `
                    <div class="dailyword-example-item">
                        <div class="dailyword-example-text">“${escapeHtml(ex.text)}”</div>
                        ${ex.translation ? `<div class="dailyword-example-trans">${escapeHtml(ex.translation)}</div>` : ''}
                    </div>
                `).join('');
            }
            content.innerHTML = `
                <div class="dailyword-lg">
                    <div class="dailyword-word">${escapeHtml(word.word)}</div>
                    <div class="dailyword-phonetic">${escapeHtml(phonetic)}</div>
                    <div class="dailyword-def">${escapeHtml(definition)}</div>
                    ${examplesHtml ? `<div class="dailyword-examples">${examplesHtml}</div>` : ''}
                    <div class="dailyword-source" style="font-size:11px;color:var(--text-tertiary);margin-top:10px;text-align:right;">
                        词库: ${localStorage.getItem('dailyword-category') || 'all'}
                    </div>
                </div>
            `;
        }
    }

    onUpdate() {
        this.fetchWord();
    }
}
