<template>
	<view class="tab-wrap">
		<view class="tab-safe"></view>
		<view class="tab-bar">
			<view
				v-for="item in tabs"
				:key="item.key"
				class="tab-item"
				hover-class="press"
				@tap="switchTab(item.url)"
			>
				<text class="tab-icon" :class="{ 'tab-icon--on': active === item.key }">{{ item.icon }}</text>
				<text class="tab-label" :class="{ 'tab-label--on': active === item.key }">{{ item.label }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'tab-bar',
		props: {
			active: { type: String, default: 'home' }
		},
		data() {
			return {
				tabs: [
					{ key: 'home', icon: '🏠', label: '首页', url: '/pages/home/home' },
					{ key: 'scenarios', icon: '🎯', label: '训练', url: '/pages/scenarios/scenarios' },
					{ key: 'mistake', icon: '📓', label: '错题本', url: '/pages/mistake-book/mistake-book' },
					{ key: 'profile', icon: '👤', label: '我的', url: '/pages/profile/profile' }
				]
			}
		},
		methods: {
			switchTab(url) {
				uni.reLaunch({ url })
			}
		}
	}
</script>

<style scoped>
	.tab-wrap {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 100;
	}

	.tab-safe {
		height: env(safe-area-inset-bottom);
		background-color: var(--card);
	}

	.tab-bar {
		background-color: var(--card);
		border-top: 1rpx solid var(--line);
		display: flex;
		flex-direction: row;
		padding: 14rpx 0 20rpx;
	}

	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.tab-icon {
		font-size: 44rpx;
		opacity: 0.45;
	}

	.tab-icon--on {
		opacity: 1;
	}

	.tab-label {
		font-size: 22rpx;
		color: var(--text-2);
		margin-top: 6rpx;
	}

	.tab-label--on {
		color: var(--accent);
		font-weight: 700;
	}
</style>
