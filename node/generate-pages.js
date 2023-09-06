import Handlebars from "handlebars";
import "../js/parser.js";
import "../js/utils.js";
import fs from "fs";

class _HtmlGenerator {
	static _getAttrClass (str, {classListAdditional = null} = {}) {
		const pts = [
			str,
			classListAdditional?.length ? classListAdditional.join(" ") : "",
		]
			.filter(Boolean)
			.join(" ");
		if (!pts) return null;
		return `class="${pts}"`;
	}
}

class _HtmlGeneratorListButtons extends _HtmlGenerator {
	static getBtnPreviewToggle () {
		return `<button class="col-0-3 btn btn-default btn-xs p-0 lst__btn-collapse-all-previews" name="list-toggle-all-previews">[+]</button>`;
	}

	static getBtnSource () {
		return `<button class="sort btn btn-default btn-xs ve-grow" data-sort="source">Source</button>`;
	}

	/**
	 * @param {string} width
	 * @param {?string} sortIdent
	 * @param {string} text
	 * @param {?boolean} isDisabled
	 * @param {?Array<string>} classListAdditional
	 * @return {string}
	 */
	static getBtn (
		{
			width,
			sortIdent = null,
			text,
			isDisabled = false,
			classListAdditional = null,
		},
	) {
		const attrs = [
			this._getAttrClass(`col-${width} sort btn btn-default btn-xs`, {classListAdditional}),
			sortIdent ? `data-sort="${sortIdent}"` : null,
			isDisabled ? `disabled` : null,
		]
			.filter(Boolean)
			.join(" ");

		return `<button ${attrs}>${text}</button>`;
	}
}

class _HtmlGeneratorListToken extends _HtmlGenerator {
	/**
	 * @param {?Array<string>} classListAdditional
	 * @return {string}
	 */
	static getWrpToken ({classListAdditional = null} = {}) {
		const attrs = [
			`id="float-token"`,
			this._getAttrClass(`relative`, {classListAdditional}),
		]
			.filter(Boolean)
			.join(" ");
		return `<div ${attrs}></div>`;
	}
}

/** @abstract */
class _PageGeneratorBase {
	_filename;
	_page;

	init () {
		this._registerPartials();
		return this;
	}

	_registerPartial ({ident, filename}) {
		if (ident in Handlebars.partials) return;
		Handlebars.registerPartial(ident, this.constructor._getLoadedSource({filename}));
	}

	_registerPartials () { /* Implement as required */ }

	/**
	 * @abstract
	 * @return {object}
	 */
	_getData () { throw new Error("Unimplemented!"); }

	generatePage () {
		const template = Handlebars.compile(this.constructor._getLoadedSource({filename: this._filename}));
		fs.writeFileSync(this._page, template(this._getData()), "utf-8");
	}

	static _getLoadedSource ({filename}) {
		return fs.readFileSync(`./node/generate-pages/${filename}`, "utf-8");
	}
}

class _PageGeneratorListBase extends _PageGeneratorBase {
	_filename = `template-list.hbs`;

	_page;
	_titlePage;
	_titleNavbar;
	_stylesheets;
	_scriptIdentList;
	_scriptsUtilsAdditional;
	_scriptsPrePageAdditional;
	_isMultisource = false;
	_btnsList;
	_btnsSublist;
	_wrpToken;
	_isPrinterView = false;

	_registerPartials () {
		this._registerPartial({ident: `blank`, filename: `template-blank.hbs`});

		this._registerPartial({ident: `listRhsWrpFooterControls`, filename: `template-list-rhs-wrp-footer-controls.hbs`});
		this._registerPartial({ident: `listRhsWrpToken`, filename: `template-list-rhs-wrp-token.hbs`});
	}

	_getData () {
		return {
			titlePage: this._titlePage,
			titleNavbar: this._titleNavbar ?? this._titlePage,
			stylesheets: this._stylesheets,
			scriptIdentList: this._scriptIdentList,
			scriptsUtilsAdditional: this._scriptsUtilsAdditional,
			scriptsPrePageAdditional: this._scriptsPrePageAdditional,
			isMultisource: this._isMultisource,
			btnsList: this._btnsList,
			btnsSublist: this._btnsSublist,
			wrpToken: this._wrpToken,
			identPartialRhsWrpFooter: `listRhsWrpFooterControls`,
			identPartialRhsPreSublist: `blank`,
			identPartialRhsSublistFooter: `blank`,
			identPartialRhsWrpToken: `blank`,
			isPrinterView: this._isPrinterView,
		};
	}
}

