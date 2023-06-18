/** @abstract */
class _InitiativeTrackerStatColumnBase {
	/**
	 * @param {?string} name
	 * @param {?string} abv
	 */
	constructor (
		{
			name = null,
			abv = null,
		},
	) {
		this._name = name;
		this._abv = abv;
	}

	get name () { return this._name; }
	get abv () { return this._abv; }

	/** @abstract */
	getCellValue (mon) { throw new Error("Unimplemented!"); }
}

class InitiativeTrackerStatColumn_HpFormula extends _InitiativeTrackerStatColumnBase {
	constructor () { super({name: "HP Formula"}); }

	getCellValue (mon) { return (mon.hp || {}).formula; }
}

class InitiativeTrackerStatColumn_ArmorClass extends _InitiativeTrackerStatColumnBase {
	constructor () { super({name: "Armor Class", abv: "AC"}); }

	getCellValue (mon) { return mon.ac[0] ? (mon.ac[0].ac || mon.ac[0]) : null; }
}

class InitiativeTrackerStatColumn_PassivePerception extends _InitiativeTrackerStatColumnBase {
	constructor () { super({name: "Passive Perception", abv: "PP"}); }

	getCellValue (mon) { return mon.passive; }
}

class InitiativeTrackerStatColumn_Speed extends _InitiativeTrackerStatColumnBase {
	constructor () { super({name: "Speed", abv: "SPD"}); }

	getCellValue (mon) {
		return Math.max(0, ...Object.values(mon.speed || {})
			.map(it => it.number ? it.number : it)
			.filter(it => typeof it === "number"));
	}
}

class InitiativeTrackerStatColumn_SpellDc extends _InitiativeTrackerStatColumnBase {
	constructor () { super({name: "Spell DC", abv: "DC"}); }

	getCellValue (mon) {
		return Math.max(
			0,
			...(mon.spellcasting || [])
				.filter(it => it.headerEntries)
				.map(it => {
					return it.headerEntries
						.map(it => {
							const found = [0];
							it
								.replace(/DC (\d+)/g, (...m) => found.push(Number(m[1])))
								.replace(/{@dc (\d+)}/g, (...m) => found.push(Number(m[1])));
							return Math.max(...found);
						})
						.filter(Boolean);
				})
				.flat(),
		);
	}
}

class InitiativeTrackerStatColumn_LegendaryActions extends _InitiativeTrackerStatColumnBase {
	constructor () { super({name: "Legendary Actions", abv: "LA"}); }

	getCellValue (mon) { return mon.legendaryActions || mon.legendary ? 3 : null; }
}

class InitiativeTrackerStatColumn_Save extends _InitiativeTrackerStatColumnBase {
	constructor ({abv}) {
		super({name: `${Parser.attAbvToFull(abv)} Save`, abv: abv.toUpperCase()});
		this._abv = abv;
	}

	getCellValue (mon) { return mon.save?.[this._abv] ? mon.save[this._abv] : Parser.getAbilityModifier(mon[this._abv]); }
}

class InitiativeTrackerStatColumn_AbilityBonus extends _InitiativeTrackerStatColumnBase {
	constructor ({abv}) {
		super({name: `${Parser.attAbvToFull(abv)} Bonus`, abv: abv.toUpperCase()});
		this._abv = abv;
	}

	getCellValue (mon) { return Parser.getAbilityModifier(mon[this._abv]); }
}

class InitiativeTrackerStatColumn_AbilityScore extends _InitiativeTrackerStatColumnBase {
	constructor ({abv}) {
		super({name: `${Parser.attAbvToFull(abv)} Score`, abv: abv.toUpperCase()});
		this._abv = abv;
	}

	getCellValue (mon) { return mon[this._abv]; }
}

class InitiativeTrackerStatColumn_Skill extends _InitiativeTrackerStatColumnBase {
	constructor ({skill}) {
		super({name: skill, abv: Parser.skillToShort(skill).toUpperCase()});
		this._skill = skill;
	}

	getCellValue (mon) { return mon.skill?.[this._skill] ? mon.skill[this._skill] : Parser.getAbilityModifier(mon[Parser.skillToAbilityAbv(this._skill)]); }
}

class _InitiativeTrackerStatColumnCheckboxBase extends _InitiativeTrackerStatColumnBase {
	constructor ({autoMode, ...rest}) {
		super({...rest});
		this._autoMode = autoMode;
	}

	// FIXME currently done using `isCheckboxColAuto`
	get autoMode () { return this._autoMode; }

	// FIXME currently done using `isCheckboxCol`
	get isCb () { return true; }

	getCellValue (mon) { return false; }
}

class InitiativeTrackerStatColumn_CheckboxAutoLow extends _InitiativeTrackerStatColumnCheckboxBase {
	constructor () { super({name: "Checkbox; clears at start of turn"}); }
}

class InitiativeTrackerStatColumn_Checkbox extends _InitiativeTrackerStatColumnCheckboxBase {
	constructor () { super({name: "Checkbox"}); }
}

class InitiativeTrackerStatColumn_CheckboxAutoHigh extends _InitiativeTrackerStatColumnCheckboxBase {
	constructor () { super({name: "Checkbox; ticks at start of turn"}); }

	getCellValue (mon) { return true; }
}

export const STAT_COLUMNS = {
	hr0: null,
	hpFormula: new InitiativeTrackerStatColumn_HpFormula(),
	armorClass: new InitiativeTrackerStatColumn_ArmorClass(),
	passivePerception: new InitiativeTrackerStatColumn_PassivePerception(),
	speed: new InitiativeTrackerStatColumn_Speed(),
	spellDc: new InitiativeTrackerStatColumn_SpellDc(),
	legendaryActions: new InitiativeTrackerStatColumn_LegendaryActions(),
	hr1: null,
	...Parser.ABIL_ABVS
		.mergeMap(abv => ({[`${abv}Save`]: new InitiativeTrackerStatColumn_Save({abv})})),
	hr2: null,
	...Parser.ABIL_ABVS
		.mergeMap(abv => ({[`${abv}Bonus`]: new InitiativeTrackerStatColumn_AbilityBonus({abv})})),
	hr3: null,
	...Parser.ABIL_ABVS
		.mergeMap(abv => ({[`${abv}Score`]: new InitiativeTrackerStatColumn_AbilityScore({abv})})),
	hr4: null,
	...Object.keys(Parser.SKILL_TO_ATB_ABV)
		.sort(SortUtil.ascSort)
		.mergeMap(skill => ({[skill.toCamelCase()]: new InitiativeTrackerStatColumn_Skill({skill})})),
	hr5: null,
	cbAutoLow: new InitiativeTrackerStatColumn_CheckboxAutoLow(),
	cbNeutral: new InitiativeTrackerStatColumn_Checkbox(),
	cbAutoHigh: new InitiativeTrackerStatColumn_CheckboxAutoHigh(),
};
