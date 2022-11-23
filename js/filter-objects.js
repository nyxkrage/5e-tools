"use strict";

class PageFilterObjects extends PageFilter {
	constructor () {
		super();

		this._miscFilter = new Filter({header: "Miscellaneous", items: ["SRD", "Has Images", "Has Info", "Has Token"], isMiscFilter: true});
	}

	static mutateForFilters (obj) {
		obj._fMisc = obj.srd ? ["SRD"] : [];
		if (obj.tokenUrl || obj.hasToken) obj._fMisc.push("Has Token");
		if (obj.hasFluff) obj._fMisc.push("Has Info");
		if (obj.hasFluffImages) obj._fMisc.push("Has Images");
	}

	addToFilters (obj, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(obj.source);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, obj) {
		return this._filterBox.toDisplay(
			values,
			obj.source,
			obj._fMisc,
		);
	}
}
