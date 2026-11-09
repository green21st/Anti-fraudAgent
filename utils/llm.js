// ============================================================
// 大模型对话通道（说明书技术架构：DeepSeek API）
// 说明：默认走离线引擎；用户在「我的-对话引擎」填写 API Key 后，
//       自动优先调用大模型生成对话，失败则无感回落到离线引擎。
// ============================================================

const KEY = 'llm_config'

function readCfg() {
	try {
		const v = uni.getStorageSync(KEY)
		return (v && typeof v === 'object') ? v : null
	} catch (e) { return null }
}

export function getLLMConfig() {
	const c = readCfg() || {}
	return {
		apiKey: c.apiKey || '',
		baseUrl: c.baseUrl || 'https://api.deepseek.com',
		model: c.model || 'deepseek-flash'
	}
}

export function saveLLMConfig(cfg) {
	try { uni.setStorageSync(KEY, cfg) } catch (e) {}
}

export function clearLLMConfig() {
	try { uni.removeStorageSync(KEY) } catch (e) {}
}

export function hasLLM() {
	const c = readCfg()
	return !!(c && c.apiKey)
}

// 把用户画像转成给模型的自然语言描述
function profileText(p) {
	if (!p) return '（用户未填写画像）'
	const parts = []
	if (p.city) parts.push('城市：' + p.city)
	if (p.job) parts.push('职业：' + p.job)
	if (p.hobby) parts.push('兴趣爱好：' + p.hobby)
	if (p.emotion) parts.push('情感状态：' + p.emotion)
	if (p.family) parts.push('家庭状况：' + p.family)
	if (p.finance) parts.push('经济状况：' + p.finance)
	return parts.length ? parts.join('；') : '（用户未填写画像）'
}

/**
 * 生成对话
 * @param {Object} o
 *  o.sceneName 场景名 / o.persona 人设简述 / o.goals 目的链数组
 *  o.stage 当前目标阶段 / o.profile 用户画像
 *  o.history [{role:'user'|'assistant', content}] 最近若干轮
 *  o.userText 用户本轮发言
 * @returns {Promise<{ok:boolean, texts:string[]}>}
 */
// 骗子角色的系统提示词
function fraudPrompt(o) {
	const goals = (o.goals || []).map((g, i) => `${i + 1}. ${g}`).join('\n')
	const role = o.roleName
		? '你在本次对话中的具体身份：' + o.roleName + (o.roleDesc ? '（' + o.roleDesc + '）。' : '。') + '你只说自己这一环的话，不要替其他角色发言。'
		: ''
	return [
		'你正在参加「智盾反诈」的模拟反诈训练：你要扮演一名诈骗分子，对方是正在接受训练的普通用户。',
		'场景：' + o.sceneName + '。你的人设：' + (o.persona || '诈骗分子') + '。' + role,
		'你的目标链（按顺序推进，但不要机械照搬）：\n' + goals,
		'当前所处阶段：第 ' + ((o.stage || 0) + 1) + ' 阶段——「' + ((o.goals && o.goals[o.stage]) || (o.goals && o.goals[0]) || '建立信任') + '」。',
		'对方画像（首次对话时自然带入，不要生硬罗列）：' + profileText(o.profile),
		'',
		'硬性要求，逐条遵守：',
		'1. 只输出角色本人的话，不要旁白、不要解释、不要标注"骗子说"。',
		'2. 每次 1～3 句，口语化，像真实微信聊天，可少量使用语气词，但绝不能敷衍。',
		'3. 逐句理解对方上一句：他提问就正面回答（用符合人设的虚构细节回答，不能回避）；他质疑就先化解质疑；他拒绝就先接住情绪。回应完他的内容，再顺势推进当前目标。',
		'4. 每条回复都必须有明确目的：建立信任、制造危机、切断核实途径、索要账号/验证码，或催促转账。没有目的的寒暄一句都不要说。',
		'5. 严禁"哈哈""好的""嗯嗯""我知道了""您说得对"这类敷衍回复；严禁复述前面说过的话；不得连续两轮用相同句式开头。',
		'6. 被质疑或被点破时，绝不承认自己是骗子，要用委屈、愤怒、以退为进或反将一军的方式应对，并抓住机会推进目标。',
		'7. 结合对方画像说话：同城、同行业、同兴趣更容易拉近关系；经济条件好的可以放大金额，条件差的强调"小成本试水"。',
		'8. 使用规范简体中文，标点正确，不得出现错别字、繁体字或英文夹杂。',
		'9. 不出现真实机构全称、真实人名、真实账号，一律用"XX市""某平台"等虚构表述。'
	].join('\n')
}

