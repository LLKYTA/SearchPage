/* ==========================================
   todo.js - 待办事项小组件
   ========================================== */

class TodoWidget extends Widget {
    static type = 'todo';
    static displayName = '待办事项';
    static defaultSize = 'sm';
    static icon = 'fa-check-square-o';

    render() {
        const content = this.element.querySelector('.widget-content');
        content.innerHTML = '<div class="todo-list"></div>';
        this._loadTodos();
    }

    _loadTodos() {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        const list = this.element.querySelector('.todo-list');
        if (!list) return;
        list.innerHTML = '';
        const max = this.currentSize === 'sm' ? 3 : this.currentSize === 'md' ? 5 : todos.length;
        const displayed = todos.slice(0, max);

        displayed.forEach((todo, idx) => {
            const div = document.createElement('div');
            div.className = 'todo-item' + (todo.completed ? ' completed' : '');
            div.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
            `;
            div.querySelector('.todo-checkbox').addEventListener('change', (e) => {
                this.toggleTodo(idx, e.target.checked);
            });
            list.appendChild(div);
        });
    }

    toggleTodo(index, checked) {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        if (todos[index]) {
            todos[index].completed = checked;
            localStorage.setItem('todos', JSON.stringify(todos));
            this._loadTodos();
        }
    }

    openManager() {
        const todos = JSON.parse(localStorage.getItem('todos') || '[]');
        window.currentManageWidget = this;
        document.getElementById('manage-modal-title').textContent = '管理待办事项';
        const container = document.getElementById('manage-list-container');
        container.innerHTML = '';
        todos.forEach((todo, idx) => {
            const row = document.createElement('div');
            row.className = 'manage-row';
            row.innerHTML = `
                <input type="text" class="manage-input" value="${escapeHtml(todo.text)}" placeholder="待办内容">
                <button class="manage-delete-btn"><i class="fa fa-trash"></i></button>
            `;
            const input = row.querySelector('.manage-input');
            input.addEventListener('input', () => {
                todos[idx].text = input.value;
                localStorage.setItem('todos', JSON.stringify(todos));
            });
            row.querySelector('.manage-delete-btn').addEventListener('click', () => {
                todos.splice(idx, 1);
                localStorage.setItem('todos', JSON.stringify(todos));
                this.openManager();
            });
            container.appendChild(row);
        });
        window.manageModal?.open();
    }
}
