<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<nav-bar title="我的" :back="false" :dark="isDark" @toggle="toggleTheme" />

		<view class="pf-body">
			<!-- 编辑画像模式 -->
			<view v-if="editMode" class="edit-wrap">
				<view class="card">
					<text class="sec">完善个人画像</text>
					<text class="muted edit-tip">画像仅用于个性化训练剧本，数据保存在本地，不会上传。可跳过。</text>
					<view class="form-list">
						<view v-for="k in PROFILE_KEYS" :key="k.key" class="form-row">
							<text class="form-icon">{{ k.icon }}</text>
							<text class="form-label">{{ k.label }}</text>
							<view class="form-main">
								<input
									class="form-input"
									v-model="profile[k.key]"
									:placeholder="k.placeholder || ('请输入' + k.label)"
									maxlength="30"
								/>
								<text v-if="k.tip" class="muted form-tip">{{ k.tip }}</text>
							</view>
						</view>
					</view>
				</view>

				<view class="edit-actions">
					<button class="btn btn-primary" hover-class="press" @tap="saveAll">保存画像</button>
					<button v-if="firstTime" class="btn btn-ghost" hover-class="press" @tap="skip">跳过，稍后再填</button>
				</view>
			</view>

			<!-- 正常模式 -->
			<template v-else>
				<!-- 用户卡片 -->
				<view class="card user-card">
					<view class="avatar-circle avatar--big">
						<text>🧑</text>
					</view>
					<view class="user-info">
						<text class="user-name">{{ userName || '游客' }}</text>
						<text class="muted user-sub">{{ userGuest ? '游客模式 · 数据本地保存' : '已登录 · 数据本地保存' }}</text>
					</view>
					<text class="user-edit" @tap="editNickname">编辑</text>
				</view>

				<!-- 游客模式：登录引导 -->
				<view v-if="userGuest" class="card login-card">
					<text class="login-title">👤 当前为游客模式</text>
					<text class="muted login-tip">登录后可保存训练记录与个人画像，换设备也能找回训练进度。</text>
					<button class="btn btn-primary login-btn" hover-class="press" @tap="goLogin">立即登录 / 注册</button>
				</view>

				<!-- 外观设置 -->
				<view class="card">
					<text class="sec">外观设置</text>
					<view class="theme-switch">
						<view
							class="theme-opt"
							:class="{ 'theme-opt--on': !isDark }"
							hover-class="press"
							@tap="setTheme(false)"
						>
							<text class="theme-opt-text" :class="{ 'theme-opt-text--on': !isDark }">☀️ 浅色模式</text>
						</view>
						<view
							class="theme-opt"
							:class="{ 'theme-opt--on': isDark }"
							hover-class="press"
							@tap="setTheme(true)"
						>
							<text class="theme-opt-text" :class="{ 'theme-opt-text--on': isDark }">🌙 深色紫</text>
						</view>
					</view>
				</view>

				<!-- 训练数据（真实统计） -->
				<view class="card">
					<text class="sec">训练数据</text>
					<view class="stat-row">
						<view class="stat-item">
							<text class="stat-num" style="color: var(--accent)">{{ stats.total }}</text>
							<text class="muted stat-label">训练场次</text>
						</view>
						<view class="stat-item">
							<text class="stat-num" style="color: var(--warn)">{{ stats.avg }}</text>
							<text class="muted stat-label">平均分</text>
						</view>
						<view class="stat-item">
							<text class="stat-num" style="color: var(--ok)">{{ stats.cracked }}</text>
							<text class="muted stat-label">识破骗局</text>
						</view>
					</view>
				</view>

				<!-- 个人画像（6 类字段，逐个可编辑） -->
				<view class="card">
					<view class="sec-row">
						<text class="sec">个人画像</text>
						<text class="muted field-hint">点击字段可修改</text>
					</view>
					<view class="field-grid">
						<view
							v-for="f in fields"
							:key="f.key"
							class="field-item"
							hover-class="press"
							@tap="editField(f)"
						>
							<text class="field-icon">{{ f.icon }}</text>
							<text class="muted field-label">{{ f.label }}</text>
							<text class="field-value" :class="{ 'field-value--empty': !f.value }">{{ f.value || '未填写' }}</text>
						</view>
					</view>
				</view>

				<!-- 对话引擎（大模型接入） -->
				<view class="card">
					<view class="sec-row">
						<text class="sec">对话引擎</text>
						<text class="muted field-hint">{{ llmOn ? '已接入 DeepSeek' : '内置离线引擎' }}</text>
					</view>
					<text class="muted engine-tip">{{ llmOn ? '当前由大模型结合你的个人画像生成对话，网络异常时自动回落到离线引擎。' : '当前使用内置离线话术引擎，开箱即用。填写 DeepSeek API Key 后，对话会更真实、更贴合你的画像。' }}</text>
					<view class="engine-actions">
						<view class="engine-btn" hover-class="press" @tap="setApiKey">
							<text class="engine-btn-text">{{ llmOn ? '更换 API Key' : '接入大模型' }}</text>
						</view>
						<view v-if="llmOn" class="engine-btn engine-btn--ghost" hover-class="press" @tap="removeApiKey">
							<text class="engine-btn-text engine-btn-text--ghost">清除配置</text>
						</view>
					</view>
					<text class="muted engine-note">API Key 仅保存在本机，不会上传；未配置时不影响正常训练。</text>
				</view>

				<!-- 合规提示 -->
				<view class="card compliance-card">
					<text class="compliance-title">⚖️ 合规提示</text>
					<text class="muted compliance-text">本应用所有"骗子"均为 AI 模拟角色，训练内容仅用于反诈教育，不收集任何真实个人信息；请勿将演练话术用于任何违法用途。如遇真实诈骗请立即拨打 96110。</text>
				</view>

				<!-- 其他 -->
				<view class="card link-card" hover-class="press" @tap="showAbout">
					<text class="link-text">关于智盾反诈</text>
					<text class="muted">v1.0.0 ›</text>
				</view>
				<view v-if="!userGuest" class="card link-card" hover-class="press" @tap="logout">
					<text class="link-text link-text--danger">退出登录</text>
					<text class="muted">›</text>
				</view>
			</template>
		</view>

		<view class="pf-tab-space"></view>
		<tab-bar active="profile" />
	</view>
