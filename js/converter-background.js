"use strict";

class _ParseStateTextBackground extends BaseParseStateText {

}

class BackgroundParser extends BaseParser {
	static _doParse_getInitialState (inText, options) {
		if (!inText || !inText.trim()) {
			options.cbWarning("No input!");
			return {};
		}

		const toConvert = this._getCleanInput(inText, options)
			.split("\n")
			.filter(it => it && it.trim());

		const background = {};
		background.source = options.source;
		// for the user to fill out
		background.page = options.page;

		return {toConvert, background};
	}

	/* -------------------------------------------- */

	/**
	 * Parses backgrounds from raw text pastes
	 * @param inText Input text.
	 * @param options Options object.
	 * @param options.cbWarning Warning callback.
	 * @param options.cbOutput Output callback.
	 * @param options.isAppend Default output append mode.
	 * @param options.source Entity source.
	 * @param options.page Entity page.
	 * @param options.titleCaseFields Array of fields to be title-cased in this entity (if enabled).
	 * @param options.isTitleCase Whether title-case fields should be title-cased in this entity.
	 */
	static doParseText (inText, options) {
		options = this._getValidOptions(options);

		const {toConvert, background} = this._doParse_getInitialState(inText, options);
		if (!toConvert) return;

		const state = new _ParseStateTextBackground({toConvert, options, entity: background});

		state.doPreLoop();
		for (; state.ixToConvert < toConvert.length; ++state.ixToConvert) {
			state.initCurLine();
			if (state.isSkippableCurLine()) continue;

			switch (state.stage) {
				case "name": this._doParseText_stepName(state); state.stage = "entries"; break;
				case "entries": this._doParseText_stepEntries(state); break;
				default: throw new Error(`Unknown stage "${state.stage}"`);
			}
		}
		state.doPostLoop();

		if (!background.entries?.length) delete background.entries;

		const entityOut = this._getFinalEntity(background, options);

		options.cbOutput(entityOut, options.isAppend);
	}

	static _doParseText_stepName (state) {
		const name = state.curLine.replace(/ Traits$/i, "");
		state.entity.name = this._getAsTitle("name", name, state.options.titleCaseFields, state.options.isTitleCase);
	}

	static _doParseText_stepEntries (state) {
		const ptrI = {_: state.ixToConvert};
		state.entity.entries = EntryConvert.coalesceLines(
			ptrI,
			state.toConvert,
		);
		state.ixToConvert = ptrI._;
	}

	// SHARED UTILITY FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////
	static _getFinalEntity (entity, options) {
		this._doBackgroundPostProcess(entity, options);
		return PropOrder.getOrdered(entity, entity.__prop || "background");
	}

	static _doBackgroundPostProcess (background, options) {
		if (!background.entries) return;

		// region Tag
		EntryConvert.tryRun(background, "entries");
		TagJsons.mutTagObject(background, {keySet: new Set(["entries"]), isOptimistic: false});
		// endregion

		// region Background-specific cleanup and generation
		this._doBackgroundPostProcess_feature(background, options);
		BackgroundSkillTollLanguageEquipmentCoalesce.tryRun(background, {cbWarning: options.cbWarning});
		BackgroundSkillToolLanguageTag.tryRun(background, {cbWarning: options.cbWarning});
		this._doBackgroundPostProcess_equipment(background, options);
		EquipmentBreakdown.tryRun(background, {cbWarning: options.cbWarning});
		this._doBackgroundPostProcess_tables(background, options);
		// endregion
	}

	static _doBackgroundPostProcess_feature (background, options) {
		const entFeature = background.entries.find(ent => ent.name?.startsWith("Feature: "));
		if (!entFeature) return;

		(entFeature.data ||= {}).isFeature = true;

		const walker = MiscUtil.getWalker({isNoModification: true});
		walker.walk(
			entFeature.entries,
			{
				string: (str) => {
					str.replace(/{@feat (?<tagContents>[^}]+)}/g, (...m) => {
						const {name, source} = DataUtil.proxy.unpackUid("feat", m.at(-1).tagContents, "feat", {isLower: true});
						(background.feats ||= []).push({[`${name}|${source}`]: true});

						(background.fromFeature ||= {}).feats = true;
					});
				},
			},
		);
	}

	static _doBackgroundPostProcess_equipment (background, options) {
		const entryEquipment = UtilBackgroundParser.getEquipmentEntry(background);
		if (!entryEquipment) return;

		entryEquipment.entry = ItemTag.tryRunBasicEquipment(entryEquipment.entry);
	}

	static _doBackgroundPostProcess_tables (background, options) {
		for (let i = 1; i < background.entries.length; ++i) {
			const entPrev = background.entries[i - 1];
			if (!entPrev.entries?.length) continue;

			const ent = background.entries[i];
			if (ent.type !== "table") continue;

			entPrev.entries.push(ent);
			background.entries.splice(i--, 1);
		}
	}
}

globalThis.BackgroundParser = BackgroundParser;
