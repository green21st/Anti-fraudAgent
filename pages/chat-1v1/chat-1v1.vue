<template>
	<view class="page chat-page" :class="{ 'page--dark': isDark }">
		<nav-bar :title="sceneName" :dark="isDark" @toggle="toggleTheme" />

		<!-- 风险提示条 -->
		<view class="risk-banner">
			<text class="risk-text">{{ banner }}</text>
		</view>

		<!-- 聊天区域 -->
		<view class="chat-body">
			<view class="chat-list">
				<view v-for="(m, i) in messages" :key="i" :id="'m' + i">
					<!-- 系统/评估提示 -->
					<view v-if="m.type === 'tip'" class="tip-wrap">
						<view class="tip-box">
							<text class="tip-text">{{ m.text }}</text>
						</view>
					</view>

					<!-- 模拟转账卡片 -->
					<view v-else-if="m.type === 'card'" class="row row--left">
						<view class="avatar-circle avatar--bot">
							<text>👮</text>
						</view>
						<view class="transfer-card">
							<view class="transfer-head">
								<text class="transfer-title">💸 模拟演练 · 转账请求</text>
							</view>
							<text class="transfer-amount">¥{{ m.amount }}</text>
							<view class="transfer-row">
								<text class="transfer-label muted">卡号：{{ m.account }}</text>
							</view>
							<view class="transfer-row">
								<text class="transfer-label muted">户名：{{ m.owner }}</text>
							</view>
							<text v-if="m.done" class="transfer-done">{{ m.result }}</text>
						</view>
					</view>

					<!-- 普通气泡 -->
					<view
						v-else
						class="row"
						:class="m.type === 'user' ? 'row--right' : 'row--left'"
					>
						<view v-if="m.type !== 'user'" class="avatar-circle avatar--bot">
							<text>👤</text>
						</view>
						<view class="bubble" :class="m.type === 'user' ? 'bubble--user' : 'bubble--bot'">
							<text>{{ m.text }}</text>
						</view>
						<view v-if="m.type === 'user'" class="avatar-circle avatar--me">
							<text>🧑</text>
						</view>
					</view>
				</view>

				<!-- 对方正在输入… -->
				<view v-if="thinking" class="row row--left">
					<view class="avatar-circle avatar--bot">
						<text>👤</text>
					</view>
					<view class="bubble bubble--bot">
						<text class="typing-text">对方正在输入…</text>
					</view>
				</view>

				<!-- 用户抉择按钮 -->
				<view v-if="showChoices" class="choice-wrap">
					<view
						v-for="c in choices"
						:key="c.key"
						class="choice-btn"
						hover-class="press"
						@tap="answer(c.key)"
					>
						<text>{{ c.label }}</text>
					</view>
				</view>

				<!-- 训练结束：查看报告 -->
				<view v-if="finished" class="choice-wrap">
					<view class="report-btn" hover-class="press" @tap="goReport">
						<text class="report-text">📊 查看评估报告</text>
					</view>
				</view>

				<view class="chat-end-space"></view>
			</view>
		</view>

		<!-- 输入栏 -->
		<view class="input-bar">
			<input
				v-model="draft"
				class="input"
				placeholder="输入你的应对话术…"
				confirm-type="send"
				@confirm="send"
			/>
			<view class="send-btn" hover-class="press" @tap="send">
				<text class="send-text">发送</text>
			</view>
			<view class="end-btn" hover-class="press" @tap="endTraining">
				<text class="end-text">结束</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { chatScripts, scenarios, mistakes } from '@/utils/data.js'
	import { ReplyAgent, EvalAgent, DIMS, personaInfo } from '@/utils/agents.js'
	import { addTrainingRecord, addMistakes, saveLastReport, saveChatLog, currentUser, getProfile } from '@/utils/user.js'
	import { chatLLM, evalLLM, hasLLM } from '@/utils/llm.js'

	export default {
		data() {
			return {
				sceneName: '一对一训练',
				sceneKey: '冒充公检法',
				script: { banner: '', identify: '', stages: [] },
				messages: [],
				stageIdx: 0,
				playing: false,
				showChoices: false,
				finished: false,
				choices: [],
				correct: 0,
				total: 0,
				events: [],
				inputCount: 0,
				wrongPicks: [],
				session: null,
				profile: {},
				history: [],
				thinking: false,
				draft: ''
			}
		},
		onLoad(opt) {
			let key = ''
			if (opt && opt.name) {
				try { key = decodeURIComponent(opt.name) } catch (e) { key = opt.name }
			}
			if (!chatScripts[key]) key = '冒充公检法'
			this.sceneKey = key
			this.sceneName = '一对一训练 · ' + key
			this.script = chatScripts[key]
			// 读取当前用户与画像，供脚本、对话、评估个性化
			const u = currentUser()
			const p = getProfile()
			this.profile = Object.assign({}, p, { nickname: u ? u.name : '' })
			this.session = ReplyAgent.createSession(key, this.profile)
			this.playStage(0)
		},
		onUnload() {
			this.playing = true
		},
		methods: {
			// 按阶段播放骗子话术（关键剧情节点，含转账卡与抉择）
			playStage(idx) {
				const stage = this.script.stages[idx]
				if (!stage) return this.finish()
				this.stageIdx = idx
				this.playing = true
				let delay = 500
				stage.bot.forEach((t) => {
					setTimeout(() => {
						const line = this.render(t)
						this.messages.push({ type: 'bot', text: line })
						this.history.push({ role: 'assistant', content: line })
						this.scrollBottom()
					}, delay)
					delay += 1200
				})
				setTimeout(() => {
					if (stage.card) {
						this.messages.push(JSON.parse(JSON.stringify(stage.card)))
						this.scrollBottom()
					}
					this.choices = stage.choices
					this.showChoices = true
					this.playing = false
					this.scrollBottom()
				}, delay)
			},
			// 处理用户抉择：用户消息 -> 骗子应答 -> 评估Agent实时评估 -> 下一阶段/结束
			answer(key) {
				if (this.playing || this.finished) return
				const stage = this.script.stages[this.stageIdx]
				const c = stage.choices.find(x => x.key === key)
				if (!c) return
				this.showChoices = false
				this.playing = true
				this.total++
				if (c.correct) this.correct++
				// 评估 Agent：抉择事件打分（正确=理性90+，高危=上当8-17，其余=犹豫52-61）
				const ev = EvalAgent.choiceEvent(c)
				this.events.push(ev)
				if (!c.correct) this.wrongPicks.push({ stageIdx: this.stageIdx, choice: c })
				const cards = this.messages.filter(m => m.type === 'card' && !m.done)
				const cardMsg = cards.length ? cards[cards.length - 1] : null
				this.messages.push({ type: 'user', text: c.reply })
				this.history.push({ role: 'user', content: c.reply })
				this.scrollBottom()
				if (cardMsg) {
					cardMsg.done = true
					cardMsg.result = c.correct ? '✅ 已拒绝，未造成损失' : '❌ 转账成功（模拟）——对方随即将你拉黑'
				}
				setTimeout(() => {
					this.messages.push({ type: 'bot', text: c.feedback })
					this.history.push({ role: 'assistant', content: c.feedback })
					this.scrollBottom()
				}, 700)
				// 评估 Agent：实时输出倾向提示
				setTimeout(() => {
					this.messages.push({ type: 'tip', text: EvalAgent.tendencyTip(ev) })
					this.scrollBottom()
				}, 1400)
				setTimeout(() => {
					this.playing = false
					if (this.stageIdx >= this.script.stages.length - 1) {
						this.finish()
					} else {
						this.playStage(this.stageIdx + 1)
					}
				}, 2200)
			},
			// 姓名与自称个性化：脚本里的固定人名按当前用户替换，无姓名时改为中性表述
			render(t) {
				const raw = (this.profile && this.profile.nickname) ? String(this.profile.nickname).trim() : ''
				const name = (raw && raw !== '游客') ? raw : '您'
				let s = String(t || '')
				if (name === '您') s = s.replace(/李明吗？/g, '请问是您本人吗？')
				return s.replace(/李明/g, name)
			},
			// 自由输入：大模型优先（有 API Key 时），失败无感回落回答Agent
			async send() {
				const text = (this.draft || '').trim()
				if (!text || this.finished || this.thinking) return
				this.draft = ''
				this.messages.push({ type: 'user', text })
				this.history.push({ role: 'user', content: text })
				this.scrollBottom()
				// 回答 Agent：先本地计算评估与推进阶段（保证离线也能打分）
				const result = ReplyAgent.reply(this.session, text)
				const ev = result.ev
				this.events.push(ev)
				this.inputCount++
				let texts = result.texts || []
				// 已接入大模型：按其人设、目标链、用户画像生成更真实的应答
				if (hasLLM()) {
					this.thinking = true
					this.scrollBottom()
					const info = personaInfo(this.sceneKey)
					const res = await chatLLM({
						sceneName: this.sceneKey,
						persona: info.intro,
						goals: info.goals,
						stage: this.session.stage,
						profile: this.profile,
						history: this.history.slice(-12, -1),
						userText: text
					})
					this.thinking = false
					if (this.finished) return
					if (res && res.ok && res.texts && res.texts.length) texts = res.texts
				}
				let delay = 400
				texts.forEach((t) => {
					setTimeout(() => {
						this.messages.push({ type: 'bot', text: this.render(t) })
						this.history.push({ role: 'assistant', content: t })
						this.scrollBottom()
					}, delay)
					delay += 1100
				})
				// 评估 Agent：实时输出倾向提示
				setTimeout(() => {
					this.messages.push({ type: 'tip', text: EvalAgent.tendencyTip(ev) })
					this.scrollBottom()
				}, delay)
				// 连续两次被点破 → 骗子撤退拉黑
				if (result.fled) {
					setTimeout(() => {
						this.messages.push({ type: 'tip', text: '🚫 对方察觉你已识破，已将你拉黑，对话结束。' })
						this.scrollBottom()
						this.finish()
					}, delay + 800)
				}
			},
			// 训练结束：评估 Agent 通读整场对话生成报告 + 写入训练记录 + 错题本 + 对话回溯
			async finish() {
				if (this.finished) return
				this.finished = true
				this.showChoices = false
				const inputs = this.inputCount
				// 规则引擎先出一版初判（离线兜底，也让报告页立刻有数据）
				const baseline = EvalAgent.buildReport(this.sceneKey, '1v1', this.events)
				let report = baseline
				const history = this.history.slice()
				// 保存本次完整对话，供报告页回溯与复盘
				saveChatLog({
					scene: this.sceneKey,
					sceneType: '1v1',
					messages: this.messages
						.filter(m => m.type === 'user' || m.type === 'bot')
						.map(m => ({ role: m.type === 'user' ? 'user' : 'bot', text: m.text }))
				})
				saveLastReport(baseline)
				this.messages.push({ type: 'tip', text: '🎯 ' + this.script.identify })
				if (hasLLM()) {
					this.messages.push({ type: 'tip', text: '评估 Agent 正在通读你与骗子的整场对话…' })
					this.scrollBottom()
					const res = await evalLLM({
						sceneName: this.sceneKey,
						sceneType: '1v1',
						profile: this.profile,
						history,
						baseline,
						dims: DIMS
					})
					if (res && res.ok && res.report) {
						report = Object.assign({}, res.report, {
							scene: this.sceneKey,
							sceneType: '1v1',
							time: baseline.time,
							engine: 'llm'
						})
						saveLastReport(report)
					}
				}
				addTrainingRecord({ scene: this.sceneKey, score: report.score, grade: report.grade, time: report.time })
				this.messages.push({
					type: 'tip',
					text: '训练结束：本次共 ' + this.total + ' 次关键抉择' +
						(inputs ? '（另有 ' + inputs + ' 次自由应对）' : '') +
						'，综合得分 ' + report.score + ' 分（' + report.grade + '）' +
						(report.engine === 'llm' ? '，由 DeepSeek 评估' : '') +
						'。点击下方"查看评估报告"复盘。'
				})
				// 错题本：优先用模型判定的失误，其次用本地抉择记录；真实时间戳
				const sceneInfo = scenarios.find(s => s.name === this.sceneKey) || {}
				const lawRef = mistakes.find(m => m.scene === this.sceneKey)
				const log = []
				if (report.mistakes && report.mistakes.length) {
					report.mistakes.forEach((m, i) => {
						log.push({
							id: 'e' + Date.now() + '_' + i,
							icon: sceneInfo.icon || '⚠️',
							scene: this.sceneKey,
							sceneDesc: m.sceneDesc,
							advice: m.advice,
							law: lawRef ? lawRef.law : '关联法条：《刑法》第二百六十六条（诈骗罪）·《反电信网络诈骗法》',
							time: Date.now(),
							status: '待巩固'
						})
					})
				} else if (this.wrongPicks.length) {
					this.wrongPicks.forEach((w, i) => {
						const right = this.script.stages[w.stageIdx].choices.find(c => c.correct)
						log.unshift({
							id: 't' + Date.now() + '_' + i,
							icon: sceneInfo.icon || '⚠️',
							scene: this.sceneKey,
							sceneDesc: '翻车现场：' + w.choice.riskText + '（对方回应：「' + String(w.choice.feedback).slice(0, 46) + '…」）',
							advice: '正确应对：' + (right ? right.label.replace(/^[^一-龥]*/, '') + '——' + right.riskText : this.script.identify),
							law: lawRef ? lawRef.law : '关联法条：《刑法》第二百六十六条（诈骗罪）·《反电信网络诈骗法》',
							time: Date.now(),
							status: '待巩固'
						})
					})
				}
				addMistakes(log)
				this.scrollBottom()
			},
			// 提前结束：先让评估 Agent 复盘，再进报告页
			async endTraining() {
				if (this.finished) {
					this.goReport()
					return
				}
				uni.showLoading({ title: '评估 Agent 复盘中…', mask: true })
				await this.finish()
				uni.hideLoading()
				this.goReport()
			},
			scrollBottom() {
				setTimeout(() => {
					uni.pageScrollTo({ scrollTop: 999999, duration: 120 })
				}, 80)
			},
			goReport() {
				uni.navigateTo({ url: '/pages/report/report' })
			}
		}
	}