</template>

<script>
	import {
		currentUser,
		getProfile,
		saveProfile,
		PROFILE_KEYS,
		getStats,
		rename,
		logout as logoutUser
	} from '@/utils/user.js'
	import { getLLMConfig, saveLLMConfig, clearLLMConfig, hasLLM } from '@/utils/llm.js'

	export default {
		data() {
			return {
				PROFILE_KEYS,
				editMode: false,
				firstTime: false,
				userName: '',
				userGuest: true,
				profile: {},
				stats: { total: 0, avg: 0, cracked: 0 },
				fields: [],
				llmOn: false
			}
		},
		onLoad(opt) {
			this.editMode = !!(opt && opt.edit === '1')
			this.firstTime = !!(opt && opt.first === '1')
		},
		onShow() {
			this.refresh()
		},
		methods: {
			refresh() {
				const u = currentUser()
				if (u) {
					this.userName = u.name
					this.userGuest = !!u.guest
				} else {
					this.userName = ''
					this.userGuest = true
				}
				const p = getProfile()
				this.profile = { ...p }
				this.fields = PROFILE_KEYS.map(k => ({
					...k,
					value: (p[k.key] || '').trim()
				}))
				this.stats = getStats()
				this.llmOn = hasLLM()
			},
			goLogin() {
				uni.reLaunch({ url: '/pages/login/login' })
			},
			setApiKey() {
				const cfg = getLLMConfig()
				uni.showModal({
					title: '接入 DeepSeek 大模型',
					editable: true,
					placeholderText: '粘贴 API Key（sk- 开头）',
					content: cfg.apiKey || '',
					success: (res) => {
						if (!res.confirm) return
						const key = (res.content || '').trim()
						if (!key) {
							uni.showToast({ title: 'API Key 不能为空', icon: 'none' })
							return
						}
						if (!/^sk-[A-Za-z0-9_-]{10,}$/.test(key)) {
							uni.showToast({ title: '格式不对，应以 sk- 开头', icon: 'none' })
							return
						}
						saveLLMConfig({ ...cfg, apiKey: key })
						this.llmOn = true
						uni.showToast({ title: '已接入大模型', icon: 'success' })
					}
				})
			},
			removeApiKey() {
				uni.showModal({
					title: '清除大模型配置',
					content: '清除后将使用内置离线引擎，确定继续吗？',
					success: (res) => {
						if (!res.confirm) return
						clearLLMConfig()
						this.llmOn = false
						uni.showToast({ title: '已切回离线引擎', icon: 'none' })
					}
				})
			},
			setTheme(dark) {
				if (this.isDark !== dark) {
					this.toggleTheme()
				}
			},
			editNickname() {
				uni.showModal({
					title: '修改昵称',
					editable: true,
					placeholderText: '请输入新昵称',
					content: this.userName,
					success: (res) => {
						if (res.confirm) {
							const r = rename(res.content)
							if (r.ok) {
								uni.showToast({ title: '昵称已更新', icon: 'success' })
								this.refresh()
							} else {
								uni.showToast({ title: r.msg, icon: 'none' })
							}
						}
					}
				})
			},
			editField(f) {
				uni.showModal({
					title: '修改' + f.label,
					editable: true,
					placeholderText: f.placeholder || ('请输入' + f.label),
					content: f.value || '',
					success: (res) => {
						if (res.confirm) {
							const p = { ...this.profile }
							p[f.key] = (res.content || '').trim()
							saveProfile(p)
							uni.showToast({ title: '已保存', icon: 'success' })
							this.refresh()
						}
					}
				})
			},
			saveAll() {
				const p = {}
				PROFILE_KEYS.forEach(k => {
					p[k.key] = ((this.profile[k.key] || '') + '').trim()
				})
				saveProfile(p)
				uni.showToast({ title: '画像已保存', icon: 'success' })
				setTimeout(() => {
					uni.reLaunch({ url: '/pages/home/home' })
				}, 600)
			},
			skip() {
				uni.reLaunch({ url: '/pages/home/home' })
			},
			showAbout() {
				uni.showModal({
					title: '智盾反诈 v1.0.0',
					content: '基于四大 Agent（欺诈训练 / 回答 / 评估 / 救助）的互动式反诈教育应用，uni-app + Vue3 构建。',
					showCancel: false
				})
			},
			logout() {
				logoutUser()
				uni.showToast({ title: '已退出登录', icon: 'none' })
				setTimeout(() => {
					uni.reLaunch({ url: '/pages/login/login' })
				}, 500)
			}
		}
	}
