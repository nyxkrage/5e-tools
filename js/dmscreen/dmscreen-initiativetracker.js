import {InitiativeTrackerConst} from "./dmscreen-initiativetracker-consts.js";
import {STAT_COLUMNS} from "./dmscreen-initiativetracker-statcolumns.js";
import {InitiativeTrackerNetworking} from "./dmscreen-initiativetracker-networking.js";
import {InitiativeTrackerUi} from "./dmscreen-initiativetracker-ui.js";
import {InitiativeTrackerSettings} from "./dmscreen-initiativetracker-settings.js";

export class InitiativeTracker {
	constructor ({board, savedState}) {
		this._board = board;
		this._savedState = savedState;

		this._networking = new InitiativeTrackerNetworking({board});
	}

	render () {
		const _propDefaultFalse = (savedVal) => !!savedVal;
		const _propDefaultTrue = (savedVal) => savedVal == null ? true : !!savedVal;

		const cfg = {
			sort: this._savedState.s || InitiativeTrackerConst.SORT_ORDER_NUM,
			dir: this._savedState.d || InitiativeTrackerConst.SORT_DIR_DESC,
			isLocked: false,
			isRollInit: _propDefaultTrue(this._savedState.m),
			isRollHp: _propDefaultFalse(this._savedState.m),
			importIsRollGroups: _propDefaultTrue(this._savedState.g),
			importIsAddPlayers: _propDefaultTrue(this._savedState.p),
			importIsAppend: _propDefaultFalse(this._savedState.a),
			statsAddColumns: _propDefaultFalse(this._savedState.k),
			playerInitShowExactPlayerHp: _propDefaultFalse(this._savedState.piHp),
			playerInitShowExactMonsterHp: _propDefaultFalse(this._savedState.piHm),
			playerInitHideNewMonster: _propDefaultTrue(this._savedState.piV),
			playerInitShowOrdinals: _propDefaultFalse(this._savedState.piO),
			statsCols: this._savedState.c || [],
		};

		const $wrpTracker = $(`<div class="dm-init dm__panel-bg dm__data-anchor"></div>`);

		const p2pMetaV1 = {rows: [], serverInfo: null, serverPeer: null};
		const p2pMetaV0 = {rows: [], serverInfo: null};
		const _sendStateToClients = () => {
			// region V1
			if (p2pMetaV1.serverPeer) {
				if (!p2pMetaV1.serverPeer.hasConnections()) return;

				const toSend = getPlayerFriendlyState();
				p2pMetaV1.serverPeer.sendMessage(toSend);
			}
			// endregion

			// region V0
			if (p2pMetaV0.serverInfo) {
				p2pMetaV0.rows = p2pMetaV0.rows.filter(r => !r.isDeleted);
				p2pMetaV0.serverInfo = p2pMetaV0.serverInfo.filter(r => {
					if (r.isDeleted) {
						r.server.close();
						return false;
					}
					return true;
				});

				const toSend = getPlayerFriendlyState();
				try {
					p2pMetaV0.serverInfo.filter(info => info.server.isActive).forEach(info => info.server.sendMessage(toSend));
				} catch (e) { setTimeout(() => { throw e; }); }
			}
			// endregion
		};
		const sendStateToClientsDebounced = MiscUtil.debounce(_sendStateToClients, 100); // long delay to avoid network spam

		const doUpdateExternalStates = () => {
			this._board.doSaveStateDebounced();
			sendStateToClientsDebounced();
		};

		const makeImportSettingsModal = () => {
			const {$modalInner} = UiUtil.getShowModal({title: "Import Settings", cbClose: () => doUpdateExternalStates()});
			UiUtil.addModalSep($modalInner);
			UiUtil.$getAddModalRowCb($modalInner, "Roll creature initiative", cfg, "isRollInit");
			UiUtil.$getAddModalRowCb($modalInner, "Roll creature hit points", cfg, "isRollHp");
			UiUtil.$getAddModalRowCb($modalInner, "Roll groups of creatures together", cfg, "importIsRollGroups");
			UiUtil.$getAddModalRowCb($modalInner, "Add players", cfg, "importIsAddPlayers");
			UiUtil.$getAddModalRowCb($modalInner, "Add to existing tracker state", cfg, "importIsAppend");
		};

		// initialise "upload" context menu
		const menu = ContextUtil.getMenu([
			...ListUtilBestiary.getContextOptionsLoadSublist({
				pFnOnSelect: pDoLoadEncounter,
			}),
			null,
			new ContextUtil.Action(
				"Import Settings",
				() => {
					makeImportSettingsModal();
				},
			),
		]);

		const $wrpTop = $(`<div class="dm-init__wrp-header-outer"></div>`).appendTo($wrpTracker);
		const $wrpHeader = $(`
			<div class="dm-init__wrp-header">
				<div class="dm-init__row-lhs dm-init__header">
					<div class="w-100">Creature/Status</div>
				</div>

				<div class="dm-init__row-mid"></div>

				<div class="dm-init__row-rhs">
					<div class="dm-init__header dm-init__header--input dm-init__header--input-wide" title="Hit Points">HP</div>
					<div class="dm-init__header dm-init__header--input" title="Initiative Score">#</div>
					<div class="dm-init__spc-header-buttons"></div>
				</div>
			</div>
		`).appendTo($wrpTop);

		const $wrpEntries = $(`<div class="dm-init__wrp-entries"></div>`).appendTo($wrpTop);

		const $wrpControls = $(`<div class="dm-init__wrp-controls"></div>`).appendTo($wrpTracker);

		const $wrpAddNext = $(`<div class="ve-flex"></div>`).appendTo($wrpControls);
		const $wrpAdd = $(`<div class="btn-group ve-flex"></div>`).appendTo($wrpAddNext);
		const $btnAdd = $(`<button class="btn btn-primary btn-xs dm-init-lockable" title="Add Player"><span class="glyphicon glyphicon-plus"></span></button>`).appendTo($wrpAdd);
		const $btnAddMonster = $(`<button class="btn btn-success btn-xs dm-init-lockable mr-2" title="Add Monster"><span class="glyphicon glyphicon-print"></span></button>`).appendTo($wrpAdd);
		const $btnSetPrevActive = $(`<button class="btn btn-default btn-xs" title="Previous Turn"><span class="glyphicon glyphicon-step-backward"></span></button>`)
			.click(() => setPrevActive());
		const $btnSetNextActive = $(`<button class="btn btn-default btn-xs mr-2" title="Next Turn"><span class="glyphicon glyphicon-step-forward"></span></button>`)
			.click(() => setNextActive());
		$$`<div class="btn-group">${$btnSetPrevActive}${$btnSetNextActive}</div>`.appendTo($wrpAddNext);
		const $iptRound = $(`<input class="form-control ipt-sm dm-init__rounds" type="number" min="1" title="Round">`)
			.val(this._savedState.n || 1)
			.change(() => doUpdateExternalStates())
			.appendTo($wrpAddNext);

		const $wrpSort = $(`<div class="btn-group ve-flex"></div>`).appendTo($wrpControls);
		$(`<button title="Sort Alphabetically" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-sort-by-alphabet"></span></button>`).appendTo($wrpSort)
			.click(() => {
				if (cfg.sort === InitiativeTrackerConst.SORT_ORDER_ALPHA) flipDir();
				else cfg.sort = InitiativeTrackerConst.SORT_ORDER_ALPHA;
				doSort(InitiativeTrackerConst.SORT_ORDER_ALPHA);
			});
		$(`<button title="Sort Numerically" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-sort-by-order"></span></button>`).appendTo($wrpSort)
			.click(() => {
				if (cfg.sort === InitiativeTrackerConst.SORT_ORDER_NUM) flipDir();
				else cfg.sort = InitiativeTrackerConst.SORT_ORDER_NUM;
				doSort(InitiativeTrackerConst.SORT_ORDER_NUM);
			});

		const $wrpUtils = $(`<div class="ve-flex"></div>`).appendTo($wrpControls);

		const menuPlayerWindow = ContextUtil.getMenu([
			new ContextUtil.Action(
				"Standard",
				async () => {
					this._networking.handleClick_playerWindowV1({p2pMetaV1, doUpdateExternalStates});
				},
			),
			new ContextUtil.Action(
				"Manual (Legacy)",
				async () => {
					this._networking.handleClick_playerWindowV0({p2pMetaV0, doUpdateExternalStates});
				},
			),
		]);

		$(`<button class="btn btn-primary btn-xs mr-2" title="Player View"><span class="glyphicon glyphicon-user"></span></button>`)
			.click(evt => {
				ContextUtil.pOpenMenu(evt, menuPlayerWindow);
			})
			.appendTo($wrpUtils);

		$wrpTracker.data("pDoConnectLocalV1", async () => {
			await this._networking.startServerV1({p2pMetaV1, doUpdateExternalStates});
			return p2pMetaV1.serverPeer.token;
		});

		$wrpTracker.data("pDoConnectLocalV0", async (clientView) => {
			await this._networking.pHandleDoConnectLocalV0({p2pMetaV0, clientView});
			sendStateToClientsDebounced();
		});

		const $wrpLockSettings = $(`<div class="btn-group ve-flex"></div>`).appendTo($wrpUtils);
		const $btnLock = $(`<button class="btn btn-danger btn-xs" title="Lock Tracker"><span class="glyphicon glyphicon-lock"></span></button>`).appendTo($wrpLockSettings);
		$btnLock.on("click", () => {
			if (cfg.isLocked) {
				$btnLock.removeClass("btn-success").addClass("btn-danger").title("Lock Tracker");
				$(".dm-init-lockable").removeClass("disabled");
				$("input.dm-init-lockable").prop("disabled", false);
			} else {
				$btnLock.removeClass("btn-danger").addClass("btn-success").title("Unlock Tracker");
				$(".dm-init-lockable").addClass("disabled");
				$("input.dm-init-lockable").prop("disabled", true);
			}
			cfg.isLocked = !cfg.isLocked;
			handleStatColsChange();
		});

		$(`<button class="btn btn-default btn-xs mr-2" title="Settings"><span class="glyphicon glyphicon-cog"></span></button>`)
			.appendTo($wrpLockSettings)
			.click(async () => {
				const compSettings = new InitiativeTrackerSettings({state: MiscUtil.copyFast(cfg)});
				await compSettings.pGetShowModalResults();
				Object.assign(cfg, compSettings.getSettingsUpdate());
				handleStatColsChange();
				doUpdateExternalStates();
			});

		const $wrpLoadReset = $(`<div class="btn-group"></div>`).appendTo($wrpUtils);
		const $btnLoad = $(`<button title="Import an encounter from the Bestiary" class="btn btn-success btn-xs dm-init-lockable"><span class="glyphicon glyphicon-upload"></span></button>`).appendTo($wrpLoadReset)
			.click((evt) => {
				if (cfg.isLocked) return;
				ContextUtil.pOpenMenu(evt, menu);
			});
		$(`<button title="Reset" class="btn btn-danger btn-xs dm-init-lockable"><span class="glyphicon glyphicon-trash"></span></button>`).appendTo($wrpLoadReset)
			.click(() => {
				if (cfg.isLocked) return;
				confirm("Are you sure?") && doReset();
			});

		$btnAdd.on("click", async () => {
			if (cfg.isLocked) return;
			await pMakeRow({isVisible: true});
			doSort(cfg.sort);
			checkSetFirstActive({isSkipUpdateRound: true});
		});

		$btnAddMonster.on("click", () => {
			if (cfg.isLocked) return;
			const flags = {
				doClickFirst: false,
				isWait: false,
			};

			const {$modalInner, doClose} = UiUtil.getShowModal();

			const $controls = $(`<div class="split no-shrink"></div>`).appendTo($modalInner);
			const $iptSearch = $(`<input class="ui-search__ipt-search search form-control" autocomplete="off" placeholder="Search...">`).blurOnEsc().appendTo($controls);
			const $wrpCount = $(`
				<div class="ui-search__ipt-search-sub-wrp ve-flex-v-center pr-0">
					<div class="mr-1">Add</div>
					<label class="ui-search__ipt-search-sub-lbl"><input type="radio" name="mon-count" class="ui-search__ipt-search-sub-ipt" value="1" checked> 1</label>
					<label class="ui-search__ipt-search-sub-lbl"><input type="radio" name="mon-count" class="ui-search__ipt-search-sub-ipt" value="2"> 2</label>
					<label class="ui-search__ipt-search-sub-lbl"><input type="radio" name="mon-count" class="ui-search__ipt-search-sub-ipt" value="3"> 3</label>
					<label class="ui-search__ipt-search-sub-lbl"><input type="radio" name="mon-count" class="ui-search__ipt-search-sub-ipt" value="5"> 5</label>
					<label class="ui-search__ipt-search-sub-lbl"><input type="radio" name="mon-count" class="ui-search__ipt-search-sub-ipt" value="8"> 8</label>
					<label class="ui-search__ipt-search-sub-lbl"><input type="radio" name="mon-count" class="ui-search__ipt-search-sub-ipt" value="-1"> <input type="number" class="form-control ui-search__ipt-search-sub-ipt-custom" value="13" min="1"></label>
				</div>
			`).appendTo($controls);
			$wrpCount.find(`.ui-search__ipt-search-sub-ipt-custom`).click((evt) => {
				$wrpCount.find(`.ui-search__ipt-search-sub-ipt[value=-1]`).prop("checked", true);
				$(evt.currentTarget).select();
			});
			const getCount = () => {
				const val = $wrpCount.find(`[name="mon-count"]`).filter(":checked").val();
				if (val === "-1") return Number($wrpCount.find(`.ui-search__ipt-search-sub-ipt-custom`).val());
				return Number(val);
			};

			const $wrpCbRoll = $(`<label class="ui-search__ipt-search-sub-wrp ve-flex-vh-center"> <span>Roll HP</span></label>`).appendTo($controls);
			const $cbRoll = $(`<input class="mr-1" type="checkbox">`).prop("checked", cfg.isRollHp).on("change", () => cfg.isRollHp = $cbRoll.prop("checked")).prependTo($wrpCbRoll);
			const $results = $(`<div class="ui-search__wrp-results"></div>`).appendTo($modalInner);

			const showMsgIpt = () => {
				flags.isWait = true;
				$results.empty().append(SearchWidget.getSearchEnter());
			};

			const showMsgDots = () => $results.empty().append(SearchWidget.getSearchLoading());

			const showNoResults = () => {
				flags.isWait = true;
				$results.empty().append(SearchWidget.getSearchNoResults());
			};

			const $ptrRows = {_: []};

			const doSearch = () => {
				const srch = $iptSearch.val().trim();
				const MAX_RESULTS = 75; // hard cap results

				const index = this._board.availContent["Creature"];
				const results = index.search(srch, {
					fields: {
						n: {boost: 5, expand: true},
						s: {expand: true},
					},
					bool: "AND",
					expand: true,
				});
				const resultCount = results.length ? results.length : index.documentStore.length;
				const toProcess = results.length ? results : Object.values(index.documentStore.docs).slice(0, 75).map(it => ({doc: it}));

				$results.empty();
				$ptrRows._ = [];
				if (toProcess.length) {
					const handleClick = async r => {
						const name = r.doc.n;
						const source = r.doc.s;
						const count = getCount();
						if (isNaN(count) || count < 1) return;

						await pMakeRow({
							nameOrMeta: name,
							source,
							isRollHp: $cbRoll.prop("checked"),
						});
						if (count > 1) {
							for (let i = 1; i < count; ++i) {
								await pMakeRow({
									nameOrMeta: name,
									source,
									isRollHp: $cbRoll.prop("checked"),
								});
							}
						}
						doSort(cfg.sort);
						checkSetFirstActive({isSkipUpdateRound: true});
						doUpdateExternalStates();
						doClose();
					};

					const $getRow = (r) => {
						return $(`
							<div class="ui-search__row" tabindex="0">
								<span>${r.doc.n}</span>
								<span>${r.doc.s ? `<i title="${Parser.sourceJsonToFull(r.doc.s)}">${Parser.sourceJsonToAbv(r.doc.s)}${r.doc.p ? ` p${r.doc.p}` : ""}</i>` : ""}</span>
							</div>
						`);
					};

					if (flags.doClickFirst) {
						handleClick(toProcess[0]);
						flags.doClickFirst = false;
						return;
					}

					const res = toProcess.slice(0, MAX_RESULTS); // hard cap at 75 results

					res.forEach(r => {
						const $row = $getRow(r).appendTo($results);
						SearchWidget.bindRowHandlers({result: r, $row, $ptrRows, fnHandleClick: handleClick, $iptSearch});
						$ptrRows._.push($row);
					});

					if (resultCount > MAX_RESULTS) {
						const diff = resultCount - MAX_RESULTS;
						$results.append(`<div class="ui-search__row ui-search__row--readonly">...${diff} more result${diff === 1 ? " was" : "s were"} hidden. Refine your search!</div>`);
					}
				} else {
					if (!srch.trim()) showMsgIpt();
					else showNoResults();
				}
			};

			SearchWidget.bindAutoSearch($iptSearch, {
				flags,
				fnSearch: doSearch,
				fnShowWait: showMsgDots,
				$ptrRows,
			});

			$iptSearch.focus();
			doSearch();
		});

		function getStatColsState ($row) {
			return $row.find(`.dm-init__stat`).map((i, e) => {
				const $ipt = $(e).find(`input`);
				const isCb = $ipt.attr("type") === "checkbox";
				return {
					v: isCb ? $ipt.prop("checked") : $ipt.val(),
					id: $(e).attr("data-id"),
				};
			}).get();
		}

		function getSaveableState () {
			const rows = $wrpEntries.find(`.dm-init__row`).map((i, e) => {
				const $row = $(e);
				const $conds = $row.find(`.init__cond`);
				const $iptDisplayName = $row.find(`input.displayName`);
				const customName = $row.hasClass(`dm-init__row-rename`) ? $row.find(`.dm-init__row-link-name`).text() : null;
				const n = $iptDisplayName.length ? {
					n: $row.find(`input.name`).val(),
					d: $iptDisplayName.val(),
					scr: $row.find(`input.scaledCr`).val() || "",
					ssp: $row.find(`input.scaledSummonSpellLevel`).val() || "",
					scl: $row.find(`input.scaledSummonClassLevel`).val() || "",
				} : $row.find(`input.name`).val();
				const out = {
					n,
					k: getStatColsState($row),
					h: $row.find(`input.hp`).val(),
					g: $row.find(`input.hp-max`).val(),
					i: $row.find(`input.score`).val(),
					a: 0 + $row.hasClass(`dm-init__row-active`),
					s: $row.find(`input.source`).val(),
					c: $conds.length ? $conds.map((i, e) => $(e).data("getState")()).get() : [],
					v: $row.find(`.dm-init__btn_eye`).hasClass(`btn-primary`),
				};
				if (customName) out.m = customName;
				return out;
			}).get();
			return {
				r: rows,
				s: cfg.sort,
				d: cfg.dir,
				m: cfg.isRollHp,
				g: cfg.importIsRollGroups,
				p: cfg.importIsAddPlayers,
				a: cfg.importIsAppend,
				k: cfg.statsAddColumns,
				piHp: cfg.playerInitShowExactPlayerHp,
				piHm: cfg.playerInitShowExactMonsterHp,
				piV: cfg.playerInitHideNewMonster,
				piO: cfg.playerInitShowOrdinals,
				c: cfg.statsCols.filter(it => !it.isDeleted),
				n: $iptRound.val(),
			};
		}

		function getPlayerFriendlyState () {
			const visibleStatsCols = cfg.statsCols.filter(it => !it.isDeleted && it.v).map(({id, a, v}) => ({id, a, v})); // id, abbreviation, visibility mode (delete this later)

			const rows = $wrpEntries.find(`.dm-init__row`).map((i, e) => {
				const $row = $(e);

				// if the row is player-hidden
				if (!$row.find(`.dm-init__btn_eye`).hasClass(`btn-primary`)) return false;

				const isMonster = !!$row.find(`.dm-init__wrp-creature`).length;

				const statCols = getStatColsState($row);
				const statsVals = statCols.map(it => {
					const mappedCol = visibleStatsCols.find(sc => sc.id === it.id);
					if (mappedCol) {
						if (mappedCol.v === 1 || !isMonster) return it;
						else return {u: true}; // "unknown"
					} else return null;
				}).filter(Boolean);

				const $conds = $row.find(`.init__cond`);

				const out = {
					n: $row.find(`input.name`).val(),
					i: $row.find(`input.score`).val(),
					a: 0 + $row.hasClass(`dm-init__row-active`),
					c: $conds.length ? $conds.map((i, e) => $(e).data("getState")()).get() : [],
					k: statsVals,
				};

				if ($row.hasClass("dm-init__row-rename")) out.m = $row.find(`.dm-init__row-link-name`).text();

				const hp = Number($row.find(`input.hp`).val());
				const hpMax = Number($row.find(`input.hp-max`).val());
				if ((!isMonster && cfg.playerInitShowExactPlayerHp) || (isMonster && cfg.playerInitShowExactMonsterHp)) {
					out.h = hp;
					out.g = hpMax;
				} else {
					out.hh = isNaN(hp) || isNaN(hpMax) ? -1 : InitiativeTrackerUtil.getWoundLevel(100 * hp / hpMax);
				}
				if (cfg.playerInitShowOrdinals) out.o = $row.find(`.dm-init__number`).attr("data-number");

				return out;
			}).get().filter(Boolean);
			visibleStatsCols.forEach(it => delete it.v); // clean up any visibility mode flags
			return {
				r: rows,
				c: visibleStatsCols,
				n: $iptRound.val(),
			};
		}

		$wrpTracker.data("getState", getSaveableState);
		$wrpTracker.data("getSummary", () => {
			const nameList = $wrpEntries.find(`.dm-init__row`).map((i, e) => $(e).find(`input.name`).val()).get();
			const nameListFilt = nameList.filter(it => it.trim());
			return `${nameList.length} creature${nameList.length === 1 ? "" : "s"} ${nameListFilt.length ? `(${nameListFilt.slice(0, 3).join(", ")}${nameListFilt.length > 3 ? "..." : ""})` : ""}`;
		});

		function shiftActiveRow (direction) {
			const $rows = $wrpEntries.find(`.dm-init__row`);

			const $rowsActive = $rows.filter(`.dm-init__row-active`);

			(~direction ? $rowsActive.get() : $rowsActive.get().reverse())
				.forEach(e => {
					const $e = $(e);

					if (~direction) {
						// tick down any conditions
						const $conds = $e.find(`.init__cond`);
						if ($conds.length) $conds.each((i, e) => $(e).data("doTickDown")());
					}

					$e.removeClass(`dm-init__row-active`);
				});

			let ix = $rows.index($rowsActive.get(~direction ? $rowsActive.length - 1 : 0)) + direction;

			const nxt = $rows.get(ix);
			ix += direction;
			if (nxt) {
				const $nxt = $(nxt);
				let $curr = $nxt;
				do {
					// if names and initiatives are the same, skip forwards (groups of monsters)
					if ($curr.find(`input.name`).val() === $nxt.find(`input.name`).val()
						&& $curr.find(`input.score`).val() === $nxt.find(`input.score`).val()) {
						handleTurnStart($curr);
						const curr = $rows.get(ix);
						ix += direction;
						if (curr) $curr = $(curr);
						else $curr = null;
					} else break;
				} while ($curr);
			} else checkSetFirstActive();
			doUpdateExternalStates();
		}

		function setNextActive () { shiftActiveRow(1); }
		function setPrevActive () { shiftActiveRow(-1); }

		const handleTurnStart = ($row) => {
			$row.addClass(`dm-init__row-active`);
			if (cfg.statsAddColumns) {
				const cbMetas = cfg.statsCols.filter(c => c.p && (this._isCheckboxColAuto(c.p)));

				cbMetas.forEach(c => {
					const $lbl = $row.find(`[data-id=${c.id}]`);
					if (c.p === "cbAutoLow") {
						$lbl.find(`input`).prop("checked", false);
					} else if (c.p === "cbAutoHigh") {
						$lbl.find(`input`).prop("checked", true);
					}
				});
			}
		};

		const pMakeRow = async (opts) => {
			let {
				nameOrMeta,
				customName,
				hp,
				hpMax,
				init,
				isActive,
				source,
				conditions,
				isRollInit,
				isRollHp,
				statsCols,
				isVisible,
			} = Object.assign({
				nameOrMeta: "",
				customName: "",
				hp: "",
				hpMax: "",
				init: "",
				conditions: [],
				isRollInit: cfg.isRollInit,
				isRollHp: false,
				isVisible: !cfg.playerInitHideNewMonster,
			}, opts || {});

			const isMon = !!source;
			if (nameOrMeta instanceof Object) {
				// unpack saved
				nameOrMeta.name = nameOrMeta.name || nameOrMeta.n;
				nameOrMeta.displayName = nameOrMeta.displayName || nameOrMeta.d;
				nameOrMeta.scaledToCr = nameOrMeta.scaledToCr || (nameOrMeta.scr ? Number(nameOrMeta.scr) : null);
				nameOrMeta.scaledToSummonSpellLevel = nameOrMeta.scaledToSummonSpellLevel || (nameOrMeta.ssp ? Number(nameOrMeta.ssp) : null);
				nameOrMeta.scaledToSummonClassLevel = nameOrMeta.scaledToSummonClassLevel || (nameOrMeta.scl ? Number(nameOrMeta.scl) : null);
			}
			const displayName = nameOrMeta instanceof Object ? nameOrMeta.displayName : null;
			const name = nameOrMeta instanceof Object ? nameOrMeta.name : nameOrMeta;

			const $wrpRow = $(`<div class="dm-init__row ${isActive ? "dm-init__row-active" : ""} overflow-hidden"></div>`);

			const $wrpLhs = $(`<div class="dm-init__row-lhs"></div>`).appendTo($wrpRow);
			const $iptName = $(`<input class="form-control input-sm name dm-init__ipt-name dm-init-lockable dm-init__row-input ${isMon ? "hidden" : ""}" placeholder="Name">`)
				.disableSpellcheck()
				.val(name)
				.appendTo($wrpLhs);
			$iptName.on("change", () => {
				doSort(InitiativeTrackerConst.SORT_ORDER_ALPHA);
				doUpdateExternalStates();
			});
			if (isMon) {
				const $rows = $wrpEntries.find(`.dm-init__row`);
				const curMon = $rows.find(".dm-init__wrp-creature").filter((i, e) => $(e).parent().find(`input.name`).val() === name && $(e).parent().find(`input.source`).val() === source);
				let monNum = null;
				if (curMon.length) {
					const $dispsNumber = curMon.map((i, e) => $(e).find(`span[data-number]`).data("number"));
					if (curMon.length === 1 && !$dispsNumber.length) {
						const $r = $(curMon.get(0));
						$r.find(`.dm-init__wrp-creature-link`).append(`<span data-number="1" class="dm-init__number">(1)</span>`);
						monNum = 2;
					} else {
						monNum = $dispsNumber.get().reduce((a, b) => Math.max(Number(a), Number(b)), 0) + 1;
					}
				}

				const getLink = () => {
					if (typeof nameOrMeta === "string" || (nameOrMeta.scaledToCr == null && nameOrMeta.scaledToSummonSpellLevel == null && nameOrMeta.scaledToSummonClassLevel == null)) return Renderer.get().render(`{@creature ${name}|${source}}`);
					else {
						const parts = [name, source, displayName, nameOrMeta.scaledToCr != null ? `${VeCt.HASH_SCALED}=${Parser.numberToCr(nameOrMeta.scaledToCr)}` : nameOrMeta.scaledToSummonSpellLevel != null ? `${VeCt.HASH_SCALED_SPELL_SUMMON}=${nameOrMeta.scaledToSummonSpellLevel}` : nameOrMeta.scaledToSummonClassLevel != null ? `${VeCt.HASH_SCALED_CLASS_SUMMON}=${nameOrMeta.scaledToSummonClassLevel}` : null];
						return Renderer.get().render(`{@creature ${parts.join("|")}}`);
					}
				};

				const $monName = $(`
					<div class="dm-init__wrp-creature split">
						<span class="dm-init__wrp-creature-link">
							${$(getLink()).attr("tabindex", "-1")[0].outerHTML}
							${monNum ? ` <span data-number="${monNum}" class="dm-init__number">(${monNum})</span>` : ""}
						</span>
					</div>
				`).appendTo($wrpLhs);

				const setCustomName = (name) => {
					$monName.find(`a`).addClass("dm-init__row-link-name").text(name);
					$wrpRow.addClass("dm-init__row-rename");
				};

				if (customName) setCustomName(customName);

				const $wrpBtnsRhs = $(`<div></div>`).appendTo($monName);
				$(`<button class="btn btn-default btn-xs dm-init-lockable" title="Rename" tabindex="-1"><span class="glyphicon glyphicon-pencil"></span></button>`)
					.click(async () => {
						if (cfg.isLocked) return;
						const nuName = await InputUiUtil.pGetUserString({title: "Enter Name"});
						if (nuName == null || !nuName.trim()) return;
						setCustomName(nuName);
						doSort(cfg.sort);
					}).appendTo($wrpBtnsRhs);
				$(`<button class="btn btn-success btn-xs dm-init-lockable" title="Add Another (SHIFT for Roll New)" tabindex="-1"><span class="glyphicon glyphicon-plus"></span></button>`)
					.click(async (evt) => {
						if (cfg.isLocked) return;
						await pMakeRow({
							nameOrMeta,
							init: evt.shiftKey ? "" : $iptScore.val(),
							isActive: !evt.shiftKey && $wrpRow.hasClass("dm-init__row-active"),
							source,
							isRollHp: cfg.isRollHp,
							statsCols: evt.shiftKey ? null : getStatColsState($wrpRow),
							isVisible: $wrpRow.find(`.dm-init__btn_eye`).hasClass("btn-primary"),
						});
						doSort(cfg.sort);
					}).appendTo($wrpBtnsRhs);

				$(`<input class="source hidden" value="${source}">`).appendTo($wrpLhs);

				if (nameOrMeta instanceof Object && (nameOrMeta.scaledToCr != null || nameOrMeta.scaledToSummonSpellLevel != null || nameOrMeta.scaledToSummonClassLevel != null)) {
					$(`<input class="displayName hidden" value="${displayName}">`).appendTo($wrpLhs);
					if (nameOrMeta.scaledToCr != null) $(`<input class="scaledCr hidden" value="${nameOrMeta.scaledToCr}">`).appendTo($wrpLhs);
					if (nameOrMeta.scaledToSummonSpellLevel != null) $(`<input class="scaledSummonSpellLevel hidden" value="${nameOrMeta.scaledToSummonSpellLevel}">`).appendTo($wrpLhs);
					if (nameOrMeta.scaledToSummonClassLevel != null) $(`<input class="scaledSummonClassLevel hidden" value="${nameOrMeta.scaledToSummonClassLevel}">`).appendTo($wrpLhs);
				}
			}

			function addCondition (name, color, turns) {
				const $cond = InitiativeTrackerUtil.get$condition({
					name,
					color,
					turns,
					onStateChange: () => doUpdateExternalStates(),
				});
				$cond.appendTo($conds);
			}

			const $wrpConds = $(`<div class="split"></div>`).appendTo($wrpLhs);
			const $conds = $(`<div class="init__wrp_conds"></div>`).appendTo($wrpConds);
			$(`<button class="btn btn-warning btn-xs dm-init__row-btn dm-init__row-btn-flag" title="Add Condition" tabindex="-1"><span class="glyphicon glyphicon-flag"></span></button>`)
				.appendTo($wrpConds)
				.on("click", () => {
					const {$modalInner, doClose} = UiUtil.getShowModal({isMinHeight0: true});

					const $wrpRows = $(`<div class="dm-init__modal-wrp-rows"></div>`).appendTo($modalInner);

					const conds = InitiativeTrackerUtil.CONDITIONS;
					for (let i = 0; i < conds.length; i += 3) {
						const $row = $(`<div class="ve-flex-v-center mb-2"></div>`).appendTo($wrpRows);
						const populateCol = (cond) => {
							const $col = $(`<div class="col-4 text-center"></div>`).appendTo($row);
							if (cond) {
								$(`<button class="btn btn-default btn-xs dm-init__btn-cond" style="background-color: ${cond.color} !important;">${cond.name}</button>`).appendTo($col).click(() => {
									$iptName.val(cond.name);
									$iptColor.val(cond.color);
								});
							}
						};
						[conds[i], conds[i + 1], conds[i + 2]].forEach(populateCol);
					}

					$wrpRows.append(`<hr>`);

					$(`<div class="ve-flex-v-center mb-2">
						<div class="col-5 pr-2">Name (optional)</div>
						<div class="col-2 text-center">Color</div>
						<div class="col-5 pl-2">Duration (optional)</div>
					</div>`).appendTo($wrpRows);
					const $controls = $(`<div class="ve-flex-v-center mb-2"></div>`).appendTo($wrpRows);
					const [$wrpName, $wrpColor, $wrpTurns] = ["pr-2", "", "pl-2"].map(it => $(`<div class="col-${it ? 5 : 2} ${it} text-center"></div>`).appendTo($controls));
					const $iptName = $(`<input class="form-control">`)
						.on("keydown", (e) => {
							if (e.which === 13) $btnAdd.click();
						})
						.appendTo($wrpName);
					const $iptColor = $(`<input class="form-control" type="color" value="${MiscUtil.randomColor()}">`).appendTo($wrpColor);
					const $iptTurns = $(`<input class="form-control" type="number" step="1" min="1" placeholder="Unlimited">`)
						.on("keydown", (e) => {
							if (e.which === 13) $btnAdd.click();
						})
						.appendTo($wrpTurns);
					const $wrpAdd = $(`<div class="ve-flex-v-center">`).appendTo($wrpRows);
					const $wrpAddInner = $(`<div class="col-12 text-center">`).appendTo($wrpAdd);
					const $btnAdd = $(`<button class="btn btn-primary">Set Condition</button>`)
						.click(() => {
							addCondition($iptName.val().trim(), $iptColor.val(), $iptTurns.val());
							doClose();
						})
						.appendTo($wrpAddInner);
				});

			$(`<div class="dm-init__row-mid"></div>`).appendTo($wrpRow);

			const $wrpRhs = $(`<div class="dm-init__row-rhs"></div>`).appendTo($wrpRow);
			const hpVals = {
				curHp: hp,
				maxHp: hpMax,
			};

			const doUpdateHpColors = () => {
				const woundLevel = InitiativeTrackerUtil.getWoundLevel(100 * Number($iptHp.val()) / Number($iptHpMax.val()));
				if (~woundLevel) {
					const woundMeta = InitiativeTrackerUtil.getWoundMeta(woundLevel);
					$iptHp.css("color", woundMeta.color);
					$iptHpMax.css("color", woundMeta.color);
				} else {
					$iptHp.css("color", "");
					$iptHpMax.css("color", "");
				}
			};

			const $iptHp = $(`<input class="form-control input-sm hp dm-init__row-input text-right dm-init__hp dm-init__hp--current" value="${hpVals.curHp}">`)
				.change(() => {
					handleMathInput($iptHp, "curHp");
					doUpdateExternalStates();
					doUpdateHpColors();
				})
				.click(() => $iptHp.select())
				.appendTo($wrpRhs);
			$wrpRhs.append(`<div class="dm-init__hp_slash">/</div>`);
			const $iptHpMax = $(`<input class="form-control input-sm hp-max dm-init__row-input dm-init__hp dm-init__hp--max" value="${hpVals.maxHp}">`)
				.change(() => {
					handleMathInput($iptHpMax, "maxHp");
					doUpdateExternalStates();
					doUpdateHpColors();
				})
				.click(() => $iptHpMax.select())
				.appendTo($wrpRhs);

			doUpdateHpColors();

			const $iptScore = $(`<input class="form-control input-sm score dm-init-lockable dm-init__row-input text-center dm-init__ipt--rhs" type="number">`)
				.on("change", () => doSort(InitiativeTrackerConst.SORT_ORDER_NUM))
				.click(() => $iptScore.select())
				.val(init)
				.appendTo($wrpRhs);

			if (isMon && (hpVals.curHp === "" || hpVals.maxHp === "" || init === "")) {
				const doUpdate = async () => {
					const m = await DataLoader.pCacheAndGet(UrlUtil.PG_BESTIARY, source, hash);

					// set or roll HP
					if (!isRollHp && m.hp.average) {
						hpVals.curHp = hpVals.maxHp = m.hp.average;
						$iptHp.val(hpVals.curHp);
						$iptHpMax.val(hpVals.maxHp);
					} else if (isRollHp && m.hp.formula) {
						const roll = await Renderer.dice.pRoll2(m.hp.formula, {
							isUser: false,
							name: getRollName(m),
							label: "HP",
						}, {isResultUsed: true});
						hpVals.curHp = hpVals.maxHp = roll;
						$iptHp.val(roll);
						$iptHpMax.val(roll);
					}

					// roll initiative
					if (!init && isRollInit) {
						$iptScore.val(await pRollInitiative(m));
					}

					doUpdateHpColors();
				};

				const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_BESTIARY]({name: name, source: source});
				await doUpdate();
			}

			const handleMathInput = ($ipt, prop) => {
				const nxt = $ipt.val().trim();
				if (nxt && /^[-+0-9]*$/.exec(hpVals[prop]) && /^[-+0-9]*$/.exec(nxt)) {
					const m = /^[+-]\d+/.exec(nxt);
					const parts = nxt.split(/([+-]\d+)/).filter(it => it);
					let temp = 0;
					parts.forEach(p => temp += Number(p));
					if (m) {
						hpVals[prop] = Number(hpVals[prop]) + temp;
					} else if (/[-+]/.exec(nxt)) {
						hpVals[prop] = temp;
					} else {
						hpVals[prop] = Number(nxt);
					}
					$ipt.val(hpVals[prop]);
				} else hpVals[prop] = nxt;
			};

			InitiativeTrackerUi.$getBtnPlayerVisible(isVisible, doUpdateExternalStates, false, "dm-init__row-btn", "dm-init__btn_eye")
				.appendTo($wrpRhs);

			$(`<button class="btn btn-danger btn-xs dm-init__row-btn dm-init-lockable" title="Delete" tabindex="-1"><span class="glyphicon glyphicon-trash"></span></button>`)
				.appendTo($wrpRhs)
				.on("click", () => {
					if (cfg.isLocked) return;
					if ($wrpRow.hasClass(`dm-init__row-active`) && $wrpEntries.find(`.dm-init__row`).length > 1) setNextActive();
					$wrpRow.remove();
					doUpdateExternalStates();
				});

			populateRowStatCols($wrpRow, statsCols);
			conditions.forEach(c => addCondition(c.name, c.color, c.turns));
			$wrpRow.appendTo($wrpEntries);

			doUpdateExternalStates();

			return $wrpRow;
		};