</script>

<style scoped>
	.chat-page {
		min-height: 100vh;
		background-color: var(--bg);
	}

	.risk-banner {
		background-color: rgba(245, 86, 78, 0.12);
		padding: 14rpx 32rpx;
	}

	.risk-text {
		color: var(--danger);
		font-size: 22rpx;
		line-height: 1.5;
	}

	.chat-body {
		background-color: var(--bg);
	}

	.chat-list {
		padding: 24rpx 28rpx 220rpx;
	}

	.row {
		display: flex;
		flex-direction: row;
		margin-bottom: 28rpx;
		align-items: flex-start;
	}

	.row--right {
		justify-content: flex-end;
	}

	.row--left {
		justify-content: flex-start;
	}

	.avatar--bot {
		background-color: rgba(91, 141, 239, 0.16);
		margin-right: 16rpx;
	}

	.avatar--me {
		background-color: var(--accent-soft);
		margin-left: 16rpx;
	}

	.bubble {
		max-width: 480rpx;
		padding: 22rpx 26rpx;
		border-radius: 20rpx;
		font-size: 28rpx;
		line-height: 1.5;
	}

	.bubble--bot {
		background-color: var(--card);
		color: var(--text);
		border-top-left-radius: 6rpx;
		box-shadow: var(--shadow);
	}

	.bubble--user {
		background-color: var(--green-bubble);
		color: var(--green-text);
		border-top-right-radius: 6rpx;
	}

	.typing-text {
		color: var(--text-2);
		font-size: 26rpx;
	}

	.tip-wrap {
		display: flex;
		flex-direction: row;
		justify-content: center;
		margin-bottom: 28rpx;
	}

	.tip-box {
		background-color: rgba(255, 159, 67, 0.14);
		border-radius: 16rpx;
		padding: 18rpx 26rpx;
		max-width: 580rpx;
	}

	.tip-text {
		color: var(--warn);
		font-size: 24rpx;
		line-height: 1.5;
	}

	/* 转账卡片 */
	.transfer-card {
		width: 440rpx;
		background-color: var(--card);
		border-radius: 20rpx;
		padding: 24rpx;
		box-shadow: var(--shadow);
		border: 1rpx solid rgba(245, 86, 78, 0.35);
	}

	.transfer-head {
		border-bottom: 1rpx solid var(--line);
		padding-bottom: 14rpx;
	}

	.transfer-title {
		font-size: 24rpx;
		color: var(--danger);
		font-weight: 700;
	}

	.transfer-amount {
		display: block;
		font-size: 52rpx;
		font-weight: 800;
		color: var(--text);
		margin: 18rpx 0 8rpx;
	}

	.transfer-row {
		margin-bottom: 6rpx;
	}

	.transfer-label {
		font-size: 24rpx;
	}

	.transfer-done {
		display: block;
		margin-top: 16rpx;
		font-size: 24rpx;
		color: var(--text-2);
	}

	/* 抉择按钮 */
	.choice-wrap {
		display: flex;
		flex-direction: column;
		margin-top: 8rpx;
	}

	.choice-btn {
		background-color: var(--card);
		border: 1rpx solid var(--accent);
		color: var(--accent);
		border-radius: 999rpx;
		padding: 22rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		font-weight: 600;
		margin-bottom: 18rpx;
	}

	.report-btn {
		background-image: var(--grad);
		border-radius: 999rpx;
		padding: 22rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.report-text {
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 700;
	}

	.chat-end-space {
		height: 30rpx;
	}

	/* 输入栏 */
	.input-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
		display: flex;
		flex-direction: row;
		align-items: center;
		background-color: var(--card);
		border-top: 1rpx solid var(--line);
		padding: 16rpx 24rpx;
		padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
	}

	.input {
		flex: 1;
		background-color: var(--card-2);
		border-radius: 999rpx;
		padding: 16rpx 28rpx;
		font-size: 28rpx;
		color: var(--text);
	}

	.send-btn {
		background-image: var(--grad);
		border-radius: 999rpx;
		padding: 16rpx 30rpx;
		margin-left: 16rpx;
	}

	.send-text {
		color: #FFFFFF;
		font-size: 26rpx;
		font-weight: 600;
	}

	.end-btn {
		border: 1rpx solid var(--accent);
		border-radius: 999rpx;
		padding: 16rpx 26rpx;
		margin-left: 14rpx;
	}

	.end-text {
		color: var(--accent);
		font-size: 26rpx;
		font-weight: 600;
	}
</style>
