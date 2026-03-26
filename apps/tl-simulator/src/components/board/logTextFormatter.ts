const CARD_COUNTER_RE = /^📘 (角色|地点)「(.+?)」受到 .+? 的影响：(.+?) ([+-]\d+)$/;
const CARD_MOVE_RE = /^📘 角色「(.+?)」受到 .+? 的影响：(.+?) → (.+)$/;
const CARD_NO_CHANGE_RE = /^📘 (角色|地点)「(.+?)」受到 .+? 的影响：本目标无变化$/;
const CARD_GENERIC_RE = /^📘 (角色|地点)「(.+?)」受到 .+? 的影响：(.+)$/;

function formatCardLog(rawText: string): string | null {
  const counterMatch = rawText.match(CARD_COUNTER_RE);
  if (counterMatch) {
    const [, targetType, targetName, tokenName, delta] = counterMatch;
    const owner = targetType === '地点' ? `${targetName}的` : `${targetName}的`;
    return `因为行动卡效果，${owner}${tokenName} ${delta}。`;
  }

  const moveMatch = rawText.match(CARD_MOVE_RE);
  if (moveMatch) {
    const [, targetName, _from, to] = moveMatch;
    return `因为行动卡效果，${targetName}移动到了${to}。`;
  }

  const noChangeMatch = rawText.match(CARD_NO_CHANGE_RE);
  if (noChangeMatch) {
    const [, _targetType, targetName] = noChangeMatch;
    return `因为行动卡效果，${targetName}没有发生可见变化。`;
  }

  const genericMatch = rawText.match(CARD_GENERIC_RE);
  if (!genericMatch) return null;

  const [, _targetType, targetName, reason] = genericMatch;
  if (reason.includes('抵消') || reason.includes('阻止')) {
    return `因为行动卡效果，${targetName}的效果被阻止了。`;
  }
  if (reason.includes('无效') || reason.includes('无法') || reason.includes('跳过')) {
    return `因为行动卡效果，${targetName}没有发生可见变化。`;
  }
  return `因为行动卡效果，${targetName}没有发生可见变化。`;
}

const GOODWILL_TOKEN_RE = /^📋 ([^（]+)(?:（.+?）)?使用友好能力：(.+?) ([+-]\d+) ?(不安|友好|密谋|希望|绝望)$/;
const GOODWILL_MOVE_RE = /^📋 ([^（]+)(?:（.+?）)?使用友好能力：(.+?) 移动至(?:相邻版图 )?(.+)$/;
const GOODWILL_DEATH_RE = /^(?:💀|📋) ([^（]+)(?:（.+?）)?使用友好能力：(.+?) 死亡$/;
const GOODWILL_REVIVE_RE = /^(?:✨|📋) ([^（]+)(?:（.+?）)?使用友好能力：(.+?) 复活(?:。)?$/;
const GOODWILL_REVEAL_RE = /^📋 ([^（]+)(?:（.+?）)?(?:使用友好能力：)?(.+?) (?:身份公开为 .+|的身份被公开：.+)$/;

function formatGoodwillLog(rawText: string): string | null {
  const tokenMatch = rawText.match(GOODWILL_TOKEN_RE);
  if (tokenMatch) {
    const [, sourceName, targetName, delta, tokenName] = tokenMatch;
    return `因为${sourceName}的友好能力，${targetName}的${tokenName} ${delta}。`;
  }

  const moveMatch = rawText.match(GOODWILL_MOVE_RE);
  if (moveMatch) {
    const [, sourceName, targetName, destination] = moveMatch;
    return `因为${sourceName}的友好能力，${targetName}移动到了${destination}。`;
  }

  const deathMatch = rawText.match(GOODWILL_DEATH_RE);
  if (deathMatch) {
    const [, sourceName, targetName] = deathMatch;
    return `因为${sourceName}的友好能力，${targetName}死亡了。`;
  }

  const reviveMatch = rawText.match(GOODWILL_REVIVE_RE);
  if (reviveMatch) {
    const [, sourceName, targetName] = reviveMatch;
    return `因为${sourceName}的友好能力，${targetName}复活了。`;
  }

  const revealMatch = rawText.match(GOODWILL_REVEAL_RE);
  if (revealMatch) {
    const [, sourceName, targetName] = revealMatch;
    return `因为${sourceName}的友好能力，${targetName}的身份被公开。`;
  }

  if (rawText.startsWith('📋 ') && rawText.includes('使用友好能力：')) {
    const sourceName = rawText
      .replace(/^📋 /, '')
      .split('使用友好能力：')[0]
      .replace(/（.+?）/g, '')
      .trim();
    return `因为${sourceName}的友好能力，没有观察到可见变化。`;
  }

  return null;
}

