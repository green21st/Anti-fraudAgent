<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<nav-bar title="智盾反诈" :back="false" logo :dark="isDark" @toggle="toggleTheme" />

		<view class="home-body">
			<!-- 问候区 -->
			<view class="greet">
				<text class="greet-hi">你好，{{ userName }} 👋</text>
				<text class="greet-date muted">今天也要保持警惕哦</text>
			</view>

			<!-- 双模式入口 -->
			<view class="mode-card" hover-class="press" @tap="go('/pages/scenarios/scenarios')">
				<view class="mode-left">
					<text class="mode-tag">训练模式</text>
					<text class="mode-title">欺诈训练</text>
					<text class="mode-desc">与 AI 骗子一对一或多人对抗，识破话术</text>
				</view>
				<text class="mode-icon">🎯</text>
			</view>
			<view class="mode-card mode-card--rescue" hover-class="press" @tap="go('/pages/rescue/rescue')">
				<view class="mode-left">
					<text class="mode-tag">自救模式</text>
					<text class="mode-title">法律自救</text>
					<text class="mode-desc">被骗后的六步应对方案与求助热线</text>
				</view>
				<text class="mode-icon">⚖️</text>
			</view>

			<!-- 数据统计 -->
			<view class="card">
				<text class="sec">我的训练数据</text>
				<view class="stat-row">
					<view class="stat-item">
						<text class="stat-num stat-num--purple">{{ stats.total }}</text>
						<text class="stat-label muted">累计训练</text>
					</view>
					<view class="stat-item">
						<text class="stat-num stat-num--orange">{{ stats.avg }}</text>
						<text class="stat-label muted">平均得分</text>
					</view>
					<view class="stat-item">
						<text class="stat-num stat-num--green">{{ stats.cracked }}</text>
						<text class="stat-label muted">识破骗局</text>
					</view>
				</view>
			</view>

			<!-- 快捷入口 -->
			<view class="card">
				<text class="sec">快捷入口</text>
				<view class="quick-grid">
					<view class="quick-item" hover-class="press" @tap="go('/pages/scenarios/scenarios')">
						<text class="quick-icon">📚</text>
						<text class="quick-label">场景库</text>
					</view>
					<view class="quick-item" hover-class="press" @tap="go('/pages/mistake-book/mistake-book')">
						<text class="quick-icon">📓</text>
						<text class="quick-label">错题本</text>
					</view>
					<view class="quick-item" hover-class="press" @tap="go('/pages/report/report')">
						<text class="quick-icon">📊</text>
						<text class="quick-label">评估报告</text>
					</view>
					<view class="quick-item" hover-class="press" @tap="go('/pages/multi-chat/multi-chat')">
						<text class="quick-icon">🔍</text>
						<text class="quick-label">找骗子</text>
					</view>
				</view>
			</view>

			<!-- 今日推荐 -->
			<view class="card today-card" hover-class="press" @tap="go('/pages/chat-1v1/chat-1v1')">
				<view class="today-left">
					<view class="tag tag--orange">今日推荐</view>
					<text class="today-title">冒充公检法</text>
					<text class="muted today-desc">高发电诈场景 · 难度困难</text>
				</view>
				<text class="today-arrow">›</text>
			</view>
		</view>

		<view class="home-tab-space"></view>
		<tab-bar active="home" />
	</view>
</template>

<script>
	import { currentUser, getStats } from '@/utils/user.js'

	export default {
		data() {
			return {
				userName: '游客',
				stats: { total: 0, avg: 0, cracked: 0 }
			}
		},
		onShow() {
			const u = currentUser()
			this.userName = (u && u.name) ? u.name : '游客'
			this.stats = getStats()
		},
		methods: {
			go(url) {
				uni.navigateTo({ url })
			}
		}
	}
</script>

<style scoped>
	.home-body {
		padding: 16rpx 32rpx 40rpx;
	}

	.greet {
		display: flex;
		flex-direction: column;
		padding: 12rpx 8rpx 28rpx;
	}

	.greet-hi {
		font-size: 40rpx;
		font-weight: 800;
		color: var(--text);
	}

	.greet-date {
		font-size: 24rpx;
		margin-top: 8rpx;
	}

	.mode-card {
		background-image: var(--grad);
		border-radius: 32rpx;
		padding: 36rpx 32rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		box-shadow: var(--shadow);
		margin-bottom: 24rpx;
	}

	.mode-card--rescue {
		background-image: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
	}

	.mode-left {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.mode-tag {
		font-size: 20rpx;
		color: rgba(255, 255, 255, 0.85);
		background-color: rgba(255, 255, 255, 0.18);
		align-self: flex-start;
		padding: 4rpx 16rpx;
		border-radius: 999rpx;
	}

	.mode-title {
		font-size: 38rpx;
		font-weight: 800;
		color: #FFFFFF;
		margin-top: 14rpx;
	}

	.mode-desc {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.8);
		margin-top: 8rpx;
	}

	.mode-icon {
		font-size: 80rpx;
		margin-left: 20rpx;
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

	.stat-num--purple {
		color: var(--accent);
	}

	.stat-num--orange {
		color: var(--warn);
	}

	.stat-num--green {
		color: var(--ok);
	}

	.stat-label {
		font-size: 24rpx;
		margin-top: 6rpx;
	}

	.quick-grid {
		display: flex;
		flex-direction: row;
		margin-top: 24rpx;
	}

	.quick-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: var(--card-2);
		border-radius: 20rpx;
		padding: 24rpx 0;
		margin-right: 16rpx;
	}

	.quick-icon {
		font-size: 44rpx;
	}

	.quick-label {
		font-size: 24rpx;
		color: var(--text);
		margin-top: 10rpx;
	}

	.today-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-top: 24rpx;
	}

	.today-left {
		display: flex;
		flex-direction: column;
	}

	.today-title {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--text);
		margin-top: 12rpx;
	}

	.today-desc {
		font-size: 24rpx;
		margin-top: 6rpx;
	}

	.today-arrow {
		font-size: 56rpx;
		color: var(--text-2);
		font-weight: 300;
	}

	.home-tab-space {
		height: 160rpx;
	}
</style>
