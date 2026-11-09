<script>
	export default {
		onLaunch() {
			// 初始化主题（默认浅色）
			const t = uni.getStorageSync('app_theme')
			if (t !== 'dark' && t !== 'light') {
				uni.setStorageSync('app_theme', 'light')
			}
			console.log('App Launch')
		}
	}
</script>

<style>
	/* ============ 双主题 CSS 变量（浅色 / 深色紫） ============ */
	.page {
		/* 浅色主题 */
		--bg: #F4F4FB;
		--card: #FFFFFF;
		--card-2: #F6F3FE;
		--text: #1F1633;
		--text-2: #7A74A0;
		--line: #ECE8F6;
		--accent: #7C3AED;
		--accent-2: #9F6BFF;
		--accent-soft: #F0E9FE;
		--grad: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
		--shadow: 0 4rpx 14rpx rgba(124, 58, 237, 0.10);
		--green-bubble: #95EC69;
		--green-text: #056309;
		--ok: #22C55E;
		--warn: #FF9F43;
		--danger: #F5564E;
		--info: #5B8DEF;
		--star: #FFB020;
		--mask: rgba(20, 12, 40, 0.45);

		min-height: 100vh;
		background-color: var(--bg);
		color: var(--text);
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.page--dark {
		/* 深色紫主题 */
		--bg: #14101F;
		--card: #1F1833;
		--card-2: #2A2046;
		--text: #F1EDFB;
		--text-2: #A29BC4;
		--line: #322850;
		--accent: #A78BFA;
		--accent-2: #C4B0FF;
		--accent-soft: #372B5E;
		--grad: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
		--shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.35);
		--green-bubble: #3D6B2A;
		--green-text: #D7FFC2;
		--ok: #4ADE80;
		--warn: #FBBF24;
		--danger: #F87171;
		--info: #7CA9F7;
		--star: #FBBF24;
		--mask: rgba(0, 0, 0, 0.6);
	}

	/* ============ 通用组件类 ============ */
	/* 按压反馈（配合 hover-class 使用） */
	.press {
		opacity: 0.6;
	}

	.card {
		background-color: var(--card);
		border-radius: 28rpx;
		padding: 28rpx;
		box-shadow: var(--shadow);
	}

	.card-flat {
		background-color: var(--card);
		border-radius: 28rpx;
		padding: 28rpx;
		border: 1rpx solid var(--line);
	}

	.card-tint {
		background-color: var(--card-2);
		border-radius: 24rpx;
		padding: 24rpx;
	}

	.sec {
		font-size: 32rpx;
		font-weight: 700;
		color: var(--text);
	}

	.muted {
		color: var(--text-2);
	}

	.hr {
		height: 1rpx;
		background-color: var(--line);
	}

	/* 胶囊筛选 chips */
	.chip {
		padding: 12rpx 30rpx;
		border-radius: 999rpx;
		background-color: var(--card-2);
		color: var(--text-2);
		font-size: 26rpx;
		margin-right: 16rpx;
		border: 1rpx solid transparent;
	}

	.chip--on {
		background-color: var(--accent);
		color: #FFFFFF;
		font-weight: 600;
	}

	/* 小标签 */
	.tag {
		font-size: 20rpx;
		padding: 4rpx 14rpx;
		border-radius: 8rpx;
		color: var(--accent);
		background-color: var(--accent-soft);
	}

	.tag--orange {
		color: var(--warn);
		background-color: rgba(255, 159, 67, 0.14);
	}

	.tag--green {
		color: var(--ok);
		background-color: rgba(34, 197, 94, 0.14);
	}

	.tag--red {
		color: var(--danger);
		background-color: rgba(245, 86, 78, 0.14);
	}

	.tag--blue {
		color: var(--info);
		background-color: rgba(91, 141, 239, 0.14);
	}

	/* 按钮 */
	.btn-primary {
		background-image: var(--grad);
		color: #FFFFFF;
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 600;
		padding: 26rpx 0;
		text-align: center;
	}

	.btn-soft {
		background-color: var(--accent-soft);
		color: var(--accent);
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 600;
		padding: 26rpx 0;
		text-align: center;
	}

	/* 头像圆 */
	.avatar-circle {
		width: 84rpx;
		height: 84rpx;
		border-radius: 50%;
		background-color: var(--accent-soft);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 44rpx;
		flex-shrink: 0;
	}

	/* 进度条 */
	.bar-track {
		height: 16rpx;
		border-radius: 999rpx;
		background-color: var(--card-2);
		overflow: hidden;
	}

	.bar-fill {
		height: 16rpx;
		border-radius: 999rpx;
		background-image: var(--grad);
	}
</style>