export function formatLogText(rawText: string): string {
  const cardText = formatCardLog(rawText);
  if (cardText) return cardText;

  const goodwillText = formatGoodwillLog(rawText);
  if (goodwillText) return goodwillText;

  const rules: Array<[RegExp, (...args: string[]) => string]> = [
    [/^📜 剧本已选定(?:（.*）)?$/, () => '剧本已选定。'],
    [/^👥 检测到 (\d+) 人模式(?:（.*）)?$/, (count) => `当前为${count}人模式。`],
    [/^🔄 人数模式调整 \d+人 → (\d+)人$/, (count) => `已切换为${count}人模式。`],
    [/^⚡ 已切换到结算模式$/, () => '已切换到结算模式。'],
    [/^🏖️ 已切换到桌游模拟模式$/, () => '已切换到桌游模拟模式。'],
    [/^▶ 行动卡结算开始$/, () => '行动卡开始结算。'],
    [/^✅ 行动卡结算完成 — (\d+) 个效果已处理$/, (count) => `行动卡结算完成，共处理 ${count} 个效果。`],
    [/^▶ 友好能力阶段$/, () => '友好能力阶段开始。'],
    [/^📣 队长声明使用友好能力: (.+)$/, (name) => `主人公希望发动${name}的友好能力。`],
    [/^✅ (.+?) 的友好能力生效$/, (name) => `${name}的友好能力发动了。`],
    [/^❌ (.+?) 的友好能力被拒绝$/, (name) => `主人公希望发动${name}的友好能力，但是被拒绝了。`],
    [/^📋 无合格友好能力$/, () => '今天没有可以发动的友好能力。'],
    [/^⏭️ 队长选择不使用友好能力$/, () => '今天没有可以发动的友好能力。'],
    [/^✋ (.+?) 拒绝了能力的发动$/, (name) => `${name}的友好能力没有发动。`],
    [/^今日无事件$/, () => '今天没有事件发生。'],
    [/^⚠️ 事件阶段 — 检查 (\d+) 个预定事件$/, (count) => `今天将检查 ${count} 个事件。`],
    [/^⚡ (?:群众)?事件发生(?:了)?！$/, () => '有事件发生了。'],
    [/^📋 事件未发生（.*）$/, () => '今天该事件没有发生。'],
    [/^── 第 (\d+) 天结束 ──$/, (day) => `第 ${day} 天结束。`],
    [/^⏳ (?:开局准备窗口|时间裂隙) — 主角讨论时间$/, () => '时间裂隙开始，主角团可以讨论。'],
    [/^🛡️ 本轮主人公免于死亡$/, () => '主人公这次免于死亡。'],
    [/^💀 你们死了，轮回立即结束$/, () => '主人公死亡，轮回结束。'],
    [/^⛔ 你们失败了，轮回立即结束$/, () => '轮回立即结束，主人公失败。'],
    [/^⛔ 你们失败了$/, () => '轮回结束，主人公失败。'],
    [/^─── 第 (\d+) 轮回失败 ───$/, (loop) => `第 ${loop} 轮回失败。`],
    [/^─── 第 (\d+) 轮回结束 ───$/, (loop) => `第 ${loop} 轮回结束。`],
    [/^🏆 全部猜对！主角团获胜！$/, () => '主角团获胜。'],
    [/^🎭 猜测失败，剧作家获胜！$/, () => '剧作家获胜。'],
    [/^═══ .*主角团获胜！═══$/, () => '主角团获胜。'],
    [/^═══ .*剧作家获胜！═══$/, () => '剧作家获胜。'],
    [/^═══ .*背叛者 ([ABC]) 获胜！═══$/, (seat) => `背叛者 ${seat} 获胜。`],
    [/^所有轮回已耗尽 — 剧作家获胜。$/, () => '剧作家获胜。'],
    [/^所有轮回已结束 — 进入最终决战。$/, () => '所有轮回结束，进入最终决战。'],
    [/^⏩ 主角选择跳过剩余轮回，直接进入最终猜测！$/, () => '主角团选择直接进入最终猜测。'],
    [/^🔮 最终猜测阶段 — 主角逐一猜测每个角色的身份$/, () => '所有轮回结束，进入最终决战。'],
    [/^ℹ️ 共 (\d+) 个角色需要猜测$/, (count) => `需要猜测 ${count} 个角色的身份。`],
  ];

  for (const [pattern, format] of rules) {
    const match = rawText.match(pattern);
    if (match) return format(...match.slice(1));
  }

  return rawText;
}
