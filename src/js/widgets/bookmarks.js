/* ==========================================
   bookmarks.js - 常用书签小组件
   ========================================== */

class BookmarksWidget extends Widget {
    static type = 'bookmarks';
    static displayName = '常用书签';
    static defaultSize = 'md';
    static icon = 'fa-bookmark';

    render() {
        this._addHeaderAddBtn('添加书签');
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="bookmarks-grid"></div>';
        this._renderBookmarks();
    }

    _renderBookmarks() {
        const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
        const grid = this.element.querySelector('.bookmarks-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const size = this.currentSize;
        const cols = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
        const max = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
        const displayed = bookmarks.slice(0, max);
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        displayed.forEach((bm, idx) => {
            const a = document.createElement('a');
            a.href = bm.url;
            a.target = '_blank';
            a.className = 'bookmark-item';
            a.innerHTML = `
                <div class="bookmark-icon"><i class="fa fa-globe"></i></div>
                <span class="bookmark-name">${escapeHtml(bm.name)}</span>
                <button class="bookmark-delete-btn" onclick="event.preventDefault(); event.stopPropagation();"><i class="fa fa-times"></i></button>
            `;
            a.querySelector('.bookmark-delete-btn').addEventListener('click', () => {
                bookmarks.splice(idx, 1);
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
                this._renderBookmarks();
            });
            grid.appendChild(a);
        });
    }

    openManager() {
        const bookmarks = JSON.parse(localStorage.getItem('custom-bookmarks') || '[]');
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理书签';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '';
        bookmarks.forEach((bm, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="text" class="manage-input" value="${escapeHtml(bm.name)}" placeholder="名称">
                <input type="text" class="manage-input" value="${escapeHtml(bm.url)}" placeholder="网址">
                <button class="manage-delete-btn"><i class="fa fa-trash"></i></button>
            `;
            const [nameInput, urlInput] = row.querySelectorAll('.manage-input');
            nameInput.addEventListener('input', () => {
                bm.name = nameInput.value;
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
            });
            urlInput.addEventListener('input', () => {
                bm.url = urlInput.value;
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
            });
            row.querySelector('.manage-delete-btn').addEventListener('click', () => {
                bookmarks.splice(idx, 1);
                localStorage.setItem('custom-bookmarks', JSON.stringify(bookmarks));
                this.openManager();
            });
            container.appendChild(row);
        });
        window.manageModal?.open();
    }
}
