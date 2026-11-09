<template>
	<view class="page rescue-page" :class="{ 'page--dark': isDark }">
		<nav-bar title="法律自救顾问" :dark="isDark" @toggle="toggleTheme" />

		<!-- 救助热线 -->
		<view class="hotline-row">
			<view
				v-for="h in hotlines"
				:key="h.num"
				class="card hotline-card"
				hover-class="press"
				@tap="callPhone(h.num)"
			>
				<text class="hotline-icon">{{ h.icon }}</text>
				<text class="hotline-num">{{ h.num }}</text>
				<text class="muted hotline-label">{{ h.label }}</text>
				<text class="muted hotline-desc">{{ h.desc }}</text>
			</view>
		</view>

		<!-- 追问进度 -->
		<view class="progress-card">
			<text class="progress-text">🔄 自救进度：{{ currentStep > 0 ? '已进行到第 ' + currentStep + '/6 步' : '请先描述案情，我会为你定制方案' }}</text>
		</view>

		<view class="rescue-body">
			<view class="rescue-list">
				<!-- 顾问对话 -->
				<view v-for="(m, i) in messages" :key="i" :id="'r' + i">
					<view class="row" :class="m.type === 'user' ? 'row--right' : 'row--left'">
						<view v-if="m.type !== 'user'" class="avatar-circle avatar--bot">
							<text>⚖️</text>
						</view>
						<view class="bubble" :class="m.type === 'user' ? 'bubble--user' : 'bubble--bot'">
							<text>{{ m.text }}</text>
						</view>
						<view v-if="m.type === 'user'" class="avatar-circle avatar--me">
							<text>🧑</text>
						</view>
					</view>
				</view>
				<view v-if="thinking" class="row row--left">
					<view class="avatar-circle avatar--bot">
						<text>⚖️</text>
					</view>
					<view class="bubble bubble--bot">
						<text class="typing-text">正在整理建议…</text>
					</view>
				</view>

				<!-- 六步方案 -->
				<view class="card steps-card">
					<text class="sec">🧭 被骗后六步自救方案</text>
					<view
						v-for="s in steps"
						:key="s.step"
						class="step-row"
						hover-class="press"
						@tap="tapStep(s)"
					>
						<view class="step-num" :class="{ 'step-num--done': s.step <= currentStep }">
							<text class="step-num-text">{{ s.step <= currentStep ? '✓' : s.step }}</text>
						</view>
						<view class="step-body">
							<text class="step-title">{{ s.title }}</text>
							<text class="muted step-desc">{{ s.desc }}</text>
						</view>
					</view>
				</view>

				<!-- 案件档案（方案生成后显示） -->
			<view v-if="planned" class="card dossier-card">
				<text class="sec">📁 案件档案</text>
				<view class="dossier-row">
					<text class="dossier-label">诈骗类型</text>
					<text class="dossier-val">{{ session.info.type || '-' }}</text>
				</view>
				<view class="dossier-row">
					<text class="dossier-label">转账时间</text>
					<text class="dossier-val">{{ session.info.time || '-' }}</text>
				</view>
				<view class="dossier-row">
					<text class="dossier-label">损失情况</text>
					<text class="dossier-val">{{ session.info.amount || '-' }}</text>
				</view>
				<view class="dossier-row">
					<text class="dossier-label">报警状态</text>
					<text class="dossier-val">{{ session.info.reported ? '✅ 已报警' : '⏳ 尚未报警' }}</text>
				</view>
				<view class="risk-judge" :class="riskLevel">
					<text class="risk-text">🔎 风险研判：{{ riskText }}</text>
				</view>
			</view>

			<!-- 设备安全检查 -->
			<view v-if="planned" class="card security-card">
				<text class="sec">📱 设备安全检查（立即执行）</text>
				<view class="security-item">
					<text class="security-icon">🔴</text>
					<text class="security-text">立即关闭与骗子的<strong>屏幕共享/远程控制</strong>，对方可能正在监控你的操作</text>
				</view>
				<view class="security-item">
					<text class="security-icon">🗑️</text>
					<text class="security-text">卸载对方让你安装的涉诈APP（非应用商店来源软件）</text>
				</view>
				<view class="security-item">
					<text class="security-icon">🚫</text>
					<text class="security-text">检查是否被设置<strong>呼叫转移</strong>，如有立即取消（拨号 ##002#）</text>
				</view>
				<view class="security-item">
					<text class="security-icon">🔒</text>
					<text class="security-text">修改手机银行、支付APP密码，开启拦截境外号码</text>
				</view>
			</view>

			<!-- 二次诈骗预警 -->
			<view v-if="planned" class="card scam-card">
				<text class="sec">⚠️ 二次诈骗预警</text>
				<text class="scam-text">网上自称"黑客追款""维权律师先收费""内部关系解冻"的，<strong>100% 是二次诈骗！</strong></text>
				<text class="scam-text">追损唯一正规途径：<strong>报警 → 立案 → 警方冻结资金后依法返还</strong>。</text>
			</view>

			<!-- 免责声明 -->
				<view class="disclaimer">
					<text class="disclaimer-text">⚠️ 免责声明：本内容仅为一般性法律自救指引，不构成正式法律意见。具体案件请以公安机关、司法机关及执业律师意见为准。</text>
				</view>
				<view class="rescue-end-space"></view>
			</view>
		</view>

		<!-- 输入栏 -->
		<view class="input-bar">
			<input
				v-model="draft"
				class="input"
				placeholder="描述你的情况，如：我刚被骗了钱…"
				confirm-type="send"
				@confirm="send"
			/>
			<view class="send-btn" hover-class="press" @tap="send">
				<text class="send-text">发送</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { rescueSteps, hotlines } from '@/utils/data.js'
	import { RescueAgent } from '@/utils/agents.js'
	import { RESCUE_SCRIPT } from '@/utils/scripts.js'
	import { hasLLM, chatLLM } from '@/utils/llm.js'
	import { getProfile } from '@/utils/user.js'

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
				steps: rescueSteps,
				hotlines,
				currentStep: 0,
				messages: [],
				session: null,
				planned: false,
				draft: '',
				script: RESCUE_SCRIPT,
				scriptIndex: -1,
				expect: '',
				scriptDone: false,
				scriptAbort: false,
				thinking: false
			}
		},
		onLoad() {
			this.session = RescueAgent.createSession()
			// 演示用：预设剧本中的案情信息，让案件档案与剧本一致
			this.session.info = {
				type: '虚假投资理财（冒充投资导师＋虚假投资平台）',
				time: '约30分钟前（提现失败，尚未缴纳保证金）',
				amount: '约 20,000 元（另被索要 8,000 元保证金）',
				reported: false
			}
			this.session.stage = 4
			this.startScript()
		},
		computed: {
			riskLevel() {
				const info = (this.session && this.session.info) || {}
				const urgent = /(分钟|刚|不久|一会|半小时)/.test(info.time || '')
				if (urgent && !info.reported) return 'risk--high'
				if (info.reported) return 'risk--mid'
				return 'risk--low'
			},
			riskText() {
				const info = (this.session && this.session.info) || {}
				const urgent = /(分钟|刚|不久|一会|半小时)/.test(info.time || '')
				if (urgent && !info.reported) return '黄金止付期内，立即拨打 96110 申请紧急止付，成功率最高！'
				if (info.reported) return '已报案，配合警方调查，保存好证据等待追损结果。'
				return '请尽快携带证据到属地派出所报案，越早报警冻结资金希望越大。'
			}
		},
		methods: {
			startScript() {
				setTimeout(() => this.showStep(0), 600)
			},
			showStep(i) {
				if (this.scriptAbort) return
				const steps = (this.script && this.script.steps) || []
				if (i >= steps.length) {
					this.scriptDone = true
					this.scrollBottom()
					return
				}
				this.scriptIndex = i
				this.expect = ''
				this.scriptDone = false
				const step = steps[i]
				const bots = step.bot || []
				let delay = 700
				bots.forEach((t) => {
					setTimeout(() => {
						if (this.scriptAbort) return
						this.messages.push({ type: 'bot', text: t })
						this.scrollBottom()
					}, delay)
					delay += 1100
				})
				setTimeout(() => {
					if (this.scriptAbort) return
					// 到达第三幕：开放六步方案、案件档案与设备安全检查
					if (i >= this.script.emergencyAt) {
						this.planned = true
						if (this.currentStep < 1) this.currentStep = 1
					}
					// 剧本里用户说出“已经报警”之后，档案同步为已报警
					if (i >= this.script.reportedAt + 1) {
						this.session.info.reported = true
					}
					this.expect = step.expect || ''
					this.scriptDone = !!(step.done && !step.expect)
					// 该步没有用户台词、也不是结束幕 → 自动续播下一步
					if (!this.expect && !this.scriptDone) {
						setTimeout(() => this.showStep(i + 1), 1400)
					}
					this.scrollBottom()
				}, delay + 300)
			},
			// 从用户这句话里补充/修正案情，让后续建议真正围绕他的情况
			updateInfo(text) {
				if (!this.session) this.session = RescueAgent.createSession()
				const info = this.session.info || (this.session.info = {})
				const t = text || ''
				const amt = t.match(/(\d[\d,]*(?:\.\d+)?)\s*(万|千|百|元|块)/)
				if (amt) info.amount = '约 ' + amt[1].replace(/,/g, '') + amt[2]
				if (/(已报警|报过警|报过案|报了案|已报案|打过110|做完笔录|受案回执)/.test(t)) info.reported = true
				else if (/(还没报警|还没报|没有报警|没报警|未报警|没报案|未报案)/.test(t)) info.reported = false
				if (/(刚刚|刚才|刚转|几分钟|半小时|一小时|今天)/.test(t)) info.time = '刚发生不久'
				else if (/(昨天|前天|几天前|一周|上个星期|上个月)/.test(t)) info.time = '已过去较久'
				const typeMap = [
					{ k: /(刷单|返利|做任务)/, v: '刷单返利' },
					{ k: /(客服|退款|理赔)/, v: '冒充客服退款' },
					{ k: /(投资|理财|炒股|导师|平台)/, v: '虚假投资理财' },
					{ k: /(贷款|额度|解冻金)/, v: '网络贷款诈骗' },
					{ k: /(公检法|检察院|安全账户)/, v: '冒充公检法' },
					{ k: /(杀猪盘|网恋|交友)/, v: '杀猪盘' },
					{ k: /(熟人|领导|亲戚|借钱)/, v: '冒充熟人借钱' },
					{ k: /(招聘|求职|HR|面试|入职)/, v: '求职诈骗' }
				]
				const hit = typeMap.find(x => x.k.test(t))
				if (hit) info.type = hit.v
				// 案情要素齐了就展示档案、设备检查与二次诈骗预警
				if (info.type) this.planned = true
			},
			async send() {
				const text = (this.draft || '').trim()
				if (!text || this.thinking) return
				// 剧本阶段：说得接近剧本台词才继续播放；否则说明用户真在提问，转为真实咨询
				if (this.script && !this.scriptDone) {
					if (this.expect && similar(text, this.expect)) {
						this.draft = ''
						this.messages.push({ type: 'user', text })
						this.expect = ''
						this.scrollBottom()
						this.showStep(this.scriptIndex + 1)
						return
					}
					// 用户没按剧本走，说明是在问自己的案子：清空演示案情，按他的真实描述重建
					this.scriptAbort = true
					this.script = null
					this.scriptDone = true
					this.session.info = { type: '', time: '', amount: '', reported: false }
					this.session.stage = 4
					this.planned = false
				}
				this.draft = ''
				this.messages.push({ type: 'user', text })
				this.scrollBottom()
				this.updateInfo(text)
				// 救助 Agent：追问式状态机 → 还原案情后输出定制六步方案
				const result = RescueAgent.reply(this.session, text)
				let texts = result.texts || []
				// 接入大模型：始终按真实案情 + 本轮这句话生成专属回应，规则只做兜底
				if (hasLLM()) {
					this.thinking = true
					this.scrollBottom()
					const history = this.messages.slice(0, -1)
						.filter(m => m.type === 'user' || m.type === 'bot')
						.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }))
						.slice(-12)
					const res = await chatLLM({
						mode: 'rescue',
						info: this.session.info,
						profile: getProfile(),
						history,
						userText: text,
						maxTokens: 400
					})
					this.thinking = false
					if (res && res.ok && res.texts && res.texts.length) {
						texts = res.texts
						if (result.plan) {
							texts = texts.concat(['👇 我已经把你的情况整理成六步自救方案，请按下方卡片逐条打卡，完成一步点一步。'])
						}
					}
				}
				let delay = 700
				texts.forEach((t) => {
					setTimeout(() => {
						this.messages.push({ type: 'bot', text: t })
						this.scrollBottom()
					}, delay)
					delay += 1100
				})
				// 方案生成后，开放六步打卡
				if (result.plan) {
					setTimeout(() => {
						this.planned = true
						this.currentStep = 1
						if (!hasLLM()) {
							this.messages.push({ type: 'bot', text: '👇 现在请按下方【六步自救方案】逐条打卡操作，完成一步点一步。' })
						}
						this.scrollBottom()
					}, delay + 200)
				}
			},
			tapStep(s) {
				if (s.step > this.currentStep + 1 && !this.planned) {
					uni.showToast({ title: '请先完成前面的步骤', icon: 'none' })
					return
				}
				if (s.step > this.currentStep) {
					this.currentStep = s.step
				}
				this.messages.push({ type: 'user', text: '第' + s.step + '步：' + s.title })
				setTimeout(() => {
					this.messages.push({
						type: 'bot',
						text: '【第' + s.step + '步 · ' + s.title + '】' + s.desc +
							(s.step < 6 ? ' 完成后可点击下方下一步继续。' : ' 六步全部完成！后续请配合警方调查，耐心等待追损结果。')
					})
					this.scrollBottom()
				}, 500)
				this.scrollBottom()
			},
			callPhone(num) {
				uni.showModal({
					title: '拨打 ' + num,
					content: '即将呼出该求助热线，确认继续？',
					success: (res) => {
						if (res.confirm) {
							uni.makePhoneCall({ phoneNumber: num, fail: () => {} })
						}
					}
				})
			},
			scrollBottom() {
				setTimeout(() => {
					uni.pageScrollTo({ scrollTop: 999999, duration: 120 })
				}, 80)
			}
		}
	}
