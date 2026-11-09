<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<view class="login-top">
			<view class="login-safe"></view>
			<view class="theme-row">
				<view class="theme-btn" @tap="toggleTheme">
					<text>{{ isDark ? '☀️' : '🌙' }}</text>
				</view>
			</view>
			<view class="logo-box">
				<text class="logo-icon">🛡️</text>
			</view>
			<text class="app-name">智盾反诈</text>
			<text class="app-slogan">AI 智能训练 · 让骗子无机可乘</text>
		</view>

		<view class="login-body">
			<!-- 登录 / 注册 切换 -->
			<view class="card auth-card">
				<view class="tab-switch">
					<view class="tab-opt" :class="{ 'tab-opt--on': mode === 'login' }" hover-class="press" @tap="switchMode('login')">
						<text class="tab-opt-text" :class="{ 'tab-opt-text--on': mode === 'login' }">登录</text>
					</view>
					<view class="tab-opt" :class="{ 'tab-opt--on': mode === 'register' }" hover-class="press" @tap="switchToRegister">
						<text class="tab-opt-text" :class="{ 'tab-opt-text--on': mode === 'register' }">注册</text>
					</view>
				</view>

				<view class="input-row">
					<text class="input-icon">👤</text>
					<input class="input" v-model="nickname" placeholder="请输入昵称" placeholder-class="ph" maxlength="12" />
				</view>
				<view class="input-row">
					<text class="input-icon">🔒</text>
					<input class="input" v-model="password" password placeholder="请输入密码（至少4位）" placeholder-class="ph" maxlength="20" />
				</view>
				<view class="input-row" v-if="mode === 'register'">
					<text class="input-icon">✅</text>
					<input class="input" v-model="confirmPwd" password placeholder="请再次输入密码" placeholder-class="ph" maxlength="20" />
				</view>

				<view class="btn-primary auth-btn" hover-class="press" @tap="submit">
					<text>{{ mode === 'login' ? '登 录' : '注册并填写个人画像' }}</text>
				</view>
				<view class="btn-soft guest-btn" hover-class="press" @tap="guestMode">
					<text>游客模式体验</text>
				</view>
			</view>

			<!-- 三 Agent 特性 -->
			<view class="card feature-card">
				<view class="feature-row">
					<text class="feature-icon">🎯</text>
					<view class="feature-txt">
						<text class="feature-title">欺诈训练 Agent</text>
						<text class="feature-desc muted">一对一情景演练，识破骗子话术</text>
					</view>
				</view>
				<view class="feature-row">
					<text class="feature-icon">📊</text>
					<view class="feature-txt">
						<text class="feature-title">评估 Agent</text>
						<text class="feature-desc muted">六维评分复盘，生成错题本</text>
					</view>
				</view>
				<view class="feature-row">
					<text class="feature-icon">⚖️</text>
					<view class="feature-txt">
						<text class="feature-title">救助 Agent</text>
						<text class="feature-desc muted">被骗后的六步法律自救方案</text>
					</view>
				</view>
			</view>

			<view class="agree-row">
				<text class="muted agree-text">登录即代表同意《用户协议》与《隐私政策》</text>
			</view>
			<view class="agree-row">
				<text class="agree-text agree-text--soft">训练内容均为模拟演练，请勿模仿用于违法行为</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { register, login, loginGuest } from '@/utils/user.js'

	export default {
		data() {
			return {
				mode: 'login',
				nickname: '',
				password: '',
				confirmPwd: ''
			}
		},
		methods: {
			switchMode(m) {
				this.mode = m
			},
			switchToRegister() {
				this.mode = 'register'
				this.password = ''
				this.confirmPwd = ''
			},
			submit() {
				if (this.mode === 'register') {
					if (this.password !== this.confirmPwd) {
						uni.showToast({ title: '两次密码输入不一致', icon: 'none' })
						return
					}
					const r = register(this.nickname, this.password)
					if (!r.ok) {
						uni.showToast({ title: r.msg, icon: 'none' })
						return
					}
					uni.showToast({ title: '注册成功，请完善画像', icon: 'none' })
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/profile/profile?edit=1&first=1' })
					}, 700)
				} else {
					const r = login(this.nickname, this.password)
					if (!r.ok) {
						uni.showToast({ title: r.msg, icon: 'none' })
						return
					}
					uni.showToast({ title: '登录成功', icon: 'none' })
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/home/home' })
					}, 500)
				}
			},
			guestMode() {
				loginGuest()
				uni.reLaunch({ url: '/pages/home/home' })
			}
		}
	}
</script>

<style scoped>
	.login-top {
		background-image: var(--grad);
		padding-bottom: 60rpx;
		border-bottom-left-radius: 60rpx;
		border-bottom-right-radius: 60rpx;
	}

	.login-safe {
		height: env(safe-area-inset-top);
	}

	.theme-row {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		padding: 24rpx 32rpx 0;
	}

	.theme-btn {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.22);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 30rpx;
	}

	.logo-box {
		width: 160rpx;
		height: 160rpx;
		border-radius: 44rpx;
		background-color: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 40rpx auto 0;
	}

	.logo-icon {
		font-size: 88rpx;
	}

	.app-name {
		display: block;
		text-align: center;
		color: #FFFFFF;
		font-size: 44rpx;
		font-weight: 800;
		margin-top: 28rpx;
	}

	.app-slogan {
		display: block;
		text-align: center;
		color: rgba(255, 255, 255, 0.85);
		font-size: 26rpx;
		margin-top: 12rpx;
	}

	.login-body {
		padding: 36rpx 40rpx 60rpx;
	}

	.auth-card {
		margin-bottom: 28rpx;
	}

	.tab-switch {
		display: flex;
		flex-direction: row;
		background-color: var(--card-2);
		border-radius: 999rpx;
		padding: 8rpx;
		margin-bottom: 28rpx;
	}

	.tab-opt {
		flex: 1;
		border-radius: 999rpx;
		padding: 16rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tab-opt--on {
		background-image: var(--grad);
	}

	.tab-opt-text {
		font-size: 28rpx;
		color: var(--text-2);
	}

	.tab-opt-text--on {
		color: #FFFFFF;
		font-weight: 700;
	}

	.input-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		background-color: var(--card-2);
		border-radius: 20rpx;
		padding: 0 24rpx;
		margin-bottom: 20rpx;
		height: 96rpx;
	}

	.input-icon {
		font-size: 32rpx;
		margin-right: 16rpx;
	}

	.input {
		flex: 1;
		font-size: 28rpx;
		color: var(--text);
	}

	.ph {
		color: var(--text-2);
		font-size: 28rpx;
	}

	.auth-btn {
		margin-top: 8rpx;
	}

	.guest-btn {
		margin-top: 20rpx;
	}

	.feature-card {
		margin-bottom: 8rpx;
	}

	.feature-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 14rpx 0;
	}

	.feature-icon {
		font-size: 44rpx;
		margin-right: 24rpx;
	}

	.feature-txt {
		display: flex;
		flex-direction: column;
	}

	.feature-title {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text);
	}

	.feature-desc {
		font-size: 24rpx;
		margin-top: 4rpx;
	}

	.agree-row {
		display: flex;
		flex-direction: row;
		justify-content: center;
		margin-top: 24rpx;
	}

	.agree-text {
		font-size: 22rpx;
	}

	.agree-text--soft {
		color: var(--warn);
	}
</style>
