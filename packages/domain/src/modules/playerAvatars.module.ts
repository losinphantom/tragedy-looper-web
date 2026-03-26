/**
 * PlayerAvatars Module — 玩家头像统一查询 API
 *
 * 数据驱动，不硬编码。未来可扩展为"更换头像"系统。
 */

// ── 座位元数据 ────────────────────────────────────────────────────────────────

export interface SeatMeta {
  /** 座位 ID */
  seatId: string;
  /** 显示名称 */
  displayName: string;
  /** 角色名 */
  roleName: string;
  /** 主色 CSS 类 (tailwind) */
  colorClass: string;
  /** 主色 (hex) */
  colorHex: string;
  /** 默认头像路径 */
  defaultAvatarPath: string;
  /** 默认立绘路径 */
  defaultPortraitPath: string;
}

const SEATS: SeatMeta[] = [
  {
    seatId: '0',
    displayName: '剧作家',
    roleName: 'Mastermind',
    colorClass: 'blood',
    colorHex: '#dc2626',
    defaultAvatarPath: '/assets/玩家头像/剧作家.png',
    defaultPortraitPath: '/assets/玩家立绘/剧作家.png',
  },
  {
    seatId: '1',
    displayName: '主角 1',
    roleName: 'Protagonist 1',
    colorClass: 'orange',
    colorHex: '#f97316',
    defaultAvatarPath: '/assets/玩家头像/主人公橙.png',
    defaultPortraitPath: '/assets/玩家立绘/主人公橙.png',
  },
  {
    seatId: '2',
    displayName: '主角 2',
    roleName: 'Protagonist 2',
    colorClass: 'emerald',
    colorHex: '#10b981',
    defaultAvatarPath: '/assets/玩家头像/主人公绿.png',
    defaultPortraitPath: '/assets/玩家立绘/主人公绿.png',
  },
  {
    seatId: '3',
    displayName: '主角 3',
    roleName: 'Protagonist 3',
    colorClass: 'blue',
    colorHex: '#3b82f6',
    defaultAvatarPath: '/assets/玩家头像/主人公蓝.png',
    defaultPortraitPath: '/assets/玩家立绘/主人公蓝.png',
  },
];

const SEAT_MAP = new Map(SEATS.map(s => [s.seatId, s]));

// ── 查询 API ────────────────────────────────────────────────────────────────

/** 获取座位元数据 */
export function getSeatMeta(seatId: string): SeatMeta | undefined {
  return SEAT_MAP.get(seatId);
}

/** 获取所有座位列表 */
export function getAllSeats(): SeatMeta[] {
  return SEATS;
}

/** 获取头像 URL（未来可从用户配置读取自定义头像） */
export function getSeatAvatarUrl(seatId: string): string {
  return SEAT_MAP.get(seatId)?.defaultAvatarPath || '/assets/玩家头像/剧作家.png';
}

/** 获取立绘 URL */
export function getSeatPortraitUrl(seatId: string): string {
  return SEAT_MAP.get(seatId)?.defaultPortraitPath || '/assets/玩家立绘/剧作家.png';
}

/** 获取座位显示名称 */
export function getSeatDisplayName(seatId: string): string {
  return SEAT_MAP.get(seatId)?.displayName || `Seat ${seatId}`;
}

/** 获取座位主色 hex */
export function getSeatColorHex(seatId: string): string {
  return SEAT_MAP.get(seatId)?.colorHex || '#64748b';
}
