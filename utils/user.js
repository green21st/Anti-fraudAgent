// ============ 用户体系：注册登录 / 个人画像 / 训练记录（本地存储） ============

const KEY_ACCOUNTS = 'user_accounts'
const KEY_CURRENT = 'current_user'

function read(key, def) {
	try {
		const v = uni.getStorageSync(key)
		return (v === '' || v === null || v === undefined) ? def : v
	} catch (e) { return def }
}
function save(key, val) {
	try { uni.setStorageSync(key, val) } catch (e) {}
}

// ---- 账号 ----
export function register(nickname, password) {
	nickname = (nickname || '').trim()
	if (!nickname) return { ok: false, msg: '请输入昵称' }
	if (!password || password.length < 4) return { ok: false, msg: '密码至少 4 位' }
	const accounts = read(KEY_ACCOUNTS, [])
	if (accounts.some(a => a.name === nickname)) return { ok: false, msg: '该昵称已注册，请直接登录' }
	accounts.push({ name: nickname, pwd: password })
	save(KEY_ACCOUNTS, accounts)
	save(KEY_CURRENT, { name: nickname, guest: false })
	return { ok: true }
}

export function login(nickname, password) {
	nickname = (nickname || '').trim()
	if (!nickname || !password) return { ok: false, msg: '请输入昵称和密码' }
	const accounts = read(KEY_ACCOUNTS, [])
	const acc = accounts.find(a => a.name === nickname)
	if (!acc) return { ok: false, msg: '账号不存在，请先注册' }
	if (acc.pwd !== password) return { ok: false, msg: '密码错误' }
	save(KEY_CURRENT, { name: nickname, guest: false })
	return { ok: true }
}

export function loginGuest() {
	save(KEY_CURRENT, { name: '游客', guest: true })
}

export function logout() {
	try { uni.removeStorageSync(KEY_CURRENT) } catch (e) {}
}

// 修改昵称：同步迁移该用户的画像与训练记录存储键
export function rename(newName) {
	newName = (newName || '').trim()
	if (!newName) return { ok: false, msg: '昵称不能为空' }
	const u = currentUser()
	if (!u) return { ok: false, msg: '未登录' }
	if (newName === u.name) return { ok: true }
	const accounts = read(KEY_ACCOUNTS, [])
	if (accounts.some(a => a.name === newName)) return { ok: false, msg: '该昵称已被占用' }
	const oldName = u.name
	// 迁移账号条目
	const acc = accounts.find(a => a.name === oldName)
	if (acc) acc.name = newName
	save(KEY_ACCOUNTS, accounts)
	// 迁移画像与记录
	const profile = read('profile_' + oldName, {})
	save('profile_' + newName, profile)
	const records = read('records_' + oldName, [])
	save('records_' + newName, records)
	try {
		uni.removeStorageSync('profile_' + oldName)
		uni.removeStorageSync('records_' + oldName)
	} catch (e) {}
	save(KEY_CURRENT, { name: newName, guest: u.guest })
	return { ok: true }
}

export function currentUser() {
	return read(KEY_CURRENT, null)
}

// ---- 个人画像（说明书 4.2：城市 / 职业 / 兴趣爱好 / 情感状态 / 家庭状况 / 经济状况） ----
export const PROFILE_KEYS = [
	{ key: 'city', icon: '📍', label: '城市', placeholder: '如：杭州', tip: '你常驻的城市，骗子会用“本地岗位/本地门店”拉近距离' },
	{ key: 'job', icon: '💼', label: '职业', placeholder: '如：大二学生 / 销售', tip: '职业或身份，骗子会据此设计兼职、内推、退款等剧本' },
	{ key: 'hobby', icon: '🎨', label: '兴趣爱好', placeholder: '如：打篮球、追剧', tip: '爱好用来制造“同好”人设，越具体越容易被利用' },
	{ key: 'emotion', icon: '💗', label: '情感状态', placeholder: '如：单身 / 恋爱中 / 已婚', tip: '情感状态会影响“杀猪盘”接近你的方式' },
	{ key: 'family', icon: '👨‍👩‍👧', label: '家庭状况', placeholder: '如：和父母同住 / 独居 / 有小孩', tip: '可写和谁一起住、是否独居、是否需要照顾老人或孩子' },
	{ key: 'finance', icon: '💰', label: '经济状况', placeholder: '如：生活费紧张 / 有存款 / 收入稳定', tip: '可写收入来源、大致存款、是否有房贷或贷款' }
]

export function getProfile() {
	const u = currentUser()
	if (!u) return {}
	return read('profile_' + u.name, {})
}

export function saveProfile(profile) {
	const u = currentUser()
	if (!u) return
	save('profile_' + u.name, profile)
}

export function hasProfile() {
	const p = getProfile()
	return PROFILE_KEYS.some(k => ((p[k.key] || '') + '').trim() !== '')
}

// ---- 训练记录（按用户隔离） ----
export function addTrainingRecord(rec) {
	const u = currentUser()
	if (!u) return
	const key = 'records_' + u.name
	const list = read(key, [])
	list.unshift({ ...rec, time: rec.time || formatTime(new Date()) })
	save(key, list.slice(0, 100))
}

export function getRecords() {
	const u = currentUser()
	if (!u) return []
	return read('records_' + u.name, [])
}

// 统计：训练场次 / 真实平均分 / 识破场次（得分≥75 视为成功识破）
export function getStats() {
	const list = getRecords()
	if (!list.length) return { total: 0, avg: 0, cracked: 0 }
	const sum = list.reduce((s, r) => s + (r.score || 0), 0)
	return {
		total: list.length,
		avg: Math.round(sum / list.length),
		cracked: list.filter(r => (r.score || 0) >= 75).length
	}
}

// ---- 错题本（按用户隔离，新账号默认为空） ----
export function getMistakes() {
	const u = currentUser()
	if (!u) return []
	return read('mistakes_' + u.name, [])
}

export function addMistakes(list) {
	const u = currentUser()
	if (!u || !list || !list.length) return
	const key = 'mistakes_' + u.name
	const cur = read(key, [])
	save(key, list.concat(cur).slice(0, 60))
}

// ---- 最近一次评估报告（按用户隔离） ----
export function getLastReport() {
	const u = currentUser()
	if (!u) return null
	return read('report_' + u.name, null)
}

export function saveLastReport(report) {
	const u = currentUser()
	if (!u) return
	save('report_' + u.name, report)
}

// ---- 对话回溯（按用户隔离，保存最近 20 场训练的完整对话） ----
export function saveChatLog(log) {
	const u = currentUser()
	if (!u || !log) return
	const key = 'chatlogs_' + u.name
	const list = read(key, [])
	list.unshift({ ...log, time: log.time || formatTime(new Date()) })
	save(key, list.slice(0, 20))
}

export function getChatLogs() {
	const u = currentUser()
	if (!u) return []
	return read('chatlogs_' + u.name, [])
}

function formatTime(d) {
	const p = n => (n < 10 ? '0' + n : '' + n)
	return `${d.getMonth() + 1}-${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