</script>

<style scoped>
	.rescue-page {
		min-height: 100vh;
		background-color: var(--bg);
	}

	.hotline-row {
		display: flex;
		flex-direction: row;
		padding: 16rpx 32rpx 0;
	}

	.hotline-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24rpx 12rpx;
		margin-right: 20rpx;
	}

	.hotline-icon {
		font-size: 44rpx;
	}

	.hotline-num {
		font-size: 36rpx;
		font-weight: 800;
		color: var(--accent);
		margin-top: 8rpx;
	}

	.hotline-label {
		font-size: 22rpx;
		margin-top: 4rpx;
	}

	.hotline-desc {
		font-size: 20rpx;
		margin-top: 4rpx;
	}

	.progress-card {
		background-color: rgba(124, 58, 237, 0.1);
		border-left: 6rpx solid var(--accent);
		border-radius: 8rpx;
		margin: 20rpx 32rpx 0;
		padding: 16rpx 20rpx;
	}

	.progress-text {
		color: var(--text);
		font-size: 25rpx;
		font-weight: 600;
	}

	.rescue-body {
		background-color: var(--bg);
	}

	.rescue-list {
		padding: 24rpx 28rpx 220rpx;
	}

	.row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-bottom: 26rpx;
	}

	.row--right {
		justify-content: flex-end;
	}

	.row--left {
		justify-content: flex-start;
	}

	.avatar--bot {
		background-color: rgba(124, 58, 237, 0.14);
		margin-right: 16rpx;
	}

	.avatar--me {
		background-color: var(--accent-soft);
		margin-left: 16rpx;
	}

	.bubble {
		max-width: 490rpx;
		padding: 22rpx 26rpx;
		border-radius: 20rpx;
		font-size: 27rpx;
		line-height: 1.6;
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

	.steps-card {
		margin: 8rpx 0 24rpx;
	}

	.step-row {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		padding: 18rpx 0;
		border-bottom: 1rpx solid var(--line);
	}

	.step-num {
		width: 52rpx;
		height: 52rpx;
		border-radius: 50%;
		background-color: var(--card-2);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;
		flex-shrink: 0;
	}

	.step-num--done {
		background-image: var(--grad);
	}

	.step-num-text {
		color: var(--text);
		font-size: 26rpx;
		font-weight: 700;
	}

	.step-num--done .step-num-text {
		color: #FFFFFF;
	}

	.step-body {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.step-title {
		font-size: 28rpx;
		font-weight: 700;
		color: var(--text);
	}

	.step-desc {
		font-size: 24rpx;
		margin-top: 6rpx;
		line-height: 1.5;
	}

	.disclaimer {
		background-color: rgba(255, 159, 67, 0.1);
		border-radius: 16rpx;
		padding: 20rpx 24rpx;
	}

	.disclaimer-text {
		color: var(--warn);
		font-size: 22rpx;
		line-height: 1.6;
	}

	.rescue-end-space {
		height: 30rpx;
	}

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
		padding: 14rpx 28rpx;
		margin-left: 16rpx;
	}

	.send-text {
		color: #FFFFFF;
		font-size: 26rpx;
		font-weight: 600;
	}

	/* 案件档案 */
	.dossier-card {
		margin-bottom: 24rpx;
	}

	.dossier-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 12rpx 0;
		border-bottom: 1rpx dashed var(--line);
	}

	.dossier-row:last-of-type {
		border-bottom: none;
	}

	.dossier-label {
		font-size: 26rpx;
		color: var(--text-2);
	}

	.dossier-val {
		font-size: 27rpx;
		color: var(--text);
		font-weight: 600;
		text-align: right;
		max-width: 70%;
	}

	.risk-judge {
		margin-top: 18rpx;
		border-radius: 14rpx;
		padding: 18rpx 22rpx;
	}

	.risk--high {
		background-color: rgba(245, 86, 78, 0.12);
	}

	.risk--mid {
		background-color: rgba(245, 158, 11, 0.12);
	}

	.risk--low {
		background-color: rgba(34, 197, 94, 0.12);
	}

	.risk-text {
		font-size: 26rpx;
		color: var(--text);
		line-height: 1.5;
	}

	/* 设备安全检查 */
	.security-card {
		margin-bottom: 24rpx;
	}

	.security-item {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		margin-top: 14rpx;
	}

	.security-icon {
		font-size: 28rpx;
		margin-right: 14rpx;
		flex-shrink: 0;
	}

	.security-text {
		font-size: 25rpx;
		line-height: 1.55;
		color: var(--text);
	}

	/* 二次诈骗预警 */
	.scam-card {
		margin-bottom: 24rpx;
		background-color: rgba(245, 86, 78, 0.08);
		border: 1rpx solid rgba(245, 86, 78, 0.3);
	}

	.scam-text {
		display: block;
		font-size: 25rpx;
		line-height: 1.6;
		color: var(--text);
		margin-top: 10rpx;
	}
</style>
