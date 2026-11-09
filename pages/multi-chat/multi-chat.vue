<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<nav-bar :title="'多人找骗子 · ' + sceneName" :dark="isDark" @toggle="toggleTheme" />

		<view class="mc-body">
			<!-- 玩法说明 -->
			<view class="card rule-card">
				<view class="rule-top">
					<text class="sec">🔍 玩法说明</text>
					<text class="tag tag--orange">训练中</text>
				</view>
				<text class="muted rule-text">{{ ruleText }}</text>
			</view>

			<!-- 联系人列表 -->
			<text class="sec list-title">聊天列表</text>
			<view
				v-for="c in contacts"
				:key="c.id"
				class="card contact-card"
				hover-class="press"
				@tap="enter(c)"
			>
				<view class="avatar-circle" :class="{ 'avatar--sus': c.isScammer }">
					<text>{{ c.avatar }}</text>
				</view>
				<view class="contact-info">
					<view class="contact-top">
						<text class="contact-name">{{ c.name }}</text>
						<text class="muted contact-time">{{ c.time }}</text>
					</view>
					<view class="contact-mid">
						<text class="muted contact-role">{{ c.role }}</text>
						<text v-if="c.unread > 0" class="badge">{{ c.unread }}</text>
					</view>
					<text class="muted contact-last">{{ c.last }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { multiScenarios } from '@/utils/data.js'

	export default {
		data() {
			return {
				sceneName: '求职诈骗',
				ruleText: '',
				contacts: []
			}
		},
		onLoad(opt) {
			const scene = (opt && opt.scene) ? decodeURIComponent(opt.scene) : '求职诈骗'
			const cfg = multiScenarios[scene] || multiScenarios['求职诈骗']
			this.sceneName = scene
			this.ruleText = cfg.ruleText
			this.contacts = cfg.contacts
			this._scene = scene
		},
		methods: {
			enter(c) {
				uni.navigateTo({
					url: '/pages/multi-detail/multi-detail?scene=' + encodeURIComponent(this._scene) + '&focus=' + c.id
				})
			}
		}
	}
</script>

<style scoped>
	.mc-body {
		padding: 8rpx 32rpx 40rpx;
	}

	.rule-card {
		margin-bottom: 28rpx;
	}

	.rule-top {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14rpx;
	}

	.rule-text {
		font-size: 26rpx;
		line-height: 1.6;
	}

	.list-title {
		display: block;
		margin: 8rpx 8rpx 20rpx;
	}

	.contact-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 22rpx;
	}

	.avatar--sus {
		border: 2rpx solid rgba(245, 86, 78, 0.4);
	}

	.contact-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-left: 24rpx;
	}

	.contact-top {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.contact-name {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
	}

	.contact-time {
		font-size: 22rpx;
	}

	.contact-mid {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-top: 4rpx;
	}

	.contact-role {
		font-size: 22rpx;
	}

	.badge {
		background-color: var(--danger);
		color: #FFFFFF;
		font-size: 20rpx;
		min-width: 34rpx;
		height: 34rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8rpx;
	}

	.contact-last {
		font-size: 26rpx;
		margin-top: 10rpx;
	}
</style>
