"use strict";

class AdventuresList extends AdventuresBooksList {
	static _getLevelsStr (adv) {
		if (adv.level.custom) return adv.level.custom;
		return `${adv.level.start}\u2013${adv.level.end}`;
	}

	constructor () {
		super({
			contentsUrl: "data/adventures.json",
			fnSort: AdventuresBooksList._sortAdventuresBooks.bind(AdventuresBooksList),
			sortByInitial: "group",
			sortDirInitial: "asc",
			dataProp: "adventure",
			enhanceRowDataFn: (adv) => {
				adv._startLevel = adv.level.start || 20;
				adv._pubDate = new Date(adv.published);
			},
			rootPage: "adventure.html",
			rowBuilderFn: (adv) => {
				return `
					<span class="col-1-3 text-center">${AdventuresBooksList._getGroupStr(adv)}</span>
					<span class="col-5-5 bold">${adv.name}</span>
					<span class="col-2-5">${adv.storyline || "\u2014"}</span>
					<span class="col-1 text-center">${AdventuresList._getLevelsStr(adv)}</span>
					<span class="col-1-7 text-center">${AdventuresBooksList._getDateStr(adv)}</span>
				`;
			},
		});
	}
}

const adventuresList = new AdventuresList();

window.addEventListener("load", () => adventuresList.pOnPageLoad());

function handleBrew (homebrew) {
	adventuresList.addData(homebrew);
	return Promise.resolve();
}
