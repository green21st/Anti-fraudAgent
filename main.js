import App from './App.vue'
import { createSSRApp } from 'vue'

// 主题全局混入：每个页面自动获得 isDark 状态与 toggleTheme 方法
const themeMixin = {
	data() {
		return {
			isDark: false
		}
	},
	onShow() {
		this.isDark = uni.getStorageSync('app_theme') === 'dark'
	},
	onLoad() {
		this.isDark = uni.getStorageSync('app_theme') === 'dark'
		this._themeHandler = () => {
			this.isDark = uni.getStorageSync('app_theme') === 'dark'
		}
		uni.$on('theme-changed', this._themeHandler)
	},
	onUnload() {
		if (this._themeHandler) {
			uni.$off('theme-changed', this._themeHandler)
		}
	},
	methods: {
		toggleTheme() {
			const next = this.isDark ? 'light' : 'dark'
			uni.setStorageSync('app_theme', next)
			this.isDark = next === 'dark'
			uni.$emit('theme-changed')
		}
	}
}

export function createApp() {
	const app = createSSRApp(App)
	app.mixin(themeMixin)
	return {
		app
	}
}
