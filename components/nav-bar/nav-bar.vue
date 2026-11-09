<template>
	<view class="nav">
		<view class="nav-safe"></view>
		<view class="nav-body">
			<view class="nav-side">
				<view v-if="back" class="back-btn" hover-class="press" @tap="goBack">
					<text class="nav-back">‹</text>
				</view>
			</view>
			<view class="nav-center">
				<text v-if="logo" class="nav-logo">🛡️</text>
				<text class="nav-title">{{ title }}</text>
			</view>
			<view class="nav-side nav-side--right">
				<view class="theme-btn" @tap="$emit('toggle')">
					<text>{{ dark ? '☀️' : '🌙' }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'nav-bar',
		props: {
			title: { type: String, default: '' },
			back: { type: Boolean, default: true },
			logo: { type: Boolean, default: false },
			dark: { type: Boolean, default: false }
		},
		methods: {
			goBack() {
				if (this.back) {
					uni.navigateBack()
				}
			}
		}
	}
</script>

<style scoped>
	.nav {
		background-color: var(--bg);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-safe {
		height: env(safe-area-inset-top);
	}

	.nav-body {
		height: 96rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 0 24rpx;
	}

	.nav-side {
		width: 120rpx;
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.nav-side--right {
		justify-content: flex-end;
	}

	.back-btn {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background-color: var(--card);
		box-shadow: var(--shadow);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-back {
		font-size: 48rpx;
		line-height: 48rpx;
		color: var(--text);
		font-weight: 600;
		margin-top: -6rpx;
	}

	.nav-center {
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
	}

	.nav-logo {
		font-size: 36rpx;
		margin-right: 10rpx;
	}

	.nav-title {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--text);
	}

	.theme-btn {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background-color: var(--card);
		box-shadow: var(--shadow);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 30rpx;
	}
</style>
