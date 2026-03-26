import type { TragedySetRecord } from '../dictionary';

export const TRAGEDY_SET_MODULE_IDS: Record<string, string> = {
  first_steps: 'first-steps',
  basic_tragedy: 'basic-tragedy',
  midnight_zone: 'midnight-zone',
  mystery_circle: 'mystery-circle',
  haunted_stage_again: 'haunted-stage-again',
  weird_mythology: 'weird-mythology',
  another_horizon_revised: 'another-horizon-revised',
  last_liar: 'last-liar',
  basic_tragedy_old: 'basic-tragedy-old',
  haunted_stage: 'haunted-stage',
  another_horizon: 'another-horizon',
  supernatural_tragedy: 'supernatural-tragedy',
  echoing_love_a: 'echoing-love-a',
  old_fashion: 'old-fashion',
  sin_city: 'sin-city',
  unheard_malice: 'unheard-malice',
};

export const TRAGEDY_SETS: Record<string, TragedySetRecord> = {
  first_steps: {
    id: 'first_steps',
    label: {
      'zh-CN': 'First Steps',
      en: 'FS',
    },
    subplotCount: 1,
    supportsFinalGuess: false,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['murder_plan', 'light_of_the_avenger', 'a_place_to_protect', 'shadow_of_the_ripper', 'a_hideous_script', 'an_unsettling_rumor'],
    availableRoleIds: ['key_person', 'brain', 'killer', 'cultist', 'friend', 'serial_killer', 'conspiracy_theorist', 'curmudgeon'],
    availableIncidentIds: ['murder', 'hospital_incident', 'spreading', 'missing_person', 'increasing_unease', 'suicide', 'faraway_murder'],
    uiSurface: {
      entryPoints: [
        { label: '主棋盘', value: '角色状态、高亮与卡牌结算反馈', tone: 'loop' },
        { label: '交互侧栏', value: '能力 / 友好 / 事件的非阻塞操作流', tone: 'gold' },
        { label: '右侧情报栏', value: '剧本规则、事件日程与公开信息入口', tone: 'emerald' },
      ],
    },
  },
  basic_tragedy: {
    id: 'basic_tragedy',
    label: {
      'zh-CN': 'Basic Tragedy X',
      en: 'BTX',
    },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['murder_plan', 'the_sealed_item', 'sign_with_me', 'change_of_future', 'giant_time_bomb', 'circle_of_friends', 'an_unsettling_rumor', 'a_love_affair', 'paranoia_virus', 'the_hidden_freak', 'threads_of_fate', 'unknown_factor_x'],
    availableRoleIds: ['key_person', 'brain', 'killer', 'cultist', 'time_traveler', 'friend', 'factor', 'conspiracy_theorist', 'serial_killer', 'witch', 'loved_one', 'lover'],
    availableIncidentIds: ['murder', 'hospital_incident', 'spreading', 'missing_person', 'butterfly_effect', 'foul_evil', 'increasing_unease', 'suicide', 'faraway_murder'],
    uiSurface: {
      emphasis: 'premium',
      summary: 'BTX 的蝴蝶效应、事件链路与最终决战已提升为显性前端流程，不再只剩日志提示。',
      entryPoints: [
        { label: '主棋盘', value: '蝴蝶效应目标、高亮与最终决战前置反馈', tone: 'loop' },
        { label: '交互侧栏', value: '能力 / 友好 / 事件 / 蝴蝶效应统一接线', tone: 'gold' },
        { label: '最终决战', value: 'BTX 关键流程在前端具备完整入口', tone: 'blood' },
      ],
    },
  },
  midnight_zone: {
    id: 'midnight_zone',
    label: { 'zh-CN': 'Midnight Zone', en: 'MZ' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['the_sealed_item_mz', 'top_secret_report', 'a_mans_battle', 'the_creeping_claws', 'bonds_of_karma', 'spiral_of_love_and_hate', 'witches_tea_party', 'dice_of_the_gods', 'x_factor_anomaly', 'death_reality_show', 'disconnect_of_hearts', 'song_of_destruction'],
    availableRoleIds: ['key_person', 'brain', 'cultist', 'ninja', 'friend', 'serial_killer', 'conspiracy_theorist', 'compulsive', 'magician', 'factor', 'witch', 'immortal', 'prophet'],
    availableIncidentIds: ['serial_murder', 'suicide', 'confession', 'breaking_the_board', 'faked_suicide', 'hospital_incident', 'forged_incident', 'riot', 'increasing_unease', 'missing_person', 'conspiracy_activity'],
    uiSurface: {
      summary: 'MZ 的地点型事件与扩展规则有了统一入口，避免机制已实现却前端失声。',
      entryPoints: [
        { label: '主棋盘', value: '地点目标、群众事件与关键对象高亮', tone: 'loop' },
        { label: '交互侧栏', value: '复杂事件目标与模组能力裁定', tone: 'gold' },
        { label: '右侧情报栏', value: 'Ex / 特殊规则 / 事件记录的持续可视化', tone: 'violet' },
      ],
    },
    specialRules: [
      {
        title: { 'zh-CN': '牺牲者', en: 'Victim' },
        rules: [
          { id: 'victim', timing: '', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '放置在版图上的[密谋]视作身份为平民的尸体。\n(如果其被复活，则从版图上移除)' } }
        ]
      },
      {
        title: { 'zh-CN': '群众事件', en: 'Crowd Incident' },
        rules: [
          { id: 'crowd_incident', timing: '', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '群众事件的当事人并非1名角色，而是指定了1块版图，所指定版图中的所有群众即为事件的当事人。\n(例：「诅咒活化」当事人被指定为「学校群众」)。\n当版图中有着等于或超过事件规定的尸体数量时，事件就会发生。' } }
        ]
      },
      {
        title: { 'zh-CN': '诅咒', en: 'Curse' },
        rules: [
          { id: 'curse', timing: '每天的回合结束阶段', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '诅咒牌使用Ex牌来表示，在每天的回合结束阶段，所有诅咒牌必须分别依照所处状态决定效果并同时进行处理。\n(该处理优先于其余所有处理)' } },
          { id: 'curse_ground', timing: '诅咒牌位于版图上 (地缚灵)', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '选择同区域的1名角色，将诅咒牌堆叠在该名角色身上。' } },
          { id: 'curse_attached', timing: '诅咒牌位于卡牌上 (附身)', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '无论卡牌的生死状态，尝试杀害带有诅咒牌的卡牌。随后，无论该卡牌在处理后是否依然生存，均将诅咒牌取下，放置于该卡牌所在的版图上。' } }
        ]
      }
    ]
  },
  mystery_circle: {
    id: 'mystery_circle',
    label: { 'zh-CN': 'Mystery Circle', en: 'MC' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['murder_plan_mc', 'spiderweb_of_incidents', 'plan_on_a_tightrope', 'dark_school', 'strychnine_tincture', 'the_hidden_freak_mc', 'panic_in_ward', 'smell_of_gunpowder', 'i_am_detective', 'fools_dance', 'absolute_will', 'twins_trick'],
    availableRoleIds: ['key_person', 'killer', 'brain', 'poisoner', 'fool', 'conspiracy_theorist', 'friend', 'serial_killer', 'paranoiac', 'psychiatrist', 'detective', 'compulsive', 'twins'],
    availableIncidentIds: ['serial_murder', 'omen', 'bizarre_murder', 'terrorist_attack', 'increasing_unease', 'faked_suicide', 'hospital_incident', 'suspicious_letter', 'silver_bullet', 'suicide', 'blockade'],
    uiSurface: {
      entryPoints: [
        { label: '主棋盘', value: '角色状态、Ex 相关反馈与高危事件聚焦', tone: 'loop' },
        { label: '交互侧栏', value: '事件裁定与能力目标选择', tone: 'gold' },
        { label: '右侧情报栏', value: '模组状态与事件推进追踪', tone: 'emerald' },
      ],
    },
  },
  haunted_stage_again: {
    id: 'haunted_stage_again',
    label: { 'zh-CN': 'Haunted Stage A', en: 'HSA' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['noble_bloodline', 'the_sacrifices', 'beast_of_the_moonlit_night', 'nightmare_in_the_fog', 'living_corpses_in_the_tomb', 'cursed_land', 'crowd_incident', 'panic_party', 'a_love_affair_hsa', 'witches_curse', 'crisis_of_the_girl', 'conspiracy_of_monsters', 'panic_and_paranoia', 'the_one_who_wont_listen'],
    availableRoleIds: ['key_person', 'vampire', 'werewolf', 'nightmare', 'ghost', 'paper_tiger', 'conspiracy_theorist', 'serial_killer', 'coward', 'witch', 'lover', 'loved_one', 'zombie'],
    availableIncidentIds: ['blasphemy_murder', 'night_of_madness', 'increasing_unease', 'missing_person', 'curse_activation', 'foul_evil', 'overflowing_filth', 'word_curse', 'isolation', 'apocalypse_of_the_dead', 'funeral'],
    uiSurface: {
      entryPoints: [
        { label: '主棋盘', value: '尸体、诅咒与移动结果可见化', tone: 'loop' },
        { label: '交互侧栏', value: '能力 / 事件接线，不再只靠日志说明', tone: 'gold' },
        { label: '右侧情报栏', value: 'EX 门槛与事件记录常驻显示', tone: 'violet' },
      ],
    },
  },
  weird_mythology: {
    id: 'weird_mythology',
    label: { 'zh-CN': 'Weird Mythology', en: 'WM' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['the_sealed_item', 'closed_door_of_old_god', 'plan_of_the_madmen', 'darkness_lurking_in_city', 'a_hideous_script_wm', 'secret_society', 'conspiracy_of_the_gods', 'the_hidden_freak_wm', 'mystery_circle_ritual', 'curse_of_the_old_god', 'unseen_things'],
    availableRoleIds: ['key_person', 'cultist', 'brain', 'killer', 'conspiracy_theorist', 'friend', 'serial_killer', 'investigator', 'sister', 'author', 'god', 'apostle'],
    availableIncidentIds: ['serial_murder', 'suicide', 'confession', 'missing_person', 'suspicious_letter', 'increasing_unease', 'hospital_incident', 'faraway_murder', 'forged_incident', 'bloody_ritual', 'sign_of_the_end'],
    uiSurface: {
      entryPoints: [
        { label: '主棋盘', value: '旧印 EX 状态与关键角色反馈', tone: 'violet' },
        { label: '交互侧栏', value: '能力 / 事件处理保持盘面可见', tone: 'gold' },
        { label: '最终决战', value: '最终猜测链路保留完整前端入口', tone: 'blood' },
      ],
    },
    specialRules: [
      {
        title: { 'zh-CN': '旧日魔术', en: 'Eldritch Magic' },
        rules: [
          { id: 'ex1', timing: '第1天的回合开始阶段', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': 'EX 1+ 感应咒文\n队长可以选择任意1名角色，并在该角色身上放置2枚友好指示物。' } },
          { id: 'ex2', timing: '轮回结束时', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': 'EX 2+ 先祖记忆\n可以得知规则X1的规则名。' } },
          { id: 'ex3', timing: '', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': 'EX 3+ 旧印\n同时放置2张或以上[禁止密谋]时，不会无效化。' } },
          { id: 'ex4', timing: '回合结束阶段时', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': 'EX 4+ 发狂\n回合结束阶段时，主人公死亡。轮回结束时，失去所有剩余轮回，直接进入最终决战。\n对知识的严重亵渎终于导致主人公们堕入疯狂的深渊。' } }
        ]
      }
    ]
  },
  another_horizon_revised: {
    id: 'another_horizon_revised',
    label: { 'zh-CN': 'Another Horizon R', en: 'AHR' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['the_locked_future', 'fairy_tale_killer', 'mother_goose_mystery', 'dimension_fusion', 'illusory_world', 'dr_jekyll_and_mr_hyde', 'devil_plays_the_flute', 'puppet_strings', 'alice_in_wonderland', 'beyond_the_world_line', 'unspeakable_monster', 'paranoia_virus_expanded'],
    availableRoleIds: ['key_person', 'obsessive', 'marionette', 'storyteller', 'lullaby', 'dimension_traveler', 'brain', 'fragment', 'serial_killer', 'pied_piper', 'conspiracy_theorist', 'evangelist', 'alice'],
    availableIncidentIds: ['impulse_murder', 'dimension_shift', 'dimension_warp', 'dimension_fault', 'lost_item', 'imaginary_incident', 'last_will', 'hospital_incident', 'singularity', 'light_in_the_gap', 'darkness_of_despair'],
    uiSurface: {
      summary: 'AHR 的世界线、EX 与希望/绝望状态被整理成可持续读面的前端表面。',
      entryPoints: [
        { label: '主棋盘', value: '世界线、目标高亮与对象状态联动', tone: 'violet' },
        { label: '交互侧栏', value: '可变能力与模组裁定流统一接线', tone: 'gold' },
        { label: '右侧情报栏', value: 'EX / 希望绝望 / 已公开身份的持续读面', tone: 'emerald' },
      ],
      features: {
        worldLineFromExParity: true,
      },
    },
    specialRules: [
      {
        title: { 'zh-CN': '表世界与里世界', en: 'Front World and Back World' },
        rules: [
          { id: 'world_shift_1', timing: '每轮轮回开始时', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '每轮轮回开始时EX槽为0。根据目前EX槽的奇偶性判定世界线，偶数代表当前位于表世界，奇数代表位于里世界。' } },
          { id: 'world_shift_2', timing: '当天的回合结束阶段开始时', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '如果当天进行过世界移动（无论几次），在当天的回合结束阶段开始时，提升1点EX槽。（优先于杀人狂等强制判定）\n除了模组中提到的世界移动之外，每轮限1次的友好能力在正常处理完毕后，也会进行世界移动。' } },
          { id: 'world_shift_3', timing: '在里世界', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '指示物效果按如下替换：\n通过友好指示物数量判定事件是否发生；\n通过不安指示物数量判定是否能够使用友好能力。' } }
        ]
      },
      {
        title: { 'zh-CN': '傀儡无视友好', en: 'Puppet Ignores Goodwill' },
        rules: [
          { id: 'puppet_ignores_goodwill', timing: '剧作家能力阶段', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '无视友好特性的一种，在此基础上，剧作家可以在剧作家能力阶段使用带有该特性的角色的友好能力（需满足对应的指示物数量条件）。此时，剧作家必须明确声明使用能力的角色和目标。' } }
        ]
      },
      {
        title: { 'zh-CN': '可变身份', en: 'Variable Role' },
        rules: [
          { id: 'variable_role', timing: '最终决战时', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '在规则与身份一览表中，如果某条规则中带有表/里字样，则代表在同1名角色上分配了A/B身份，该卡牌在表世界为A，在里世界为B，最终决战时需要明确指出该角色表里两个世界的身份。' } }
        ]
      }
    ]
  },
  last_liar: {
    id: 'last_liar',
    label: { 'zh-CN': 'Last Liar', en: 'LL' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [4],
    availablePlotIds: ['ll_final_plan', 'll_sealed_end', 'll_rebellious_world', 'll_devils_script', 'll_giant_time_bomb_z', 'll_true_monster', 'll_myth_collector', 'll_i_am_the_detective', 'll_beyond_world_line', 'll_x_factor', 'll_sns_panic', 'll_fabricated_secret'],
    availableRoleIds: ['key_person', 'killer', 'brain', 'causal_fragment', 'witch', 'factor', 'serial_killer', 'watcher', 'influencer', 'conspiracy_theorist', 'secret_key', 'eccentric'],
    availableIncidentIds: ['increasing_unease', 'murder', 'proxy', 'hospital_incident', 'sudden_change', 'spreading', 'last_will', 'missing_person', 'confession', 'light_of_hope', 'darkness_of_despair'],
    uiSurface: {
      summary: 'LL 的背叛者入口、侦探记录与特殊胜利条件有了独立前端落点。',
      entryPoints: [
        { label: '主棋盘', value: '最终决战、关键目标与状态断点可见', tone: 'loop' },
        { label: '交互侧栏', value: '能力 / 事件 / 裁定流程不再隐于日志', tone: 'gold' },
        { label: '右侧情报栏', value: '背叛者 Ex 牌、特殊胜利条件与侦探记录', tone: 'blood' },
      ],
      features: {
        playerExAssignment: true,
        betrayerVictoryConditions: true,
        detectiveGuesses: true,
      },
    },
    specialRules: [
      {
        title: { 'zh-CN': '通用规则', en: 'General Rules' },
        rules: [
          { id: 'player_count', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '本模组必须4人游戏，且在轮回中不能讨论。\n必须使用已死亡标志和已沟通标志。\n注意：杀人狂在本模组中上限为①。' } }
        ]
      },
      {
        title: { 'zh-CN': '背叛者', en: 'Betrayer' },
        rules: [
          { id: 'betrayer_1', timing: '第一轮轮回开始时', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '将Ex牌A、B、C洗混，并分给三个主人公，这张牌只有获得的主人公可以确认，拿到ExA的主人公称为主人公A，以此类推。' } },
          { id: 'betrayer_2', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '如果剧本选择的规则有特殊胜利条件，则对应的主人公变为背叛者，获得单独的胜利条件。如果完成胜利条件，则对应的背叛者单独胜利，剧作家和其他主人公失败。如果在轮回过程中主人公胜利，则背叛者失败。' } },
          { id: 'betrayer_3', timing: '最终决战时', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '如果背叛者是C，结算对应的X支线效果。所有背叛者不能参与最终决战并失败。由于规则X最多有2条，所以背叛者最多有2名。' } }
        ]
      },
      {
        title: { 'zh-CN': '指示物变体', en: 'Token Variants' },
        rules: [
          { id: 'hope_token', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '[希望] 视为: 友好+1、密谋-1、消除无视友好' } },
          { id: 'despair_token', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '[绝望] 视为: 不安+1、密谋+1、必定无视友好' } }
        ]
      },
      {
        title: { 'zh-CN': '特殊标志', en: 'Special Markers' },
        rules: [
          { id: 'communicated_marker', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '[已沟通] 代表本局中该角色使用/拒绝过友好能力' } },
          { id: 'dead_marker', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '[已死亡] 代表本局中该角色曾经死亡' } }
        ]
      },
    ]
  },

  // ── 旧版模组 ─────────────────────────────────────────────────────────────

  basic_tragedy_old: {
    id: 'basic_tragedy_old',
    label: { 'zh-CN': 'Basic Tragedy (α)', en: 'BT(α)' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['bt_old_murder_plan', 'bt_old_evil_seal', 'bt_old_sign_with_me', 'bt_old_protagonist_murder_plan', 'bt_old_giant_time_bomb_x', 'bt_old_circle_of_friends', 'bt_old_a_love_affair', 'bt_old_an_unsettling_rumor', 'bt_old_threads_of_fate', 'bt_old_heartbreak_13', 'bt_old_lurking_serial_killer', 'bt_old_paranoia_virus'],
    availableRoleIds: ['key_person', 'killer', 'brain', 'bt_old_evil_spirit', 'bt_old_witch', 'bt_old_assassin', 'friend', 'loved_one', 'lover', 'serial_killer', 'bt_old_thug'],
    availableIncidentIds: ['increasing_unease', 'murder', 'foul_evil', 'hospital_incident_small', 'suicide', 'missing_person'],
  },
  haunted_stage: {
    id: 'haunted_stage',
    label: { 'zh-CN': 'Haunted Stage', en: 'HS' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['hs_ancient_shrine_horror', 'hs_curse_of_the_doll', 'hs_moonlit_night', 'hs_bizarre_tales', 'hs_desert_demon', 'hs_gazing_into_abyss', 'hs_zombie_powder', 'hs_expanding_urban_legend', 'hs_ghost_city_shadow', 'hs_dance_party_of_the_dead', 'hs_deadly_frenzy', 'hs_boundary_of_life_and_death'],
    availableRoleIds: ['hs_nightmare', 'hs_curse_god', 'hs_doll', 'hs_werewolf', 'hs_vampire', 'hs_ghost', 'hs_monster', 'hs_spellcaster', 'hs_zombie', 'hs_poltergeist', 'hs_incarnation_of_horror', 'hs_overlord_of_death'],
    availableIncidentIds: ['increasing_unease', 'serial_murder', 'mass_suicide', 'proxy_execution', 'hospital_incident', 'blasphemy', 'beast_release', 'night_parade', 'grudge', 'spreading', 'nightmare_return'],
    specialRules: [
      {
        title: { 'zh-CN': '灵异', en: 'Supernatural' },
        rules: [
          { id: 'hs_supernatural', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '身份特性：死后活性（该角色死亡后，其能力依然有效）' } },
        ]
      },
      {
        title: { 'zh-CN': 'EX槽', en: 'EX Gauge' },
        rules: [
          { id: 'hs_ex1', timing: '常驻 EX1', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': 'EX 1+ 友好爆发抵抗：回合中可以将禁止不安视作禁止友好。' } },
          { id: 'hs_ex2', timing: '常驻 EX2', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': 'EX 2+ 灵魂解放：所有尸体可以执行移动效果。' } },
          { id: 'hs_ex3', timing: '常驻 EX3', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': 'EX 3+ 死亡恐慌：1名角色死亡时，同一区域所有角色获得1枚[不安]。' } },
          { id: 'hs_ex4', timing: '常驻 EX4', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': 'EX 4+ 通灵之夜：在回合结束阶段时，所有尸体各放置1枚[不安]。' } },
        ]
      },
    ]
  },
  another_horizon: {
    id: 'another_horizon',
    label: { 'zh-CN': 'Another Horizon', en: 'AH' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['ah_lost_heart', 'ah_shadow_king', 'ah_devils_will', 'ah_parallel_world_war', 'ah_otherworld_erosion', 'ah_puppet_house_world', 'ah_self_fluctuation', 'ah_closed_door', 'ah_threads_of_fate', 'ah_lunar_city', 'ah_zealot_offering', 'ah_temptation'],
    availableRoleIds: ['ah_agent', 'ah_brain', 'ah_invader', 'ah_light_of_dawn', 'ah_hidden', 'ah_preacher', 'ah_zealot', 'ah_person_in_painting', 'ah_psychopath', 'ah_instigator', 'ah_seducer', 'ah_marionette', 'ah_shadow'],
    availableIncidentIds: ['insane_murder', 'brainwashing', 'missing_person', 'hospital_incident', 'otherworld_drift', 'assassination', 'world_collapse', 'world_convergence', 'spark', 'breaking_the_board', 'confession'],
    specialRules: [
      {
        title: { 'zh-CN': '表世界与里世界', en: 'Front World and Back World' },
        rules: [
          { id: 'ah_world_shift', timing: '每轮轮回', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '每轮轮回开始时EX槽为0。偶数=表世界，奇数=里世界。指示物效果在里世界中反转（友好↔不安）。' } },
        ]
      },
      {
        title: { 'zh-CN': '友好爆发', en: 'Goodwill Burst' },
        rules: [
          { id: 'ah_goodwill_burst', timing: '友好能力结算后', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '该角色结算了友好能力后，进行世界移动。' } },
        ]
      },
      {
        title: { 'zh-CN': '傀儡木偶', en: 'Puppet Marionette' },
        rules: [
          { id: 'ah_puppet_marionette', timing: '友好能力阶段', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '剧作家可在友好能力阶段使用该角色的友好能力（需满足对应指示物条件）。' } },
        ]
      },
    ]
  },

  // ── 同人及英文原版模组 ────────────────────────────────────────────────────

  supernatural_tragedy: {
    id: 'supernatural_tragedy',
    label: { 'zh-CN': 'Supernatural Tragedy', en: 'ST' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['st_abomination', 'st_metamorphosis', 'st_spore', 'st_demon_gate', 'st_seed', 'st_infection', 'st_fatal_attraction', 'st_phantom', 'st_hired_murder', 'st_remote_detonation', 'st_mass_suicide', 'st_time_distortion'],
    availableRoleIds: ['st_copycat', 'st_mad_genius', 'st_cultist', 'st_potentate', 'st_supplicant', 'st_lover', 'st_contract_killer', 'st_key_person', 'st_serial_killer', 'st_seeder', 'st_augur'],
    availableIncidentIds: ['murder', 'grave_robbery', 'indoctrination', 'enticement', 'abduction', 'blood_ritual', 'suicide', 'mass_frenzy', 'school_shooting', 'dark_teaching', 'confession'],
  },
  echoing_love_a: {
    id: 'echoing_love_a',
    label: { 'zh-CN': 'Echoing Love A', en: 'ELA' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['ela_snow_shuraba', 'ela_lingering_memory', 'ela_holy_night_star', 'ela_feather_falling', 'ela_to_the_sky', 'ela_broken_bouquet', 'ela_karma_bond', 'ela_return_from_beyond', 'ela_fake_love', 'ela_one_day_friend', 'ela_lead_manifest', 'ela_night_spring_bride'],
    availableRoleIds: ['ela_childhood_friend', 'ela_godsend', 'ela_matchmaker', 'ela_observer', 'ela_thoughtform', 'ela_riddler', 'ela_serial_killer', 'ela_conspiracy_theorist', 'ela_provocateur', 'ela_simulacrum', 'ela_amnesia_patient', 'ela_magician', 'ela_yandere'],
    availableIncidentIds: ['jealousy_murder', 'scandal', 'double_suicide', 'hospital_incident', 'tsundere', 'corruption', 'oblivion', 'confession', 'dirty_deal', 'mass_riot', 'soul_swap'],
    specialRules: [
      {
        title: { 'zh-CN': '亲密关系', en: 'Intimacy' },
        rules: [
          { id: 'ela_intimacy', timing: '回合开始阶段', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': '队长可以选择1名放置有EX牌的角色，将其身上的1张EX牌转移至与其位于同一区域的另外1名角色身上。需要计算[友好]数量时，EX牌也计入。' } },
        ]
      },
      {
        title: { 'zh-CN': '共谋事件', en: 'Conspiracy Event' },
        rules: [
          { id: 'ela_conspiracy_event', timing: '事件阶段', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '有2名当事人。若所有当事人均存活且不安值均达到不安限度，则事件发生。判定时每名当事人不安限度-1。' } },
        ]
      },
    ]
  },
  old_fashion: {
    id: 'old_fashion',
    label: { 'zh-CN': 'Old Fashion', en: 'OF' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['of_dream_beauty', 'of_endless_wandering', 'of_repeater', 'of_time_patrol', 'of_skynet_assassin', 'of_artificial_world', 'of_delorean', 'of_blue_raccoon', 'of_lavender_scent', 'of_prophecy_of_ruin', 'of_patricide_paradox', 'of_time_war'],
    availableRoleIds: ['of_key_person', 'of_brain', 'of_hijacker', 'of_dead_angle', 'of_puppet', 'of_friend', 'of_returner_ally', 'of_returner_enemy', 'of_lover', 'of_loved_one', 'of_conspiracy_theorist', 'of_panic_maker'],
    availableIncidentIds: ['overflowing_miasma', 'murder', 'hospital_incident', 'suicide', 'twisted_spacetime', 'unsettling_rumor', 'exposure'],
    specialRules: [
      {
        title: { 'zh-CN': '隐匿死亡', en: 'Hidden Death' },
        rules: [
          { id: 'of_hidden_death', timing: '常驻', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': '剧作家使用某种能力导致主人公死亡时，可以仅宣告轮回结束且主人公输掉游戏而不提示主人公死亡。' } },
        ]
      },
    ]
  },
  sin_city: {
    id: 'sin_city',
    label: { 'zh-CN': 'Sin City', en: 'SC' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['sc_stable_plan', 'sc_evil_empire', 'sc_true_or_false', 'sc_underground_order', 'sc_top_secret', 'sc_silent_lamb', 'sc_first_target', 'sc_clean_world', 'sc_tainted_witness', 'sc_absolute_will', 'sc_stockholm', 'sc_chaos_city'],
    availableRoleIds: ['sc_key_person', 'sc_black_hand', 'sc_professor', 'sc_double', 'sc_secret_police', 'sc_bomber', 'sc_scapegoat', 'sc_kidnapper', 'sc_instigator', 'sc_happy_criminal', 'sc_compulsive', 'sc_terrorist', 'sc_witness'],
    availableIncidentIds: ['escape', 'social_movement', 'suicide', 'suppression', 'bomb_threat', 'coerced_confession', 'increasing_unease', 'serial_murder', 'plea_bargain', 'copycat_crime', 'collusion'],
    specialRules: [
      {
        title: { 'zh-CN': '监管', en: 'Supervision' },
        rules: [
          { id: 'sc_supervision', timing: '剧本制作时', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': '剧本制作时可选择任意登场人物，在轮回第一天开始时将他们移动到远方（监狱）。' } },
        ]
      },
      {
        title: { 'zh-CN': '累犯', en: 'Repeat Offender' },
        rules: [
          { id: 'sc_repeat_offender', timing: '常驻', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '该角色可以担任多个事件的当事人，在判定事件是否发生时，本轮轮回该角色每触发过1个事件，其不安限度+1。' } },
        ]
      },
      {
        title: { 'zh-CN': '司法移送', en: 'Judicial Transfer' },
        rules: [
          { id: 'sc_judicial_transfer_mm', timing: '剧作家阶段', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': '剧作家移除1名角色身上的1枚[密谋]或2枚[不安]，将其在远方与初始区域间移动（每回合限1次）。' } },
          { id: 'sc_judicial_transfer_pt', timing: '主人公能力阶段', mandatory: false, visibility: 'public_result', summary: { 'zh-CN': '队长移除1名角色身上的1枚[友好]，将其在远方与初始区域间移动（每回合限1次）。' } },
        ]
      },
    ]
  },
  unheard_malice: {
    id: 'unheard_malice',
    label: { 'zh-CN': 'Unheard Malice', en: 'UM' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['um_erased_memory', 'um_desperate_countdown', 'um_protect_this_place', 'um_oblivious_end', 'um_avengers_oath', 'um_problem_child', 'um_lurking_serial_killer', 'um_sealed_door', 'um_hospital_horror', 'um_mass_hypnosis', 'um_riot_suppressor', 'um_lost_children'],
    availableRoleIds: ['um_key_person', 'um_eraser', 'um_cultist', 'um_avenger', 'um_psychiatrist', 'um_serial_killer', 'um_pioneer', 'um_friend', 'um_troublemaker', 'um_conspiracy_theorist', 'um_paranoiac', 'um_sniper', 'um_pied_piper'],
    availableIncidentIds: ['serial_murder', 'increasing_unease', 'suicide', 'illegal_dumping', 'hospital_incident', 'ushi_no_koku', 'roar_of_resentment', 'funeral', 'deal_with_devil', 'denunciation', 'copycat_crime'],
    specialRules: [
      {
        title: { 'zh-CN': 'EX槽（无视行动牌）', en: 'EX Gauge (Card Ignored)' },
        rules: [
          { id: 'um_ex_gauge', timing: '行动结算阶段', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '每轮轮回开始时EX槽设为0。每1张主人公行动牌被剧作家能力或事件效果无视时，在对应行动牌结算后EX+1。剧作家无需声明无视了哪些行动牌。' } },
        ]
      },
    ]
  },
};
