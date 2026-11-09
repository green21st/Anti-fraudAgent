<template>
	<view class="page" :class="{ 'page--dark': isDark }">
		<nav-bar title="评估报告" :dark="isDark" @toggle="toggleTheme" />

		<view class="rp-body">
			<!-- 总分卡片 -->
			<view class="card score-card">
				<view class="ring" :style="{ background: ringBg }">
					<view class="ring-inner">
						<text class="ring-score">{{ report.score }}</text>
						<text class="ring-label muted">综合评分</text>
					</view>
				</view>
				<view class="grade-row">
					<text class="grade-tag" :class="{ 'grade-tag--bad': report.score < 60 }">评级：{{ report.grade }}</text>
					<text v-if="report.engine === 'llm'" class="engine-tag">DeepSeek 评估</text>
					<view class="stars">
						<text v-for="n in 5" :key="n" class="star" :class="{ 'star--dim': n > stars }">★</text>
					</view>
				</view>
				<text class="muted summary">{{ report.summary }}</text>
			</view>

			<!-- 六维评分 -->
			<view class="card">
				<text class="sec">六维评分</text>
				<view class="dim-list">
					<view v-for="d in report.dims" :key="d.name" class="dim-row">
						<text class="dim-name muted">{{ d.name }}</text>
						<view class="bar-track dim-track">
							<view class="bar-fill" :style="{ width: d.score + '%' }"></view>
						</view>
						<text class="dim-score">{{ d.score }}</text>
					</view>
				</view>
			</view>

			<!-- 逐句评估（评估 Agent 通读对话后的逐轮评分） -->
			<view v-if="report.turns && report.turns.length" class="card">
				<text class="sec">评估 Agent 逐句点评</text>
				<view v-for="(t, i) in report.turns" :key="i" class="turn-row">
					<text class="turn-score" :class="{ 'turn-score--bad': t.score < 60 }">{{ t.score }}</text>
					<view class="turn-main">
						<text class="turn-text">{{ t.text }}</text>
						<text class="muted turn-verdict">{{ t.verdict }}</text>
					</view>
				</view>
			</view>

			<!-- 改进建议 -->
			<view v-if="report.advices && report.advices.length" class="card">
				<text class="sec">改进建议</text>
				<view class="advice-list">
					<view v-for="(a, i) in report.advices" :key="i" class="advice-item">
						<text class="advice-ico">💡</text>
						<text class="advice-text">{{ a }}</text>
					</view>
				</view>
			</view>

			<!-- 对话回溯：完整保存本场训练对话，可切换历史场次 -->
			<view class="sec-row sec-gap">
				<text class="sec">对话回溯</text>
				<text v-if="logs.length" class="muted chatlog-sub">最近 {{ logs.length }} 场</text>
			</view>
			<scroll-view v-if="logs.length > 1" class="log-tabs" scroll-x>
				<view
					v-for="(l, i) in logs"
					:key="i"
					class="log-tab"
					:class="{ 'log-tab--on': chatLog && chatLog.time === l.time }"
					@tap="viewLog(i)"
				>
					<text class="log-tab-text">{{ l.scene }} · {{ l.time }}</text>
				</view>
			</scroll-view>
			<view v-if="chatLog && chatLog.messages && chatLog.messages.length" class="card chatlog-card">
				<view class="chatlog-head">
					<text class="chatlog-title">{{ chatLog.scene }}</text>
					<text class="muted chatlog-sub">{{ chatLog.time }} · 共 {{ chatLog.messages.length }} 条</text>
				</view>
				<view v-for="(m, i) in chatLog.messages" :key="i" class="log-row" :class="{ 'log-row--me': m.role === 'user' }">
					<text class="log-name">{{ m.role === 'user' ? '我' : (m.name || '对方') }}</text>
					<text class="log-text">{{ m.text }}</text>
				</view>
			</view>
			<view v-else class="card">
				<text class="muted replay-analyze">完成一次训练后，这里会保存你与骗子的完整对话，方便逐句复盘。</text>
			</view>

			<!-- 失误回放 -->
			<text class="sec sec-gap">失误回放</text>
			<view v-if="replays.length" v-for="(r, i) in replays" :key="i" class="card replay-card">
				<view class="replay-head">
					<text class="replay-icon">{{ r.icon }}</text>
					<text class="replay-scene">{{ r.scene }}</text>
				</view>
				<view class="card-tint">
					<text class="replay-chat">{{ r.chat }}</text>
				</view>
				<text class="muted replay-analyze">{{ r.analyze }}</text>
			</view>
			<view v-else class="card replay-card">
				<text class="muted replay-analyze">{{ report.score ? '本次训练无明显失误，继续保持！' : '还没有训练记录，完成一次训练后会在这里显示失误回放。' }}</text>
			</view>

			<!-- 操作按钮 -->
			<view class="btn-row">
				<view class="btn-soft btn-half" hover-class="press" @tap="retry">
					<text>再练一次</text>
				</view>
				<view class="btn-primary btn-half" hover-class="press" @tap="goHome">
					<text>回到首页</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { DIMS } from '@/utils/agents.js'
	import { getLastReport, getMistakes, getChatLogs } from '@/utils/user.js'

	const DEFAULT_REPORT = {
		score: 0,
		grade: '暂无',
		summary: '暂无训练记录，去完成一次训练后查看详细评估。',
		dims: DIMS.map(name => ({ name, score: 0 })),
		advices: []
	}

	export default {
		data() {
			return {
				report: DEFAULT_REPORT,
				replays: [],
				logs: [],
				chatLog: null,
				stars: 0
			}
		},
		computed: {
			ringBg() {
				const s = this.report.score || 0
				return `conic-gradient(var(--accent) 0deg, var(--accent) ${s * 3.6}deg, var(--card-2) ${s * 3.6}deg, var(--card-2) 360deg)`
			}
		},
		onLoad() {
			const last = getLastReport()
			if (last && typeof last === 'object' && last.dims) {
				this.report = last
				this.stars = last.score >= 90 ? 5 : last.score >= 75 ? 4 : last.score >= 60 ? 3 : 2
			}
			// 失误回放：取当前用户最近 3 条错题记录
			const log = getMistakes()
			this.replays = log.slice(0, 3).map(m => ({
				icon: m.icon || '⚠️',
				scene: m.scene || '',
				chat: m.sceneDesc || '',
				analyze: m.advice || ''
			}))
			// 本场完整对话 + 历史场次
			this.logs = getChatLogs()
			this.chatLog = this.logs.length ? this.logs[0] : null
		},
		methods: {
			viewLog(i) {
				this.chatLog = this.logs[i] || null
			},
			// 再练一次：按训练类型直接跳回对应页面（reLaunch 保证任何页面栈下都能响应）
			retry() {
				const r = this.report
				if (!r || !r.scene) {
					uni.reLaunch({ url: '/pages/scenarios/scenarios' })
					return
				}
				if (r.sceneType === 'multi') {
					uni.reLaunch({ url: '/pages/multi-chat/multi-chat?scene=' + encodeURIComponent(r.scene || '求职诈骗') })
				} else {
					uni.reLaunch({ url: '/pages/chat-1v1/chat-1v1?name=' + encodeURIComponent(r.scene) })
				}
			},
			goHome() {
				uni.reLaunch({ url: '/pages/home/home' })
			}
		}
	}