		const populateRowStatCols = ($row, statsCols) => {
			const $mid = $row.find(`.dm-init__row-mid`);

			if (!cfg.statsAddColumns) return $mid.empty();

			const name = $row.find(`.name`).val();
			const source = $row.find(`.source`).val();
			const isMon = !!source;

			const existing = (() => {
				const existing = {};
				if (statsCols) {
					statsCols.forEach(it => existing[it.id] = {id: it.id, v: it.v});
				} else {
					$mid.find(`.dm-init__stat`).each((i, e) => {
						const $e = $(e);
						const id = $e.attr("data-id");
						const $ipt = $e.find(`input`);

						// avoid race conditions -- the input is still to be populated
						if ($ipt.attr("populate-running") === "true") return;

						const isCb = $ipt.attr("type") === "checkbox";
						existing[id] = {
							v: isCb ? $ipt.prop("checked") : $ipt.val(),
							id,
						};
					});
				}
				return existing;
			})();

			$mid.empty();

			cfg.statsCols.forEach(c => {
				const isCheckbox = c.p && (this._isCheckboxCol(c.p));
				const $ipt = (() => {
					if (isCheckbox) {
						const $cb = $(`<input type="checkbox" class="dm-init__stat_ipt" ${!cfg.isLocked && (c.e || !isMon) ? "" : "disabled"}>`)
							.change(() => doUpdateExternalStates());

						const populate = () => {
							const meta = STAT_COLUMNS[c.p];
							$cb.prop("checked", meta.getCellValue());
							doUpdateExternalStates();
						};

						if (c.p && c.po && isMon) { // on changing populate type, re-populate
							populate();
						} else if (existing[c.id]) { // otherwise (or for players) use existing value
							$cb.prop("checked", existing[c.id].v);
						} else if (c.p) { // otherwise, populate
							populate();
						}

						return $cb;
					} else {
						const $ipt = $(`<input class="form-control input-sm dm-init__stat_ipt text-center" ${!cfg.isLocked && (c.e || !isMon) ? "" : "disabled"}>`)
							.change(() => doUpdateExternalStates());

						const populateFromBlock = () => {
							const meta = STAT_COLUMNS[c.p];
							if (isMon && meta) {
								$ipt.attr("populate-running", true);
								const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_BESTIARY]({name: name, source: source});
								const populateStats = async () => {
									const mon = await DataLoader.pCacheAndGet(UrlUtil.PG_BESTIARY, source, hash);
									$ipt.val(meta.getCellValue(mon));
									$ipt.removeAttr("populate-running");
									doUpdateExternalStates();
								};
								populateStats();
							}
						};

						if (c.p && c.po && isMon) { // on changing populate type, re-populate
							populateFromBlock();
						} else if (existing[c.id]) { // otherwise (or for players) use existing value
							$ipt.val(existing[c.id].v);
						} else if (c.p) { // otherwise, populate
							populateFromBlock();
						}
						return $ipt;
					}
				})();

				const eleType = isCheckbox ? "label" : "div";
				$$`<${eleType} class="dm-init__stat ${isCheckbox ? "ve-flex-vh-center" : ""}" data-id="${c.id}">${$ipt}</${eleType}>`.appendTo($mid);
			});
		};

		const handleStatColsChange = () => {
			const $wrpHead = $wrpHeader.find(`.dm-init__row-mid`).empty();

			if (cfg.statsAddColumns) {
				cfg.statsCols.forEach(c => {
					$wrpHead.append(`<div class="dm-init__stat_head" ${c.p && STAT_COLUMNS[c.p] ? `title="${STAT_COLUMNS[c.p].name}"` : ""}>${c.a || ""}</div>`);
				});
			}

			const $rows = $wrpEntries.find(`.dm-init__row`);
			$rows.each((i, e) => populateRowStatCols($(e)));
			cfg.statsCols.forEach(c => c.po = null);
		};

		function checkSetFirstActive ({isSkipUpdateRound = false} = {}) {
			if ($wrpEntries.find(`.dm-init__row`).length && !$wrpEntries.find(`.dm-init__row-active`).length) {
				const $rows = $wrpEntries.find(`.dm-init__row`);
				const $first = $($rows.get(0));
				handleTurnStart($first);
				if ($rows.length > 1) {
					for (let i = 1; i < $rows.length; ++i) {
						const $nxt = $($rows.get(i));
						if ($nxt.find(`input.name`).val() === $first.find(`input.name`).val()
							&& $nxt.find(`input.score`).val() === $first.find(`input.score`).val()) {
							handleTurnStart($nxt);
						} else break;
					}
				}

				if (!isSkipUpdateRound) $iptRound.val(Number($iptRound.val() || 0) + 1);

				doUpdateExternalStates();
			}
		}

		function doSort (mode) {
			if (cfg.sort !== mode) return;
			const sorted = $wrpEntries.find(`.dm-init__row`).sort((a, b) => {
				let aVal;
				let bVal;

				if (cfg.sort === InitiativeTrackerConst.SORT_ORDER_ALPHA && $(a).hasClass("dm-init__row-rename")) {
					aVal = $(a).find(".dm-init__row-link-name").text();
				} else aVal = $(a).find(`input.${cfg.sort === InitiativeTrackerConst.SORT_ORDER_ALPHA ? "name" : "score"}`).val();
				if (cfg.sort === InitiativeTrackerConst.SORT_ORDER_ALPHA && $(b).hasClass("dm-init__row-rename")) {
					bVal = $(b).find(".dm-init__row-link-name").text();
				} else bVal = $(b).find(`input.${cfg.sort === InitiativeTrackerConst.SORT_ORDER_ALPHA ? "name" : "score"}`).val();

				let first = 0;
				let second = 0;
				if (cfg.sort === InitiativeTrackerConst.SORT_ORDER_NUM) {
					aVal = Number(aVal);
					bVal = Number(bVal);
					first = cfg.dir === InitiativeTrackerConst.SORT_DIR_ASC ? SortUtil.ascSort(aVal, bVal) : SortUtil.ascSort(bVal, aVal);
				} else {
					let aVal2 = 0;
					let bVal2 = 0;

					const $aNum = $(a).find(`span[data-number]`);
					if ($aNum.length) aVal2 = $aNum.data("number");
					const $bNum = $(b).find(`span[data-number]`);
					if ($bNum.length) bVal2 = $bNum.data("number");

					first = cfg.dir === InitiativeTrackerConst.SORT_DIR_ASC ? SortUtil.ascSortLower(aVal, bVal) : SortUtil.ascSortLower(bVal, aVal);
					second = cfg.dir === InitiativeTrackerConst.SORT_DIR_ASC ? SortUtil.ascSort(aVal2, bVal2) : SortUtil.ascSort(bVal2, aVal2);
				}
				return first || second;
			});
			$wrpEntries.append(sorted);
			doUpdateExternalStates();
		}

		function flipDir () {
			cfg.dir = cfg.dir === InitiativeTrackerConst.SORT_DIR_ASC ? InitiativeTrackerConst.SORT_DIR_DESC : InitiativeTrackerConst.SORT_DIR_ASC;
		}

		function doReset () {
			$wrpEntries.empty();
			cfg.sort = InitiativeTrackerConst.SORT_ORDER_NUM;
			cfg.dir = InitiativeTrackerConst.SORT_DIR_DESC;
			$(`.dm-init__rounds`).val(1);
			doUpdateExternalStates();
		}

		let firstLoad = true;
		async function pLoadState (state, noReset) {
			if (!firstLoad && !noReset) doReset();
			firstLoad = false;

			for (const row of (state.r || [])) {
				await pMakeRow({
					nameOrMeta: row.n,
					customName: row.m,
					hp: row.h,
					hpMax: row.g,
					init: row.i,
					isActive: row.a,
					source: row.s,
					conditions: row.c,
					statsCols: row.k,
					isVisible: row.v,
					isRollInit: row.i == null && cfg.isRollInit,
				});
			}

			doSort(cfg.sort);
			checkSetFirstActive({isSkipUpdateRound: true});
			handleStatColsChange();
			doUpdateExternalStates();
			if (!firstLoad && !noReset) $(`.dm-init__rounds`).val(1);
		}

		function getRollName (monster) {
			return `Initiative Tracker \u2014 ${monster.name}`;
		}

		function pRollInitiative (monster) {
			return Renderer.dice.pRoll2(`1d20${Parser.getAbilityModifier(monster.dex)}`, {
				isUser: false,
				name: getRollName(monster),
				label: "Initiative",
			}, {isResultUsed: true});
		}

		async function pGetOrRollHp (monster) {
			if (!cfg.isRollHp && monster.hp.average) {
				return `${monster.hp.average}`;
			} else if (cfg.isRollHp && monster.hp.formula) {
				return `${await Renderer.dice.pRoll2(monster.hp.formula, {
					isUser: false,
					name: getRollName(monster),
					label: "HP",
				}, {isResultUsed: true})}`;
			}
			return "";
		}

		async function pDoLoadEncounter ({entityInfos, encounterInfo}) {
			const toLoad = {
				s: InitiativeTrackerConst.SORT_ORDER_NUM,
				d: InitiativeTrackerConst.SORT_DIR_DESC,
				m: false,
				g: true,
				r: [],
			};

			if (cfg.importIsAddPlayers) {
				if (encounterInfo.isAdvanced) { // advanced encounter builder
					if (encounterInfo.playersAdvanced) {
						const colNameIndex = {};
						encounterInfo.colsExtraAdvanced = encounterInfo.colsExtraAdvanced || [];
						if (encounterInfo.colsExtraAdvanced.length) cfg.statsAddColumns = true;

						encounterInfo.colsExtraAdvanced.forEach((col, i) => colNameIndex[i] = (col?.name || "").toLowerCase());

						// mark all old stats cols for deletion
						cfg.statsCols.forEach(col => col.isDeleted = true);

						const colIndex = {};
						let hpIndex = null;
						encounterInfo.colsExtraAdvanced.forEach((col, i) => {
							let colName = col?.name || "";
							if (colName.toLowerCase() === "hp") {
								hpIndex = i;
								return;
							}
							const populateEntry = Object.entries(STAT_COLUMNS).find(([_, v]) => v?.abv && v.abv.toLowerCase() === colName.toLowerCase());

							const newCol = {
								id: CryptUtil.uid(),
								e: true, // editable
								v: 2, // is player-visible (0 = none, 1 = all, 2 = player units only)

								// input data
								p: populateEntry ? populateEntry[0] : "", // populate with...
								po: null, // populate with... (previous value)
								a: colName, // abbreviation
							};
							colIndex[i] = newCol;
							cfg.statsCols.push(newCol);
						});

						encounterInfo.playersAdvanced.forEach(playerDetails => {
							const row = {
								n: playerDetails.name || "", // name
								i: "", // score
								a: 0, // is active?
								c: [], // conditions
								v: true,
							};

							if (playerDetails.extras?.length) { // extra stats
								row.k = playerDetails.extras.map((extra, i) => {
									const val = extra?.value || "";
									if (i === hpIndex) return null;
									return {id: colIndex[i].id, v: val || ""};
								}).filter(Boolean);

								if (hpIndex != null) {
									[row.h, row.g] = (playerDetails.extras[hpIndex]?.value || "")
										.split("/")
										.map(it => it.trim());
									if (row.g == null) row.g = row.h;
								} else row.h = row.g = "";
							} else row.h = row.g = "";

							toLoad.r.push(row);
						});
					}
				} else {
					if (encounterInfo.playersSimple) {
						encounterInfo.playersSimple.forEach(playerGroup => {
							[...new Array(playerGroup.count || 1)].forEach(() => {
								toLoad.r.push({
									n: ``,
									h: "",
									g: "",
									i: "",
									a: 0,
									c: [],
									v: true,
								});
							});
						});
					}
				}
			}

			if (entityInfos?.length) {
				await entityInfos
					.filter(Boolean)
					.pSerialAwaitMap(async it => {
						const groupInit = cfg.importIsRollGroups && cfg.isRollInit ? await pRollInitiative(it.entity) : null;
						const groupHp = cfg.importIsRollGroups ? await pGetOrRollHp(it.entity) : null;

						await Promise.all([...new Array(it.count || 1)].map(async () => {
							const hp = `${cfg.importIsRollGroups ? groupHp : await pGetOrRollHp(it.entity)}`;
							toLoad.r.push({
								n: {
									name: it.entity.name,
									displayName: it.entity._displayName,
									scaledToCr: it.entity._scaledCr,
									scaledToSummonSpellLevel: it.entity._summonedBySpell_level,
									scaledToSummonClassLevel: it.entity._summonedByClass_level,
								},
								i: cfg.isRollInit ? `${cfg.importIsRollGroups ? groupInit : await pRollInitiative(it.entity)}` : null,
								a: 0,
								s: it.entity.source,
								c: [],
								h: hp,
								g: hp,
							});
						}));
					});
			}

			await pLoadState(toLoad, cfg.importIsAppend);
		}

		$wrpTracker.data("pDoLoadEncounter", ({entityInfos, encounterInfo}) => pDoLoadEncounter({entityInfos, encounterInfo}));

		pLoadState(this._savedState)
			.then(() => doSort(cfg.sort));

		return $wrpTracker;
	}

	/* -------------------------------------------- */

	_isCheckboxCol (key) {
		return key === "cbAutoLow" || key === "cbNeutral" || key === "cbAutoHigh";
	}

	_isCheckboxColAuto (key) {
		return key === "cbAutoLow" || key === "cbAutoHigh";
	}

	/* -------------------------------------------- */

	static make$Tracker (board, savedState) {
		return new this({board, savedState}).render();
	}
}
