"use strict";

class RenderDecks {
	static SETTINGS = {
		cardLayout: new SettingsUtil.EnumSetting({
			type: "enum",
			name: "Card Layout",
			help: `The layout to use when displaying cards in a deck.`,
			defaultVal: "list",
			enumVals: [
				{
					value: "list",
					name: "List",
				},
				{
					value: "grid",
					name: "Grid",
				},
			],
		}),
	};

	static getCardTextHtml ({card}) {
		const ptText = Renderer.get()
			.setFirstSection(true)
			.setPartPageExpandCollapseDisabled(true)
			.render({name: card.name, entries: card.entries}, 1);
		Renderer.get().setPartPageExpandCollapseDisabled(false);
		return ptText;
	}

	static getRenderedDeckMeta (
		ent,
		{
			settingsManager,

			cardStateManager,
		} = {},
	) {
		const fnsCleanup = [];

		const hashDeck = UrlUtil.autoEncodeHash(ent);

		const $rowsCards = ent.cards
			.map((card, ixCard) => {
				const ptText = this.getCardTextHtml({card});

				const $btnViewer = $(`<button class="btn btn-default btn-xs" title="Open Card Viewer"><span class="glyphicon glyphicon-eye-open"></span></button>`)
					.click(async evt => {
						evt.stopPropagation();
						try {
							$btnViewer.prop("disabled", true);
							await RenderDecks.pRenderStgCard({card});
						} finally {
							$btnViewer.prop("disabled", false);
						}
					});

				const $wrpFace = $$`<div class="no-shrink px-1 decks__wrp-card-face relative">
					<div class="absolute pt-2 pr-2 decks__wrp-btn-show-card">${$btnViewer}</div>
					${Renderer.get().setFirstSection(true).render({...card.face, title: card.name, altText: card.name})}
				</div>`;

				const propCardDrawn = cardStateManager.getPropCardDrawn({hashDeck, ixCard});
				const hkCardDrawn = cardStateManager.addHookBase(propCardDrawn, () => {
					const isDrawn = !!cardStateManager.get(propCardDrawn);
					$wrpFace.toggleClass("decks__wrp-card-face--drawn", isDrawn);
					$wrpFace.find("img").title(isDrawn ? `${card.name} (Drawn)` : card.name);
				});
				fnsCleanup.push(() => cardStateManager.removeHookBase(propCardDrawn, hkCardDrawn));
				hkCardDrawn();

				return $$`<div class="ve-flex-v-center decks__wrp-row">
					${$wrpFace}
					<div class="ml-2 decks__wrp-card-text">${ptText}</div>
				</div>`;
			});

		const $wrpCardRows = $$`<div class="decks__wrp-card-rows">
			${$rowsCards}
		</div>`;

		const $ptCards = $$`<div class="ve-flex-col">
			<h3 class="dnd-font my-0 mb-1 decks__h-cards">Cards</h3>
			${$wrpCardRows}
		</div>`;

		const hkCardLayout = settingsManager.addHookBase("cardLayout", () => {
			const mode = settingsManager.get("cardLayout");
			$wrpCardRows.toggleClass(`decks__wrp-card-rows--list`, false);
			$wrpCardRows.toggleClass(`decks__wrp-card-rows--grid`, false);
			$wrpCardRows.toggleClass(`decks__wrp-card-rows--${mode}`);
		});
		fnsCleanup.push(() => settingsManager.removeHookBase("cardLayout", hkCardLayout));
		hkCardLayout();

		const $ele = $$`
		${Renderer.utils.getBorderTr()}
		${Renderer.utils.getExcludedTr({entity: ent, dataProp: "deck"})}
		${Renderer.utils.getNameTr(ent, {page: UrlUtil.PG_DECKS})}

		<tr class="text"><td colspan="6">
			${Renderer.get().setFirstSection(true).render({entries: ent.entries}, 1)}
			<hr class="hr-3">
			${$ptCards}
		</td></tr>

		${Renderer.utils.getPageTr(ent)}
		${Renderer.utils.getBorderTr()}`;

		return {$ele, fnsCleanup};
	}

