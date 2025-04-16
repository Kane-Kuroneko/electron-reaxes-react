export const originalCheatCodesData : DataType[] = [
	{
		key: 'TenthLevelTaurenChieftain',
		code: 'TenthLevelTaurenChieftain',
		description: 'Plays "Power of the horde" By Tenth Level Tauren Chieftain. (L70ETC)',
		_zh_desc:'会立即播放由Tenth Level Tauren Chieftain乐队演唱的《Power of the horde》',
	},
	{
		key: 'WarpTen',
		code: 'WarpTen',
		description: 'Speeds construction of buildings and units',
		_zh_desc : "加快所有的建造、训练和研究数倍",
	},
	{
		key: 'IocainePowder',
		code: 'IocainePowder',
		description: 'Fast Death/Decay',
		_zh_desc : '使尸体快速消失'
	},
	{
		key: 'WhosYourDaddy',
		code: 'WhosYourDaddy',
		description: 'Makes you and your units invincible and have one hit kills',
		_zh_desc : '将你所有的单位和建筑造成的伤害提升100倍,并使其完全免疫攻击和魔法造成的伤害(但依然被特殊机制/技能所影响)'
	},
	{
		key: 'KeyserSoze',
		code: 'KeyserSoze',
		description: 'Gives you X Gold (use [amount] for specifying)',
		example : 'Example: KeyserSoze 1000',
		_zh_desc : 'KeyserSoze <数量>立即会有<数量>个黄金打入你的账上,如果不输入<数量>则默认500'
	},
	{
		key: 'LeafitToMe',
		code: 'LeafitToMe',
		description: 'Gives you X Lumber',
		example : 'Example: LeafitToMe 1000',
		_zh_desc : 'LeafitToMe <数量>立即会有<数量>个木材打入你的账上,如果不输入<数量>则默认500'
	},
	{
		key: 'GreedIsGood',
		code: 'GreedIsGood',
		description: 'Gives you X Gold and Lumber (use [amount] for specifying)',
		example : 'Example: GreedIsGood 1000',
		_zh_desc : 'LeafitToMe <数量>立即会有<数量>个黄金和木材打入你的账上,如果不输入<数量>则默认500'
	},
	{
		key: 'PointBreak',
		code: 'PointBreak',
		description: 'Removes food limit',
		_zh_desc: "建造单位不受通灵塔/农场/地洞/月亮井的食物限制(但仍然不能超过最大人口上限)",
	},
	{
		key: 'ThereIsNoSpoon',
		code: 'ThereIsNoSpoon',
		description: 'Unlimited Mana',
		_zh_desc: "放技能不消耗魔法值",
	},
	{
		key: 'StrengthAndHonor',
		code: 'StrengthAndHonor',
		description: 'Continue playing after defeat in campaign mode',
		_zh_desc: "即使战役中的任务失败仍然可以继续游戏",
	},
	{
		key: 'Motherland',
		code: 'Motherland',
		description: 'Level jump (use [race][1] and [level][2] for specification)',
		example : 'Example: Motherland Human 2',
		children : [
			{
				key : 'Human',
				code : 'Motherland Human ',
				description : '人族:洛丹伦的天灾',
				children : [
					{
						key : 'Hum 1',
						code : 'Motherland Human 1',
						description : '第一章:斯坦恩布莱德保卫战'
					},
					{
						key : 'Hum 2',
						code : 'Motherland Human 2',
						description : '第二章:初会黑石氏族'
					},
					{
						key : 'Hum 3',
						code : 'Motherland Human 3',
						description : '插曲:吉安娜的会面'
					},
					{
						key : 'Hum 4',
						code : 'Motherland Human 4',
						description : '第三章:肆虐的瘟疫'
					},
					{
						key : 'Hum 5',
						code : 'Motherland Human 5',
						description : '第四章:诅咒教派'
					},
					{
						key : 'Hum 6',
						code : 'Motherland Human 6',
						description : '第五章:天灾的进军'
					},
					{
						key : 'Hum 7',
						code : 'Motherland Human 7',
						description : '插曲:王子和先知'
					},
					{
						key : 'Hum 8',
						code : 'Motherland Human 8',
						description : '第六章:净化斯坦索姆'
					},
					{
						key : 'Hum 9',
						code : 'Motherland Human 9',
						description : '插曲:分道扬镳'
					},
					{
						key : 'Hum 10',
						code : 'Motherland Human 10',
						description : '第七章:诺森德海岸'
					},
					{
						key : 'Hum 11',
						code : 'Motherland Human 11',
						description : '第八章:分歧'
					},
					{
						key : 'Hum 12',
						code : 'Motherland Human 12',
						description : '第九章:霜之哀伤'
					},
				]
			},
			{
				key : 'Humanex',
				code : 'Motherland Humanex ',
				description : '人族:血精灵的诅咒',
				children : [
					{
						key : 'Humex 1',
						code : 'Motherland Humanex 1',
						description : '第一章:重重误解'
					},
				]
			},
		]
	},
	{
		key: 'SomebodySetUsUpTheBomb',
		code: 'SomebodySetUsUpTheBomb',
		description: 'Instant defeat',
	},
	{
		key: 'AllYourBaseAreBelongToUs',
		code: 'AllYourBaseAreBelongToUs',
		description: 'Instant victory',
	},
	{
		key: 'ItVexesMe',
		code: 'ItVexesMe',
		description: "Can't win",
	},
	{
		key: 'WhoIsJohnGalt',
		code: 'WhoIsJohnGalt',
		description: 'Enable research',
	},
	{
		key: 'SharpAndShiny',
		code: 'SharpAndShiny',
		description: 'Research upgrades',
	},
	{
		key: 'IseeDeadPeople',
		code: 'IseeDeadPeople',
		description: 'Remove fog of war',
	},
	{
		key: 'Synergy',
		code: 'Synergy',
		description: 'Disable tech tree requirements',
	},
	{
		key: 'RiseAndShine',
		code: 'RiseAndShine',
		description: 'Set time of day to dawn',
	},
	{
		key: 'LightsOut',
		code: 'LightsOut',
		description: 'Set time of day to dusk',
	},
	{
		key: 'DayLightSavings',
		code: 'DayLightSavings',
		description: 'Set or toggle time of day (use [time] for specification)',
	},
	{
		key: 'TheDudeAbides',
		code: 'TheDudeAbides',
		description: 'Resets all cooldowns',
	},
];
export interface DataType {
	key: string;
	code: string;
	description: string;
	example? : string;
	children? : DataType[],
	_zh_desc?:string,
}