class _PageGeneratorListActions extends _PageGeneratorListBase {
	_page = UrlUtil.PG_ACTIONS;
	_titlePage = "Actions";
	_scriptIdentList = "actions";

	_btnsList = [
		_HtmlGeneratorListButtons.getBtnPreviewToggle(),
		_HtmlGeneratorListButtons.getBtn({width: "5-7", sortIdent: "name", text: "Name"}),
		_HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "time", text: "Time"}),
		_HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		_HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "name", text: "Name"}),
		_HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "time", text: "Time"}),
	];
}

class _PageGeneratorListBackgrounds extends _PageGeneratorListBase {
	_page = UrlUtil.PG_BACKGROUNDS;
	_titlePage = "Backgrounds";
	_scriptIdentList = "backgrounds";

	_btnsList = [
		_HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "Name"}),
		_HtmlGeneratorListButtons.getBtn({width: "6", sortIdent: "skills", text: "Skill Proficiencies"}),
		_HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		_HtmlGeneratorListButtons.getBtn({width: "4", sortIdent: "name", text: "Name"}),
		_HtmlGeneratorListButtons.getBtn({width: "8", sortIdent: "skills", text: "Skills"}),
	];

	_isPrinterView = true;
}

class _PageGeneratorListBestiary extends _PageGeneratorListBase {
	_page = UrlUtil.PG_BESTIARY;
	_titlePage = "Bestiary";

	_stylesheets = [
		"bestiary",
	];

	_scriptIdentList = "bestiary";

	_scriptsUtilsAdditional = [
		"utils-list-bestiary.js",
		"utils-tableview.js",
	];

	_scriptsPrePageAdditional = [
		"bestiary-encounterbuilder.js",
	];

	_isMultisource = true;

	_btnsList = [
		_HtmlGeneratorListButtons.getBtn({width: "4-2", sortIdent: "name", text: "Name"}),
		_HtmlGeneratorListButtons.getBtn({width: "4-1", sortIdent: "type", text: "Type"}),
		_HtmlGeneratorListButtons.getBtn({width: "1-7", sortIdent: "cr", text: "CR"}),
		_HtmlGeneratorListButtons.getBtnSource(),
	];

	_btnsSublist = [
		_HtmlGeneratorListButtons.getBtn({width: "5", sortIdent: "name", text: "Name"}),

		_HtmlGeneratorListButtons.getBtn({width: "3-8", classListAdditional: ["ecgen__hidden"], sortIdent: "type", text: "Type"}),
		_HtmlGeneratorListButtons.getBtn({width: "3-8", classListAdditional: ["ecgen__visible"], isDisabled: true, text: "&nbsp;"}),

		_HtmlGeneratorListButtons.getBtn({width: "1-2", sortIdent: "cr", text: "CR"}),
		_HtmlGeneratorListButtons.getBtn({width: "2", sortIdent: "count", text: "Number"}),
	];

	_registerPartials () {
		this._registerPartial({
			ident: `listRhsWrpFooterControlsBestiary`,
			filename: `template-list-rhs-wrp-footer-controls--bestiary.hbs`,
		});
		this._registerPartial({
			ident: `listRhsPreSublistBestiary`,
			filename: `template-list-rhs-pre-sublist-bestiary.hbs`,
		});
		this._registerPartial({
			ident: `listRhsSublistFooterBestiary`,
			filename: `template-list-rhs-sublist-footer-bestiary.hbs`,
		});
	}

	_getData () {
		return {
			...super._getData(),
			identPartialRhsWrpFooter: `listRhsWrpFooterControlsBestiary`,
			identPartialRhsPreSublist: `listRhsPreSublistBestiary`,
			identPartialRhsSublistFooter: `listRhsSublistFooterBestiary`,
			identPartialRhsWrpToken: `listRhsWrpToken`,
		};
	}

	_isPrinterView = true;
}

const generators = [
	new _PageGeneratorListActions(),
	new _PageGeneratorListBackgrounds(),
	new _PageGeneratorListBestiary(),
];

generators
	.map(gen => gen.init())
	.forEach(generator => generator.generatePage());