	/* -------------------------------------------- */

	static async pRenderStgCard ({card}) {
		const imgUrl = Renderer.utils.getMediaUrl(card.face, "href", "img");

		const imgCard = await AnimationUtil.pLoadImage(imgUrl);
		e_({
			ele: imgCard,
			clazz: "decks-draw__img-card",
			title: card.name,
		});

		const dispGlint = e_({
			tag: "div",
			clazz: "decks-draw__disp-glint no-events no-select w-100 h-100 absolute",
		});

		const wrpCard = e_({
			tag: "div",
			clazz: "decks-draw__wrp-card relative",
			children: [
				imgCard,
				dispGlint,
			],
		});

		const $wrpCardSway = $$`<div class="decks-draw__wrp-card-sway ve-flex-col no-select relative">${wrpCard}</div>`
			.click(evt => evt.stopPropagation());

		const metasSparkles = await [...new Array(8)]
			.pSerialAwaitMap(async (_, i) => {
				const imgSparkle = i % 2
					? await AnimationUtil.pLoadImage(`${Renderer.get().baseUrl}img/decks/page/medium-2.webp`)
					: await AnimationUtil.pLoadImage(`${Renderer.get().baseUrl}img/decks/page/medium-1.webp`);

				e_({
					ele: imgSparkle,
					clazz: "decks-draw__img-sparkle relative",
				});

				imgSparkle.style.animationDuration = `${4_500 + (Math.random() * 3_000)}ms, ${60_000 + (Math.random() * 60_000)}ms`;
				imgSparkle.style.animationDelay = `-${i + 1}00ms, -${i + 1}00ms`;

				const wrpSparkleSway = e_({
					tag: "div",
					clazz: "decks-draw__wrp-sparkle-sway ve-flex-col absolute",
					children: [
						imgSparkle,
					],
				});

				wrpSparkleSway.style.top = `${-10 + (120 * Math.random())}%`;
				wrpSparkleSway.style.left = `${-10 + (120 * Math.random())}%`;

				wrpSparkleSway.style.width = `min(67%, ${imgSparkle.width}px)`;
				wrpSparkleSway.style.height = `min(67%, ${imgSparkle.height}px)`;

				wrpSparkleSway.style.animationDuration = `${10_000 + (Math.random() * 4_000)}ms`;
				wrpSparkleSway.style.animationDelay = `-${3_000 + (Math.random() * 1_500)}ms`;

				return {wrpSparkleSway, imgSparkle};
			});

		const $wrpCardOuter = $$`<div class="ve-flex-col no-select relative">
			${metasSparkles.map(it => it.wrpSparkleSway)}
			${$wrpCardSway}
		</div>`;

		const ptText = RenderDecks.getCardTextHtml({card});
		const $wrpInfo = $$`<div class="stats stats--book decks-draw__wrp-desc mobile__hidden px-2 text-center">${ptText}</div>`
			.click(evt => evt.stopPropagation());

		const $wrpDrawn = $$`<div class="decks-draw__stg ve-flex-vh-center">
			<div class="ve-flex-v-center">
				${$wrpCardOuter}
				${$wrpInfo}
			</div>
		</div>`
			.click(evt => {
				evt.stopPropagation();
				$wrpDrawn.remove();
			})
			.mousemove(evt => {
				const mouseX = EventUtil.getClientX(evt);
				const mouseY = EventUtil.getClientY(evt);

				requestAnimationFrame(() => {
					this._pRenderStgCard_onMouseMove_mutElements({mouseX, mouseY, wrpCard, dispGlint});
				});
			});

		const {x: mouseX, y: mouseY} = EventUtil.getMousePos();
		this._pRenderStgCard_onMouseMove_mutElements({mouseX, mouseY, wrpCard, dispGlint});

		$wrpDrawn.appendTo(document.body);

		await AnimationUtil.pRecomputeStyles();

		$wrpDrawn.addClass("decks-draw__stg--visible");
		wrpCard.classList.add("decks-draw__wrp-card--visible");
		$wrpInfo.addClass("decks-draw__wrp-desc--visible");
		metasSparkles.forEach(it => it.imgSparkle.classList.add("decks-draw__img-sparkle--visible"));
	}

