<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<nav-bar title="场景库" :back="false" :dark="isDark" @toggle="toggleTheme" />

		<view class="sc-body">
			<!-- 筛选 chips -->
			<scroll-view scroll-x class="chip-scroll">
				<view class="chip-row">
					<text
						v-for="f in filters"
						:key="f.key"
						class="chip"
						:class="{ 'chip--on': filter === f.key }"
						hover-class="press"
						@tap="filter = f.key"
					>{{ f.label }}</text>
				</view>
			</scroll-view>

			<!-- 场景卡片列表 -->
			<view
				v-for="s in filteredScenarios"
				:key="s.id"
				class="card sc-card"
				hover-class="press"
				@tap="enter(s)"
			>
				<view class="avatar-circle">
					<text>{{ s.icon }}</text>
				</view>
				<view class="sc-info">
					<view class="sc-name-row">
						<text class="sc-name">{{ s.name }}</text>
						<text v-if="s.hot" class="tag tag--orange">高发</text>
					</view>
					<text class="muted sc-desc">{{ s.desc }}</text>
					<view class="sc-meta">
						<text class="tag" :class="levelClass(s.level)">{{ s.level }}</text>
						<text class="tag tag--blue">{{ s.type === 'multi' ? '多人找骗子' : '一对一训练' }}</text>
					</view>
				</view>
				<text class="sc-arrow">›</text>
			</view>
		</view>

		<view class="sc-tab-space"></view>
		<tab-bar active="scenarios" />
	</view>
</template>

<script>
	import { scenarios } from '@/utils/data.js'

	export default {
		data() {
			return {
				filter: 'all',
				filters: [
					{ key: 'all', label: '全部' },
					{ key: 'hot', label: '高发电诈' },
					{ key: '1v1', label: '一对一训练' },
					{ key: 'multi', label: '多人找骗子' },
					{ key: 'hard', label: '进阶挑战' }
				],
				scenarios
			}
		},
		computed: {
			filteredScenarios() {
				const f = this.filter
				if (f === 'all') return this.scenarios
				if (f === 'hot') return this.scenarios.filter(s => s.hot)
				if (f === 'hard') return this.scenarios.filter(s => s.level === '困难')
				return this.scenarios.filter(s => s.type === f)
			}
		},
		methods: {
			levelClass(level) {
				if (level === '困难') return 'tag--red'
				if (level === '中等') return 'tag--orange'
				return 'tag--green'
			},
			enter(s) {
				if (s.type === 'multi') {
					uni.navigateTo({ url: '/pages/multi-chat/multi-chat?scene=' + encodeURIComponent(s.name) })
				} else {
					uni.navigateTo({ url: '/pages/chat-1v1/chat-1v1?name=' + s.name })
				}
			}
		}
	}
</script>

<style scoped>
	.sc-body {
		padding: 8rpx 32rpx 40rpx;
	}

	.chip-scroll {
		white-space: nowrap;
	}

	.chip-row {
		display: flex;
		flex-direction: row;
		padding: 12rpx 4rpx 24rpx;
	}

	.sc-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.sc-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-left: 24rpx;
	}

	.sc-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.sc-name {
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text);
		margin-right: 12rpx;
	}

	.sc-desc {
		font-size: 24rpx;
		margin-top: 8rpx;
	}

	.sc-meta {
		display: flex;
		flex-direction: row;
		margin-top: 14rpx;
	}

	.sc-meta .tag {
		margin-right: 12rpx;
	}

	.sc-arrow {
		font-size: 52rpx;
		color: var(--text-2);
		font-weight: 300;
	}

	.sc-tab-space {
		height: 160rpx;
	}
</style>