</script>

<style scoped>
	.pf-body {
		padding: 8rpx 32rpx 40rpx;
	}

	/* 编辑模式 */
	.edit-wrap {
		padding-top: 12rpx;
	}

	.edit-tip {
		font-size: 24rpx;
		line-height: 1.6;
		display: block;
		margin-top: 10rpx;
	}

	.form-list {
		margin-top: 24rpx;
	}

	.form-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid var(--line);
	}

	.form-row:last-child {
		border-bottom: none;
	}

	.form-icon {
		font-size: 34rpx;
		width: 50rpx;
	}

	.form-label {
		font-size: 28rpx;
		color: var(--text);
		width: 150rpx;
	}

	.form-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.form-input {
		width: 100%;
		font-size: 28rpx;
		color: var(--text);
	}

	.form-tip {
		font-size: 22rpx;
		line-height: 1.5;
		margin-top: 6rpx;
	}

	.edit-actions {
		margin-top: 36rpx;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.btn {
		width: 100%;
		height: 88rpx;
		border-radius: 999rpx;
		font-size: 30rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		line-height: 88rpx;
	}

	.btn-primary {
		background-image: var(--grad);
		color: #FFFFFF;
		font-weight: 700;
	}

	.btn-ghost {
		background-color: var(--card-2);
		color: var(--text-2);
	}

	/* 用户卡片 */
	.user-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.avatar--big {
		width: 110rpx;
		height: 110rpx;
		font-size: 60rpx;
	}

	.user-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-left: 24rpx;
	}

	.user-name {
		font-size: 36rpx;
		font-weight: 800;
		color: var(--text);
	}

	.user-sub {
		font-size: 24rpx;
		margin-top: 8rpx;
	}

	.user-edit {
		font-size: 26rpx;
		color: var(--accent);
		font-weight: 600;
	}

	/* 游客登录引导 */
	.login-card {
		margin-bottom: 24rpx;
		display: flex;
		flex-direction: column;
	}

	.login-title {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text);
	}

	.login-tip {
		font-size: 24rpx;
		line-height: 1.6;
		margin-top: 10rpx;
	}

	.login-btn {
		margin-top: 20rpx;
		height: 76rpx;
		line-height: 76rpx;
		font-size: 27rpx;
	}

	/* 对话引擎 */
	.engine-tip {
		font-size: 24rpx;
		line-height: 1.6;
		margin-top: 12rpx;
		display: block;
	}

	.engine-actions {
		display: flex;
		flex-direction: row;
		margin-top: 20rpx;
	}

	.engine-btn {
		background-image: var(--grad);
		border-radius: 999rpx;
		padding: 16rpx 32rpx;
		margin-right: 16rpx;
	}

	.engine-btn--ghost {
		background-image: none;
		background-color: var(--card-2);
	}

	.engine-btn-text {
		font-size: 25rpx;
		color: #FFFFFF;
		font-weight: 600;
	}

	.engine-btn-text--ghost {
		color: var(--text-2);
	}

	.engine-note {
		font-size: 22rpx;
		margin-top: 14rpx;
		display: block;
	}

	.theme-switch {
		display: flex;
		flex-direction: row;
		background-color: var(--card-2);
		border-radius: 999rpx;
		padding: 8rpx;
		margin-top: 20rpx;
	}

	.theme-opt {
		flex: 1;
		border-radius: 999rpx;
		padding: 18rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.theme-opt--on {
		background-image: var(--grad);
	}

	.theme-opt-text {
		font-size: 26rpx;
		color: var(--text-2);
	}

	.theme-opt-text--on {
		color: #FFFFFF;
		font-weight: 700;
	}

	.stat-row {
		display: flex;
		flex-direction: row;
		margin-top: 24rpx;
	}

	.stat-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-num {
		font-size: 48rpx;
		font-weight: 800;
	}

	.stat-label {
		font-size: 24rpx;
		margin-top: 6rpx;
	}

	.sec-row {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		justify-content: space-between;
	}

	.field-hint {
		font-size: 22rpx;
	}

	.field-grid {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		margin-top: 20rpx;
	}

	.field-item {
		width: 50%;
		box-sizing: border-box;
		padding: 16rpx 12rpx;
		display: flex;
		flex-direction: column;
	}

	.field-icon {
		font-size: 36rpx;
	}

	.field-label {
		font-size: 22rpx;
		margin-top: 10rpx;
	}

	.field-value {
		font-size: 26rpx;
		color: var(--text);
		font-weight: 600;
		margin-top: 6rpx;
	}

	.field-value--empty {
		color: var(--text-3);
		font-weight: 400;
	}

	.compliance-card {
		margin-top: 24rpx;
		background-color: rgba(255, 159, 67, 0.1);
	}

	.compliance-title {
		font-size: 27rpx;
		font-weight: 700;
		color: var(--warn);
	}

	.compliance-text {
		font-size: 24rpx;
		line-height: 1.6;
		margin-top: 12rpx;
	}

	.link-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-top: 24rpx;
	}

	.link-text {
		font-size: 28rpx;
		color: var(--text);
	}

	.link-text--danger {
		color: var(--danger);
	}

	.pf-tab-space {
		height: 160rpx;
	}
</style>