	static _pRenderStgCard_onMouseMove_mutElements ({mouseX, mouseY, wrpCard, dispGlint}) {
		const perStyles = this._pRenderStgCard_getPerspectiveStyles({mouseX, mouseY, ele: wrpCard});
		wrpCard.style.transform = perStyles.cardTransform;
		dispGlint.style.background = perStyles.glintBackground;
	}

	static _pRenderStgCard_getPerspectiveStyles ({mouseX, mouseY, ele}) {
		const bcr = ele.getBoundingClientRect();
		const hView = window.innerHeight;

		const cCenterX = bcr.left + bcr.width / 2;
		const cCenterY = bcr.top + bcr.height / 2;

		const cMouseX = mouseX - cCenterX;
		const cMouseY = (hView - mouseY) - (hView - cCenterY);

		const scaleFactor = hView * 2;

		const rotX = cMouseY / scaleFactor;
		const rotY = cMouseX / scaleFactor;

		return {
			...this._pRenderStgCard_getPerspectiveStyles_card({mouseX, mouseY, bcr, hView, rotX, rotY}),
			...this._pRenderStgCard_getPerspectiveStyles_glint({mouseX, mouseY, bcr, hView, rotX, rotY}),
		};
	}

	static _pRenderStgCard_getPerspectiveStyles_card ({rotX, rotY}) {
		return {
			cardTransform: `perspective(100vh) rotateX(${rotX}rad) rotateY(${rotY}rad)`,
		};
	}

	static _pRenderStgCard_getPerspectiveStyles_glint ({mouseX, mouseY, bcr, hView, rotX, rotY}) {
		const cCenterX = bcr.left + bcr.width / 2;
		const cCenterY = bcr.top + bcr.height / 2;

		const cMouseX = mouseX - cCenterX;
		const cMouseY = (hView - mouseY) - (hView - cCenterY);

		const glintDist = Math.sqrt(Math.pow(cMouseX, 2) + Math.pow(cMouseY, 2));
		const glintDistRatio = glintDist / hView;

		const pctLeft = ((mouseX - bcr.left) / bcr.width) * 100;
		const pctTop = ((mouseY - bcr.top) / bcr.height) * 100;

		const pctLeftClamped = Math.max(0, Math.min(100, pctLeft));
		const pctTopClamped = Math.max(0, Math.min(100, pctTop));

		const glintOpacityFalloff = glintDistRatio * 0.33;

		const gradSpot = `radial-gradient(
			circle at left ${pctLeftClamped}% top ${pctTopClamped}%,
			rgba(255, 255, 255, 0.73) 0%,
			rgba(255, 255, 255, ${1.0 - glintOpacityFalloff}) 1%,
			rgba(255, 255, 255, ${1.0 - glintOpacityFalloff}) ${1 + (glintDistRatio * 2)}%,
			rgba(255, 255, 255, 0.53) ${2 + (glintDistRatio * 2)}%,
			transparent ${5 + (glintDistRatio * 13)}%
		)`;

		const gradSpotInv = `radial-gradient(
			circle at left ${100 - pctLeftClamped}% top ${100 - pctTopClamped}%,
			#fff2 0%,
			#fff2 ${10 + (glintDistRatio * 2)}%,
			transparent ${20 + (glintDistRatio * 5)}%
		)`;

		const gradEdge = `linear-gradient(
			${-rotX + rotY}rad,
			var(--rgb-card-glint--edge) 0%,
			transparent 4%,
			transparent 96%,
			var(--rgb-card-glint--edge) 100%
		)`;

		return {
			glintBackground: `${gradSpot}, ${gradSpotInv}, ${gradEdge}`,
		};
	}
}
