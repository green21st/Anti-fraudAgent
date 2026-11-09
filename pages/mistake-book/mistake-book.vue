<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<nav-bar title="错题本" :back="false" :dark="isDark" @toggle="toggleTheme" />

		<view class="mb-body">
			<!-- 摘要 -->
			<view class="card sum-card">
				<view class="sum-left">
					<text class="sum-num">{{ mistakes.length }}</text>
					<text class="muted sum-label">累计错题</text>
				</view>
				<view class="sum-divider"></view>
				<view class="sum-left">
					<text class="sum-num sum-num--orange">{{ pendingCount }}</text>
					<text class="muted sum-label">待巩固</text>
				</view>
				<view class="sum-divider"></view>
				<view class="sum-left">
					<text class="sum-num sum-num--green">{{ masteredCount }}</text>
					<text class="muted sum-label">已掌握</text>
				</view>
			</view>

			<!-- 筛选 -->
			<scroll-view scroll-x class="chip-scroll">
				<view class="chip-row">
					<text
						v-for="f in filters"
						:key="f"
						class="chip"
						:class="{ 'chip--on': filter === f }"
						@tap="filter = f"
					>{{ f }}</text>
				</view>
			</scroll-view>

			<!-- 空状态 -->
			<view v-if="!mistakes.length" class="card empty-card">
				<text class="empty-icon">📭</text>
				<text class="empty-title">错题本还是空的</text>
				<text class="muted empty-tip">在训练中做出错误抉择后，相关题目会自动收录到这里。</text>
			</view>

			<!-- 错题卡片 -->
			<view v-for="m in filteredMistakes" :key="m.id" class="card mb-card">
				<view class="mb-head">
					<view class="avatar-circle">
						<text>{{ m.icon }}</text>
					</view>
					<view class="mb-title-wrap">
						<text class="mb-title">{{ m.scene }}</text>
						<text class="muted mb-time">{{ m.time }}</text>
					</view>
					<text class="tag" :class="m.status === '已掌握' ? 'tag--green' : 'tag--red'">{{ m.status || '待巩固' }}</text>
				</view>

				<view class="card-tint mb-block">
					<text class="mb-block-title">📌 翻车现场</text>
					<text class="mb-block-text muted">{{ m.sceneDesc }}</text>
				</view>
				<view class="card-tint mb-block">
					<text class="mb-block-title">✅ 防范建议</text>
					<text class="mb-block-text muted">{{ m.advice }}</text>
				</view>
				<view class="mb-law">
					<text class="mb-law-text">⚖️ {{ m.law }}</text>
				</view>
			</view>
		</view>

		<view class="mb-tab-space"></view>
		<tab-bar active="mistake" />
	</view>
</template>

<script>
	import { getMistakes } from '@/utils/user.js'

	// 真实时间格式化：MM-DD HH:mm
	function fmt(ts) {
		const d = new Date(ts)
		const p = n => (n < 10 ? '0' + n : '' + n)
		return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
	}

	export default {
		data() {
			return {
				mistakes: [],
				filter: '全部',
				filters: ['全部']
			}
		},
		computed: {
			filteredMistakes() {
				if (this.filter === '全部') return this.mistakes
				return this.mistakes.filter(m => m.scene === this.filter)
			},
			pendingCount() {
				return this.mistakes.filter(m => m.status !== '已掌握').length
			},
			masteredCount() {
				return this.mistakes.filter(m => m.status === '已掌握').length
			}
		},
		onShow() {
			// 只展示当前用户真实做错的题目，新账号默认为空
			const log = getMistakes()
			this.mistakes = log.map(m => Object.assign({}, m, {
				time: fmt(m.time),
				status: m.status || '待巩固'
			}))
			// 筛选标签只根据本账号真实错题涉及的场景生成
			const scenes = []
			this.mistakes.forEach(m => {
				if (m.scene && scenes.indexOf(m.scene) < 0) scenes.push(m.scene)
			})
			this.filters = ['全部'].concat(scenes)
			if (this.filters.indexOf(this.filter) < 0) this.filter = '全部'
		}
	}
</script>

<style scoped>
	.mb-body {
		padding: 8rpx 32rpx 40rpx;
	}

	.sum-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-around;
		margin-bottom: 24rpx;
	}

	.sum-left {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.sum-num {
		font-size: 52rpx;
		font-weight: 800;
		color: var(--accent);
	}

	.sum-num--orange {
		color: var(--warn);
	}

	.sum-num--green {
		color: var(--ok);
	}

	.sum-label {
		font-size: 24rpx;
		margin-top: 6rpx;
	}

	.sum-divider {
		width: 1rpx;
		height: 70rpx;
		background-color: var(--line);
	}

	.chip-scroll {
		white-space: nowrap;
	}

	.chip-row {
		display: flex;
		flex-direction: row;
		padding: 4rpx 4rpx 24rpx;
	}

	.empty-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 70rpx 40rpx;
	}

	.empty-icon {
		font-size: 70rpx;
	}

	.empty-title {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
		margin-top: 20rpx;
	}

	.empty-tip {
		font-size: 24rpx;
		line-height: 1.6;
		text-align: center;
		margin-top: 12rpx;
	}

	.mb-card {
		margin-bottom: 26rpx;
	}

	.mb-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.mb-title-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-left: 20rpx;
	}

	.mb-title {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
	}

	.mb-time {
		font-size: 22rpx;
		margin-top: 4rpx;
	}

	.mb-block {
		margin-bottom: 16rpx;
	}

	.mb-block-title {
		display: block;
		font-size: 25rpx;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 8rpx;
	}

	.mb-block-text {
		font-size: 24rpx;
		line-height: 1.6;
	}

	.mb-law {
		background-color: rgba(124, 58, 237, 0.08);
		border-left: 6rpx solid var(--accent);
		border-radius: 8rpx;
		padding: 16rpx 20rpx;
	}

	.mb-law-text {
		font-size: 23rpx;
		color: var(--text);
		line-height: 1.6;
	}

	.mb-tab-space {
		height: 160rpx;
	}
</style>