</script>

<style scoped>
	.rp-body {
		padding: 16rpx 32rpx 60rpx;
	}

	.score-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 28rpx;
	}

	.ring {
		width: 260rpx;
		height: 260rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 16rpx 0 28rpx;
	}

	.ring-inner {
		width: 200rpx;
		height: 200rpx;
		border-radius: 50%;
		background-color: var(--card);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.ring-score {
		font-size: 72rpx;
		font-weight: 800;
		color: var(--accent);
		line-height: 1.1;
	}

	.ring-label {
		font-size: 22rpx;
	}

	.grade-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.grade-tag {
		font-size: 26rpx;
		color: var(--ok);
		background-color: rgba(34, 197, 94, 0.12);
		border-radius: 999rpx;
		padding: 8rpx 24rpx;
		font-weight: 700;
		margin-right: 20rpx;
	}

	.grade-tag--bad {
		color: var(--danger);
		background-color: rgba(245, 86, 78, 0.12);
	}

	.stars {
		display: flex;
		flex-direction: row;
	}

	.star {
		color: var(--star);
		font-size: 32rpx;
		margin-left: 6rpx;
	}

	.star--dim {
		opacity: 0.25;
	}

	.summary {
		font-size: 26rpx;
		line-height: 1.6;
		text-align: center;
	}

	.dim-list {
		margin-top: 20rpx;
	}

	.dim-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 22rpx;
	}

	.dim-name {
		width: 150rpx;
		font-size: 25rpx;
	}

	.dim-track {
		flex: 1;
		margin: 0 20rpx;
	}

	.dim-score {
		width: 60rpx;
		text-align: right;
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text);
	}

	.advice-list {
		margin-top: 16rpx;
	}

	.advice-item {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-bottom: 14rpx;
	}

	.advice-ico {
		font-size: 28rpx;
		margin-right: 12rpx;
	}

	.advice-text {
		flex: 1;
		font-size: 26rpx;
		line-height: 1.6;
		color: var(--text);
	}

	.sec-gap {
		display: block;
		margin: 12rpx 8rpx 20rpx;
	}

	.replay-card {
		margin-bottom: 24rpx;
	}

	.replay-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.replay-icon {
		font-size: 34rpx;
		margin-right: 12rpx;
	}

	.replay-scene {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text);
	}

	.replay-chat {
		font-size: 25rpx;
		color: var(--text);
		line-height: 1.6;
	}

	.replay-analyze {
		font-size: 25rpx;
		line-height: 1.6;
		margin-top: 16rpx;
	}

	.btn-row {
		display: flex;
		flex-direction: row;
		margin-top: 12rpx;
	}

	.btn-half {
		flex: 1;
	}

	.btn-row .btn-soft {
		margin-right: 20rpx;
	}

	.sec-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.log-tabs {
		white-space: nowrap;
		margin-bottom: 18rpx;
	}

	.log-tab {
		display: inline-block;
		background-color: var(--card);
		border-radius: 999rpx;
		padding: 10rpx 22rpx;
		margin-right: 14rpx;
		box-shadow: var(--shadow);
	}

	.log-tab--on {
		background-color: rgba(59, 130, 246, 0.16);
	}

	.log-tab-text {
		font-size: 22rpx;
		color: var(--text);
	}

	.engine-tag {
		font-size: 22rpx;
		color: var(--accent);
		background-color: rgba(59, 130, 246, 0.12);
		border-radius: 999rpx;
		padding: 6rpx 18rpx;
		margin-right: 16rpx;
	}

	.turn-row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-top: 18rpx;
	}

	.turn-score {
		width: 72rpx;
		text-align: center;
		font-size: 26rpx;
		font-weight: 800;
		color: var(--ok);
		background-color: rgba(34, 197, 94, 0.12);
		border-radius: 12rpx;
		padding: 6rpx 0;
		margin-right: 18rpx;
	}

	.turn-score--bad {
		color: var(--danger);
		background-color: rgba(245, 86, 78, 0.12);
	}

	.turn-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.turn-text {
		font-size: 25rpx;
		color: var(--text);
		line-height: 1.5;
	}

	.turn-verdict {
		font-size: 22rpx;
		line-height: 1.5;
		margin-top: 6rpx;
	}

	.chatlog-head {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16rpx;
	}

	.chatlog-title {
		font-size: 27rpx;
		font-weight: 700;
		color: var(--text);
	}

	.chatlog-sub {
		font-size: 21rpx;
	}

	.log-row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-bottom: 14rpx;
	}

	.log-name {
		width: 100rpx;
		font-size: 21rpx;
		color: var(--muted);
		line-height: 1.6;
	}

	.log-text {
		flex: 1;
		font-size: 24rpx;
		line-height: 1.6;
		color: var(--text);
	}

	.log-row--me .log-text {
		color: var(--accent);
	}

</style>
