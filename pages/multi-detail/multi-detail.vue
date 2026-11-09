<template>
	<view class="page chat-page" :class="{ 'page--dark': isDark }">
		<nav-bar :title="'私聊 · ' + focusName" :dark="isDark" @toggle="toggleTheme" />

		<!-- 实时信号捕获面板（仅主犯陈逸风显示） -->
		<scroll-view v-if="isScammer" scroll-x class="signal-scroll">
			<view class="signal-row">
				<view v-for="(s, i) in signals" :key="i" class="signal-chip">
					<text class="signal-icon">{{ s.icon }}</text>
					<text class="signal-text">{{ s.text }}</text>
					<text class="signal-level" :class="s.level === '高危' ? 'signal-level--high' : 'signal-level--mid'">{{ s.level }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 聊天区域 -->
		<view class="chat-body">
			<view class="chat-list">
				<view v-for="(m, i) in messages" :key="m.id" :id="'g' + i">
					<view class="row">
						<view class="avatar-circle" :class="{ 'avatar--mark': marked === m.sender }">
							<text>{{ person(m.sender).avatar }}</text>
						</view>
						<view class="msg-body">
							<view class="msg-head">
								<text class="msg-name" :class="{ 'msg-name--me': m.sender === 'me' }">{{ person(m.sender).name }}</text>
								<view
									v-if="m.sender !== 'me' && m.sender !== 'sys' && !marked && !(script && !scriptDone)"
									class="mark-mini"
									hover-class="press"
									@tap="mark(m.sender)"
								>
									<text class="mark-mini-text">标记骗子</text>
								</view>
							</view>
							<view class="bubble" :class="m.sender === 'me' ? 'bubble--me' : (m.sender === 'sys' ? 'bubble--sys' : 'bubble--other')">
								<text>{{ m.text }}</text>
							</view>
						</view>
					</view>
				</view>
				<view v-if="thinking" class="row">
					<view class="avatar-circle">
						<text>{{ chat ? chat.avatar : '👤' }}</text>
					</view>
					<view class="msg-body">
						<view class="msg-head">
							<text class="msg-name">{{ focusName }}</text>
						</view>
						<view class="bubble bubble--other">
							<text class="typing-text">对方正在输入…</text>
						</view>
					</view>
				</view>
				<view class="chat-end-space"></view>
			</view>
		</view>

		<!-- 底部操作栏 -->
		<view class="bottom-bar">
			<view v-if="!marked" class="chat-input-row">
				<input
					v-model="draft"
					class="msg-input"
					placeholder="说点什么…"
					confirm-type="send"
					@confirm="send"
				/>
				<view class="send-btn" hover-class="press" @tap="send">
					<text class="send-text">发送</text>
				</view>
			</view>
			<view v-else-if="!canReport" class="mark-result mark-result--bad">
				<text class="mark-result-text">{{ markResult }}</text>
			</view>
			<view v-else class="mark-result mark-result--ok">
				<text class="mark-result-text">{{ markResult }}</text>
			</view>
			<view v-if="canReport" class="report-btn" hover-class="press" @tap="goReport">
				<text class="report-text">查看评估报告</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { multiScenarios } from '@/utils/data.js'
	import { getJobChat } from '@/utils/scripts.js'
	import { ReplyAgent, EvalAgent, DIMS, personaInfo } from '@/utils/agents.js'
	import { addTrainingRecord, addMistakes, saveLastReport, saveChatLog, currentUser, getProfile } from '@/utils/user.js'
	import { chatLLM, evalLLM, hasLLM } from '@/utils/llm.js'

	// 判断用户输入与剧本台词是否基本一致（去标点后按包含关系/字符重合度判定）
	function similar(a, b) {
		const norm = s => (s || '').replace(/[\s，。！？、,.!?~～…“”‘’（）()【】\[\]:：;；]/g, '')
		const A = norm(a)
		const B = norm(b)
		if (!A || !B) return false
		if (B.indexOf(A.slice(0, 8)) >= 0 || A.indexOf(B.slice(0, 8)) >= 0) return true
		const set = {}
		for (let i = 0; i < B.length; i++) set[B[i]] = true
		let hit = 0
		for (let i = 0; i < A.length; i++) if (set[A[i]]) hit++
		return hit / A.length >= 0.6
	}

	export default {
		data() {
			return {
				contacts: [],
				messages: [],
				signals: [],
				marked: '',
				markResult: '',
				canReport: false,
				focusId: 'chen',
				focusName: '多人找骗子',
				chat: null,
				isScammer: false,
				session: null,
				events: [],
				wrongMarks: [],
				evaling: false,
				draft: '',
				msgSeq: 0,
				profile: {},
				history: [],
				thinking: false,
				cfg: null,
				sceneName: '求职诈骗',
				script: null,
				scriptIndex: -1,
				expect: '',
				scriptDone: false,
				scriptAbort: false
			}
		},
		onLoad(opt) {
			const scene = (opt && opt.scene) ? decodeURIComponent(opt.scene) : '求职诈骗'
			const cfg = multiScenarios[scene] || multiScenarios['求职诈骗']
			this.cfg = cfg
			this.sceneName = scene
			this.contacts = cfg.contacts
			const focus = (opt && opt.focus) ? opt.focus : cfg.scammerId
			this.focusId = focus
			const chat = cfg.multiChats[focus] || cfg.multiChats[cfg.scammerId]
			this.chat = chat
			this.focusName = chat.name
			this.isScammer = chat.type === 'scammer'
			const u = currentUser()
			const p = getProfile()
			this.profile = Object.assign({}, p, { nickname: u ? u.name : '' })
			if (this.isScammer) {
				this.signals = cfg.riskSignals
				this.session = ReplyAgent.createSession(cfg.personaKey, this.profile)
			}
			// 求职诈骗场景：按剧本逐句播放，用户按剧本台词自然回答即可推进
			if (scene === '求职诈骗') {
				const sc = getJobChat(focus)
				if (sc && sc.steps && sc.steps.length) {
					this.script = sc
					this.startScript()
					return
				}
			}
			chat.messages.forEach((m, idx) => {
				setTimeout(() => {
					this.messages.push({ id: ++this.msgSeq, sender: m.sender, text: m.text })
					this.history.push({ role: m.sender === 'me' ? 'user' : 'assistant', content: m.text })
					this.scrollBottom()
				}, 400 + idx * 700)
			})
		},
		methods: {
			person(id) {
				if (id === 'me') return { name: '我', avatar: '🧑' }
				if (id === 'sys') return { name: '剧情提示', avatar: '🎬' }
				const c = this.contacts.find(x => x.id === id)
				if (c) return c
				return { name: this.focusName, avatar: this.chat ? this.chat.avatar : '👤' }
			},
			mark(id) {
				if (this.marked) return
				this.marked = id
				const cfg = this.cfg
				let ev
				if (id === cfg.scammerId) {
					ev = { tendency: '理性', score: 95, dim: '诈骗信号识别' }
					this.markResult = cfg.markCorrect
					this.canReport = true
					uni.showToast({ title: '识破成功', icon: 'success' })
				} else if (cfg.shillIds.indexOf(id) !== -1) {
					ev = { tendency: '犹豫', score: 55, dim: '诈骗信号识别' }
					const name = this.person(id).name
					this.markResult = cfg.markShill.replace('{name}', name)
					this.wrongMarks.push({
						sceneDesc: '把「' + name + '」误认成主谋——TA 其实是团伙里配合演戏的托',
						advice: '多对一围猎里，群里主动帮你说话、催你交钱的人往往是同伙，别只看谁最凶，要看谁在推流程'
					})
					setTimeout(() => { this.marked = '' }, 2500)
					uni.showToast({ title: 'TA是团伙成员，主谋另有其人', icon: 'none' })
				} else {
					ev = { tendency: '上当', score: 12, dim: '诈骗信号识别' }
					const name = this.person(id).name
					this.markResult = cfg.markWrong.replace('{name}', name)
					this.wrongMarks.push({
						sceneDesc: '把团伙成员「' + name + '」当成可信联系人，等于替骗子背书',
						advice: '任何拉群后催你交入职费/保证金/垫付的人都要先停手，通过官方渠道核实公司与企业微信主体'
					})
					setTimeout(() => { this.marked = '' }, 2500)
					uni.showToast({ title: '标记错误，再想想', icon: 'none' })
				}
				this.events.push(ev)
			},
			startScript() {
				// 剧本只在内部驱动对话，不向用户展示任何旁白或剧情提示
				setTimeout(() => this.showStep(0), 400)
			},
			showStep(i) {
				if (this.scriptAbort) return
				const steps = (this.script && this.script.steps) || []
				if (i >= steps.length) {
					this.scriptDone = true
					// 剧本演完即可随时结束训练、查看评估
					this.canReport = true
					return
				}
				this.scriptIndex = i
				this.expect = ''
				this.scriptDone = false
				const step = steps[i]
				const bots = step.bot || []
				let delay = 300
				bots.forEach(b => {
					const from = (typeof b === 'string') ? this.focusId : (b.from || this.focusId)
					// from 为 sys 的舞台旁白不进入聊天记录
					if (from === 'sys') return
					const text = (typeof b === 'string') ? b : b.text
					setTimeout(() => {
						if (this.scriptAbort) return
						this.messages.push({ id: ++this.msgSeq, sender: from, text })
						this.history.push({ role: 'assistant', content: text })
						this.scrollBottom()
					}, delay)
					delay += 1100
				})
				setTimeout(() => {
					if (this.scriptAbort) return
					this.expect = step.expect || ''
					this.scriptDone = !!(step.done && !step.expect)
					if (this.scriptDone) this.canReport = true
					this.scrollBottom()
				}, delay + 200)
			},
			async send() {
				const text = (this.draft || '').trim()
				if (!text || this.thinking) return
				// 剧本阶段：说得接近剧本台词才继续播放；否则视为用户真实提问，转入自由对话
				if (this.script && !this.scriptDone) {
					if (this.expect && similar(text, this.expect)) {
						this.draft = ''
						this.messages.push({ id: ++this.msgSeq, sender: 'me', text })
						this.history.push({ role: 'user', content: text })
						this.expect = ''
						this.scrollBottom()
						this.showStep(this.scriptIndex + 1)
						return
					}
					this.scriptAbort = true
					this.script = null
					this.scriptDone = true
				}
				this.draft = ''
				this.messages.push({ id: ++this.msgSeq, sender: 'me', text })
				this.history.push({ role: 'user', content: text })
				this.scrollBottom()
				// 聊够 6 轮也可以结束训练、让评估 Agent 打分
				if (!this.canReport && this.messages.filter(m => m.sender === 'me').length >= 6) {
					this.canReport = true
				}
				if (this.isScammer && this.session) {
					const result = ReplyAgent.reply(this.session, text)
					this.events.push(result.ev)
					let texts = result.texts || []
					if (hasLLM()) {
						this.thinking = true
						this.scrollBottom()
						const info = personaInfo(this.cfg.personaKey)
						const res = await chatLLM({
							sceneName: this.cfg.llmScene,
							persona: info.intro,
							goals: info.goals,
							stage: this.session.stage,
							profile: this.profile,
							roleName: this.chat.name,
							roleDesc: this.chat.role,
							history: this.history.slice(-12, -1),
							userText: text
						})
						this.thinking = false
						if (res && res.ok && res.texts && res.texts.length) texts = res.texts
					}
					let delay = 400
					texts.forEach((t) => {
						setTimeout(() => {
							this.messages.push({ id: ++this.msgSeq, sender: this.focusId, text: t })
							this.history.push({ role: 'assistant', content: t })
							this.scrollBottom()
						}, delay)
						delay += 1100
					})
					if (result.fled) {
						setTimeout(() => {
							this.messages.push({ id: ++this.msgSeq, sender: 'sys', text: '🚫 对方察觉你已识破，已将你拉黑。' })
							this.scrollBottom()
						}, delay + 400)
					}
				} else {
					const replies = (this.chat && this.chat.replies) || []
					let texts = []
					// 同伙/其他角色也走大模型：按其具体身份，真正针对用户这句话作答
					if (hasLLM()) {
						this.thinking = true
						this.scrollBottom()
						const scam = (this.cfg.contacts || []).find(c => c.type === 'scammer')
						const boss = scam ? scam.name : '王经理'
						const res = await chatLLM({
							sceneName: this.cfg.llmScene,
							persona: '你是' + this.chat.name + '（' + this.chat.role + '），是诈骗团伙成员，正在配合主谋“' + boss + '”演戏。',
							goals: ['稳住对方情绪，强调流程正规', '把对方留在当前环节，继续配合操作'],
							stage: 0,
							profile: this.profile,
							roleName: this.chat.name,
							roleDesc: this.chat.role,
							history: this.history.slice(-12, -1),
							userText: text
						})
						this.thinking = false
						if (res && res.ok && res.texts && res.texts.length) texts = res.texts
					}
					if (!texts.length) {
						const hit = replies.find(r => r.keys.some(k => text.indexOf(k) !== -1))
						texts = [hit ? hit.text : (this.chat.fallback || '您先按刚才说的流程操作，有问题我这边随时回您。')]
					}
					let delay = 400
					texts.forEach((t) => {
						setTimeout(() => {
							this.messages.push({ id: ++this.msgSeq, sender: this.focusId, text: t })
							this.history.push({ role: 'assistant', content: t })
							this.scrollBottom()
						}, delay)
						delay += 1100
					})
				}
			},
			scrollBottom() {
				setTimeout(() => {
					uni.pageScrollTo({ scrollTop: 999999, duration: 120 })
				}, 80)
			},
			async goReport() {
				if (this.evaling) return
				this.evaling = true
				// 规则引擎先出一版初判（离线兜底）
				const baseline = Object.assign(
					EvalAgent.buildReport(this.cfg.llmScene, 'multi', this.events),
					{ scene: this.sceneName }
				)
				let report = baseline
				// 完整对话：多人场景把发言人名字带进记录，评估 Agent 才能分清谁在说话
				const history = this.messages
					.filter(m => m.sender !== 'sys')
					.map(m => ({
						role: m.sender === 'me' ? 'user' : 'assistant',
						content: (m.sender === 'me' ? '' : this.person(m.sender).name + '：') + m.text
					}))
				saveChatLog({
					scene: this.sceneName,
					sceneType: 'multi',
					messages: this.messages
						.filter(m => m.sender !== 'sys')
						.map(m => ({
							role: m.sender === 'me' ? 'user' : 'bot',
							name: m.sender === 'me' ? '我' : this.person(m.sender).name,
							text: m.text
						}))
				})
				saveLastReport(baseline)
				if (hasLLM()) {
					uni.showLoading({ title: '评估 Agent 复盘中…', mask: true })
					const res = await evalLLM({
						sceneName: this.cfg.llmScene,
						sceneType: 'multi',
						profile: this.profile,
						history,
						baseline,
						dims: DIMS
					})
					uni.hideLoading()
					if (res && res.ok && res.report) {
						report = Object.assign({}, res.report, {
							scene: this.sceneName,
							sceneType: 'multi',
							time: baseline.time,
							engine: 'llm'
						})
						saveLastReport(report)
					}
				}
				addTrainingRecord({ scene: this.sceneName, score: report.score, grade: report.grade, time: report.time })
				// 错题本：优先模型判定的失误，其次本地标记失误
				const log = []
				const picks = (report.mistakes && report.mistakes.length)
					? report.mistakes
					: this.wrongMarks
				picks.forEach((c, i) => {
					log.push({
						id: 'm' + Date.now() + '_' + i,
						icon: '🕸️',
						scene: this.sceneName,
						sceneDesc: c.sceneDesc,
						advice: c.advice,
						law: '关联法条：《刑法》第二百六十六条（诈骗罪）·《反电信网络诈骗法》第三十八条',
						time: Date.now(),
						status: '待巩固'
					})
				})
				addMistakes(log)
				this.evaling = false
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

	.signal-scroll {
		white-space: nowrap;
		background-color: var(--bg);
		flex-shrink: 0;
	}

	.signal-row {
		display: flex;
		flex-direction: row;
		padding: 16rpx 28rpx;
	}

	.signal-chip {
		display: flex;
		flex-direction: row;
		align-items: center;
		background-color: var(--card);
		border-radius: 999rpx;
		padding: 12rpx 22rpx;
		margin-right: 16rpx;
		box-shadow: var(--shadow);
	}

	.signal-icon {
		font-size: 26rpx;
		margin-right: 8rpx;
	}

	.signal-text {
		font-size: 22rpx;
		color: var(--text);
	}

	.signal-level {
		font-size: 20rpx;
		margin-left: 10rpx;
		font-weight: 700;
	}

	.signal-level--high {
		color: var(--danger);
	}

	.signal-level--mid {
		color: var(--warn);
	}

	.chat-body {
		background-color: var(--bg);
	}

	.chat-list {
		padding: 24rpx 28rpx 240rpx;
	}

	.row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-bottom: 30rpx;
	}

	.avatar--mark {
		border: 3rpx solid var(--danger);
	}

	.msg-body {
		flex: 1;
		margin-left: 18rpx;
		display: flex;
		flex-direction: column;
	}

	.msg-head {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.msg-name {
		font-size: 22rpx;
		color: var(--text-2);
	}

	.msg-name--me {
		color: var(--accent);
		font-weight: 700;
	}

	.mark-mini {
		margin-left: 16rpx;
		background-color: rgba(245, 86, 78, 0.12);
		border-radius: 999rpx;
		padding: 8rpx 22rpx;
		flex-shrink: 0;
	}

	.mark-mini-text {
		color: var(--danger);
		font-size: 23rpx;
		font-weight: 600;
	}

	.bubble {
		max-width: 520rpx;
		padding: 20rpx 26rpx;
		border-radius: 20rpx;
		font-size: 27rpx;
		line-height: 1.5;
		margin-top: 8rpx;
	}

	.bubble--other {
		background-color: var(--card);
		color: var(--text);
		border-top-left-radius: 6rpx;
		box-shadow: var(--shadow);
	}

	.bubble--me {
		background-color: var(--green-bubble);
		color: var(--green-text);
		border-top-right-radius: 6rpx;
	}

	.typing-text {
		color: var(--text-2);
		font-size: 26rpx;
	}

	.bubble--sys {
		background-color: rgba(20, 160, 120, 0.10);
		color: var(--text-2);
		font-size: 25rpx;
		font-style: italic;
		border-radius: 16rpx;
	}

	.chat-end-space {
		height: 30rpx;
	}

	.bottom-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 99;
		background-color: var(--card);
		border-top: 1rpx solid var(--line);
		padding: 20rpx 28rpx;
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	}

	.chat-input-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.msg-input {
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

	.mark-result {
		border-radius: 16rpx;
		padding: 18rpx;
	}

	.mark-result--ok {
		background-color: rgba(34, 197, 94, 0.12);
	}

	.mark-result--bad {
		background-color: rgba(245, 86, 78, 0.12);
	}

	.mark-result-text {
		font-size: 24rpx;
		line-height: 1.5;
		color: var(--text);
	}

	.report-btn {
		margin-top: 16rpx;
		background-image: var(--grad);
		border-radius: 999rpx;
		padding: 18rpx 0;
		display: flex;
		justify-content: center;
	}

	.report-text {
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 700;
	}
</style>