// 救助 Agent 的系统提示词（正向角色，不诱导转账）
function rescuePrompt(o) {
	const info = o.info || {}
	return [
		'你正在「智盾反诈」App 的反诈救助对话中，扮演救助 Agent：专业、冷静、有共情，像真人说话，不像公告。',
		'对方是刚遭遇诈骗的受害者，情绪可能慌乱、自责或愤怒。系统目前掌握的案情（若与对方本轮说法冲突，一律以对方本轮说法为准，并顺势修正判断）：',
		'类型：' + (info.type || '未知') + '；转账时间：' + (info.time || '未知') + '；损失金额：' + (info.amount || '未知') + '；是否报警：' + (info.reported ? '已报警' : '未报警'),
		'对方画像：' + profileText(o.profile) + '（只在相关时自然带入，比如聊到家庭、收入时呼应，不要生硬罗列）',
		'',
		'要求：',
		'1. 先接住对方这句话里的具体内容：复述他刚说的关键事实（金额、时间、对方平台/账号、是否报警），让他感到你在听，而不是在背稿。',
		'2. 再给 1～2 个当下最紧急、最具体的动作（拨 96110 报转账卡号后 6 位、联系银行挂失、先保存哪几类证据……），不要一次把六步方案全倒出来。',
		'3. 对方补充了新信息（金额、时间、是否报警、诈骗类型）时，必须据此调整判断，并说明这对止付成功率和追损的影响。',
		'4. 不承诺一定追回，不编造法条与机构，不推荐任何收费的"追款/维权"机构。',
		'5. 每次 1～3 句，口语化、有温度；禁止用"好的""明白""我理解您的心情"这类空话开头，禁止重复上一轮的原句。',
		'6. 对方问与自救无关的闲聊时，简短回应后把话题拉回资金安全和报警处置。',
		'7. 使用规范简体中文，标点正确，不得出现错别字。'
	].join('\n')
}

// 统一的 Chat Completions 请求（uni.request 兼容 H5 / App / 微信小程序）
function requestChat(cfg, body, timeoutMs) {
	const ms = timeoutMs || 20000
	return new Promise((resolve) => {
		let done = false
		const finish = (r) => { if (!done) { done = true; resolve(r) } }
		const timer = setTimeout(() => finish(null), ms)
		try {
			uni.request({
				url: cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions',
				method: 'POST',
				timeout: ms,
				header: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + cfg.apiKey
				},
				data: body,
				success: (res) => { clearTimeout(timer); finish(res) },
				fail: () => { clearTimeout(timer); finish(null) }
			})
		} catch (e) {
			clearTimeout(timer)
			finish(null)
		}
	})
}

export function chatLLM(o) {
	const cfg = getLLMConfig()
	if (!cfg.apiKey) return Promise.resolve({ ok: false, texts: [] })

	const sys = o.systemPrompt || (o.mode === 'rescue' ? rescuePrompt(o) : fraudPrompt(o))

	const messages = [{ role: 'system', content: sys }]
	;(o.history || []).slice(-12).forEach(h => {
		if (h && h.content) messages.push({ role: h.role, content: h.content })
	})
	messages.push({ role: 'user', content: o.userText })

	const body = {
		model: cfg.model || 'deepseek-flash',
		messages,
		temperature: 0.85,
		max_tokens: o.maxTokens || 300,
		stream: false
	}

	return requestChat(cfg, body, 20000).then((res) => {
		if (!res || res.statusCode < 200 || res.statusCode >= 300) return { ok: false, texts: [] }
		const msg = res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message
		const clean = splitSentences(msg ? msg.content : '')
		return clean.length ? { ok: true, texts: clean } : { ok: false, texts: [] }
	})
}

// 评估 Agent 的系统提示词：通读整段对话后独立打分
function evalPrompt(o) {
	const dims = o.dims || []
	return [
		'你是「智盾反诈」训练里的评估 Agent，独立分析用户与诈骗分子的整段对话，不预设结论。',
		'场景：' + o.sceneName + '（' + (o.sceneType === 'multi' ? '多对一围猎' : '一对一诈骗') + '）',
		'用户画像：' + profileText(o.profile),
		'',
		'你要像真人评委一样通读完整对话，逐条判断用户的关键应对：转账/垫付/缴保证金、给验证码或密码、点链接、开屏幕共享、相信对方身份、主动质疑、拒绝、核实官方渠道、举报/报警等。',
		'评分必须有证据：引用用户原话里的具体表述；用户没说过的话不能当成他说过；只评价用户本人，不评价骗子。',
		'',
		'只输出一个 JSON 对象，不要 markdown、不要任何解释，格式如下：',
		'{',
		'  "score": 0到100的整数，',
		'  "grade": "优秀|良好|及格|不及格",',
		'  "summary": "90字以内，点出用户最关键的1个正确应对和1个风险点",',
		'  "dims": { 每个维度名: 0到100的整数 },',
		'  "advices": ["2条具体、可执行的改进建议"],',
		'  "turns": [{"text":"用户原话前30字","score":0到100,"verdict":"一句话判词"}],',
		'  "mistakes": [{"sceneDesc":"用户的失误表述及被如何诱导（60字内）","advice":"正确应对（40字内）"}]',
		'}',
		'dims 必须且只能包含这些维度名：' + dims.join('、') + '。',
		'评分口径：识破并拒绝/举报 85-100；保持质疑但没举报 70-84；犹豫或部分配合 50-69；转账/给验证码/共享屏幕 0-49。',
		'turns 只列用户发言，最多 12 条，按时间先后。',
		'mistakes 只列真实失误，没有就输出空数组。'
	].join('\n')
}

