/* ==========================================
   version.js - 版本号控制模块
   集中管理应用版本、构建信息，供各模块引用
   ========================================== */

const APP_VERSION = {
    // ==================== 版本信息 ====================
    major: 0,
    minor: 9,
    patch: 0,

    // 构建元信息（自动填充，手动更新时同步修改）
    buildDate: '2026-07-12',
    build: '20260712',

    // 应用标识
    name: 'KD起始页',
    description: 'iOS 18 风格浏览器起始页',
    license: 'MIT',
    author: 'KD',

    // ==================== 派生属性 ====================

    /** 完整版本号字符串，如 "0.9.0" */
    get versionString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    },

    /** 带前缀的版本显示，如 "v0.9.0" */
    get displayVersion() {
        return `v${this.versionString}`;
    },

    /** 完整标题行，如 "KD起始页 v0.9.0" */
    get fullTitle() {
        return `${this.name} ${this.displayVersion}`;
    },

    /** 版权信息 */
    get copyright() {
        const year = this.buildDate.split('-')[0] || '2026';
        return `©${year} ${this.name}`;
    },

    /** 多行关于文本（供 about 弹窗直接使用） */
    get aboutText() {
        return [
            `${this.description}`,
            `小组件框架 · 拖拽排序 · 多引擎搜索`,
            `Spring 动画 · 深色模式 · 热榜聚合`,
            `可扩展 · 响应式布局 · 数据本地存储`
        ].join('<br>');
    },

    // ==================== 方法 ====================

    /** 构建完整关于 HTML 片段 */
    getAboutHTML() {
        return `
            <div class="logo-icon about-logo">KD</div>
            <h4 class="about-name">${this.name}</h4>
            <p class="about-version">${this.displayVersion}</p>
            <p class="about-info">${this.aboutText}</p>
            <p class="about-license">本软件为开源项目，遵循 ${this.license} 协议</p>
            <div class="about-footer">
                Made with ❤️ by ${this.author}<br>
                ${this.copyright}
            </div>
        `;
    },

    /** 检查是否为新版本（按 semver 比较） */
    isNewerThan(major, minor, patch) {
        if (this.major !== major) return this.major > major;
        if (this.minor !== minor) return this.minor > minor;
        return this.patch > patch;
    },

    /** 比较版本号：-1 / 0 / 1 */
    compareTo(major, minor, patch) {
        if (this.major !== major) return this.major > major ? 1 : -1;
        if (this.minor !== minor) return this.minor > minor ? 1 : -1;
        if (this.patch !== patch) return this.patch > patch ? 1 : -1;
        return 0;
    },

    /** 序列化为纯对象（用于存储/日志） */
    toJSON() {
        return {
            version: this.versionString,
            buildDate: this.buildDate,
            build: this.build,
            name: this.name
        };
    },

    /** 打印到控制台 */
    log() {
        console.log(`[${this.name}] ${this.displayVersion} (build ${this.build})`);
    }
};

// 自动输出版本到控制台（方便调试）
if (typeof console !== 'undefined') {
    APP_VERSION.log();
}