function parseJSON(text) {
	let t = (text || '').trim()
	t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
	const s = t.indexOf('{')
	const e = t.lastIndexOf('}')
	if (s >= 0 && e > s) t = t.slice(s, e + 1)
	try { return JSON.parse(t) } catch (err) { return null }
}

function clampScore(v) {
	const n = Math.round(Number(v))
	if (!isFinite(n)) return 60
	return Math.max(0, Math.min(100, n))
}

/**
 * 评估 Agent（大模型版）
 * @param {Object} o
 *  o.sceneName / o.sceneType('1v1'|'multi') / o.profile
 *  o.history [{role:'user'|'assistant', content}] 完整对话
 *  o.baseline 规则引擎初判（可选，作为参考）
 *  o.dims 六维名称数组
 * @returns {Promise<{ok:boolean, report:Object|null}>}
 */
export function evalLLM(o) {
	const cfg = getLLMConfig()
	if (!cfg.apiKey) return Promise.resolve({ ok: false, report: null })
	const dims = o.dims || []
	const transcript = (o.history || []).slice(-60)
		.map(h => (h.role === 'user' ? '用户：' : '对方：') + String(h.content || ''))
		.join('\n')
	let userContent = '完整对话如下：\n' + transcript
	if (o.baseline) {
		userContent += '\n\n规则引擎的初判（仅供参考，可以推翻）：综合 ' + o.baseline.score + ' 分；' +
			(o.baseline.dims || []).map(d => d.name + ' ' + d.score).join('、')
	}
	userContent += '\n\n请输出评估 JSON。'
	const body = {
		model: cfg.model || 'deepseek-flash',
		messages: [
			{ role: 'system', content: evalPrompt({ sceneName: o.sceneName, sceneType: o.sceneType, profile: o.profile, dims }) },
			{ role: 'user', content: userContent }
		],
		temperature: 0.3,
		max_tokens: 1200,
		stream: false,
		response_format: { type: 'json_object' }
	}
	return requestChat(cfg, body, 25000).then((res) => {
		if (!res || res.statusCode < 200 || res.statusCode >= 300) return { ok: false, report: null }
		const msg = res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message
		const parsed = parseJSON(msg ? msg.content : '')
		if (!parsed) return { ok: false, report: null }
		const score = clampScore(parsed.score)
		const dimList = dims.map((name) => {
			const raw = parsed.dims ? parsed.dims[name] : undefined
			return { name, score: clampScore(raw === undefined ? score : raw) }
		})
		return {
			ok: true,
			report: {
				score,
				grade: parsed.grade || (score >= 90 ? '优秀' : score >= 75 ? '良好' : score >= 60 ? '及格' : '不及格'),
				summary: String(parsed.summary || ''),
				dims: dimList,
				advices: (parsed.advices || []).filter(Boolean).slice(0, 4),
				turns: (parsed.turns || []).map(t => ({
					text: String(t.text || '').slice(0, 60),
					score: clampScore(t.score),
					verdict: String(t.verdict || '')
				})).slice(0, 12),
				mistakes: (parsed.mistakes || []).map(m => ({
					sceneDesc: String(m.sceneDesc || '').slice(0, 100),
					advice: String(m.advice || '').slice(0, 100)
				})).slice(0, 6)
			}
		}
	})
}

// 把模型输出拆成 1-2 条消息，模拟真人连发
function splitSentences(text) {
	let t = (text || '').replace(/\r/g, '').trim()
	if (!t) return []
	t = t.replace(/^(骗子|对方|诈骗分子)[:：]\s*/, '')
	// 去掉模型偶尔加的引号与旁白括号外的解释
	const parts = t.split(/\n+/).map(s => s.trim()).filter(Boolean)
	const out = []
	parts.forEach(p => {
		if (p.length <= 90) { out.push(p); return }
		const m = p.match(/^(.{20,90}?[。！？!?])(.*)$/)
		if (m) { out.push(m[1].trim()); if (m[2].trim()) out.push(m[2].trim()) }
		else out.push(p)
	})
	return out.slice(0, 2)
}
