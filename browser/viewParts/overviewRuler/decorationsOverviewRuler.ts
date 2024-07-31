/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as themes from 'vs/platform/theme/common/themes';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { ViewPart } from 'vs/editor/browser/view/viewPart';
import { OverviewRulerImpl } from 'vs/editor/browser/viewParts/overviewRuler/overviewRulerImpl';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import { IRenderingContext, IRestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { Position } from 'vs/editor/common/core/position';

export class DecorationsOverviewRuler extends ViewPart {

	static MIN_DECORATION_HEIGHT = 6;
	static MAX_DECORATION_HEIGHT = 60;

	private static _CURSOR_COLOR = 'rgba(0, 0, 102, 0.8)';
	private static _CURSOR_COLOR_DARK = 'rgba(152, 152, 152, 0.8)';

	private _overviewRuler: OverviewRulerImpl;

	private _shouldUpdateDecorations: boolean;
	private _shouldUpdateCursorPosition: boolean;

	private _hideCursor: boolean;
	private _cursorPositions: Position[];

	private _zonesFromDecorations: editorCommon.OverviewRulerZone[];
	private _zonesFromCursors: editorCommon.OverviewRulerZone[];

	constructor(context: ViewContext, scrollHeight: number, getVerticalOffsetForLine: (lineNumber: number) => number) {
		super(context);
		this._overviewRuler = new OverviewRulerImpl(
			1,
			'decorationsOverviewRuler',
			scrollHeight,
			this._context.configuration.editor.lineHeight,
			this._context.configuration.editor.viewInfo.canUseTranslate3d,
			DecorationsOverviewRuler.MIN_DECORATION_HEIGHT,
			DecorationsOverviewRuler.MAX_DECORATION_HEIGHT,
			getVerticalOffsetForLine
		);
		this._overviewRuler.setLanesCount(this._context.configuration.editor.viewInfo.overviewRulerLanes, false);
		let theme = this._context.configuration.editor.viewInfo.theme;
		this._overviewRuler.setUseDarkColor(!themes.isLightTheme(theme), false);

		this._shouldUpdateDecorations = true;
		this._zonesFromDecorations = [];

		this._shouldUpdateCursorPosition = true;
		this._hideCursor = this._context.configuration.editor.viewInfo.hideCursorInOverviewRuler;

		this._zonesFromCursors = [];
		this._cursorPositions = [];
	}

	public dispose(): void {
		super.dispose();
		this._overviewRuler.dispose();
	}

	// ---- begin view event handlers

	public onCursorPositionChanged(e: editorCommon.IViewCursorPositionChangedEvent): boolean {
		this._shouldUpdateCursorPosition = true;
		this._cursorPositions = [e.position];
		this._cursorPositions = this._cursorPositions.concat(e.secondaryPositions);
		return true;
	}

	public onConfigurationChanged(e: editorCommon.IConfigurationChangedEvent): boolean {
		let prevLanesCount = this._overviewRuler.getLanesCount();
		let newLanesCount = this._context.configuration.editor.viewInfo.overviewRulerLanes;

		let shouldRender = false;

		if (e.lineHeight) {
			this._overviewRuler.setLineHeight(this._context.configuration.editor.lineHeight, false);
			shouldRender = true;
		}

		if (e.viewInfo.canUseTranslate3d) {
			this._overviewRuler.setCanUseTranslate3d(this._context.configuration.editor.viewInfo.canUseTranslate3d, false);
			shouldRender = true;
		}

		if (prevLanesCount !== newLanesCount) {
			this._overviewRuler.setLanesCount(newLanesCount, false);
			shouldRender = true;
		}

		if (e.viewInfo.hideCursorInOverviewRuler) {
			this._hideCursor = this._context.configuration.editor.viewInfo.hideCursorInOverviewRuler;
			this._shouldUpdateCursorPosition = true;
			shouldRender = true;
		}

		if (e.viewInfo.theme) {
			let theme = this._context.configuration.editor.viewInfo.theme;
			this._overviewRuler.setUseDarkColor(!themes.isLightTheme(theme), false);
			shouldRender = true;
		}

		return shouldRender;
	}

	public onLayoutChanged(layoutInfo: editorCommon.EditorLayoutInfo): boolean {
		this._overviewRuler.setLayout(layoutInfo.overviewRuler, false);
		return true;
	}

	public onZonesChanged(): boolean {
		return true;
	}

	public onModelFlushed(): boolean {
		this._shouldUpdateCursorPosition = true;
		this._shouldUpdateDecorations = true;
		return true;
	}

	public onModelDecorationsChanged(e: editorCommon.IViewDecorationsChangedEvent): boolean {
		this._shouldUpdateDecorations = true;
		return true;
	}

	public onScrollChanged(e: editorCommon.IScrollEvent): boolean {
		this._overviewRuler.setScrollHeight(e.scrollHeight, false);
		return super.onScrollChanged(e) || e.scrollHeightChanged;
	}

	// ---- end view event handlers

	public getDomNode(): HTMLElement {
		return this._overviewRuler.getDomNode();
	}

	private _createZonesFromDecorations(): editorCommon.OverviewRulerZone[] {
		let decorations = this._context.model.getAllOverviewRulerDecorations();
		let zones: editorCommon.OverviewRulerZone[] = [];

		for (let i = 0, len = decorations.length; i < len; i++) {
			let dec = decorations[i];
			let ovewviewRuler = dec.source.options.overviewRuler;
			zones.push(new editorCommon.OverviewRulerZone(
				dec.range.startLineNumber,
				dec.range.endLineNumber,
				ovewviewRuler.position,
				0,
				ovewviewRuler.color,
				ovewviewRuler.darkColor
			));
		}

		return zones;
	}

	private _createZonesFromCursors(): editorCommon.OverviewRulerZone[] {
		let zones: editorCommon.OverviewRulerZone[] = [];

		for (let i = 0, len = this._cursorPositions.length; i < len; i++) {
			let cursor = this._cursorPositions[i];

			zones.push(new editorCommon.OverviewRulerZone(
				cursor.lineNumber,
				cursor.lineNumber,
				editorCommon.OverviewRulerLane.Full,
				2,
				DecorationsOverviewRuler._CURSOR_COLOR,
				DecorationsOverviewRuler._CURSOR_COLOR_DARK
			));
		}

		return zones;
	}

	public prepareRender(ctx: IRenderingContext): void {
		// Nothing to read
		if (!this.shouldRender()) {
			throw new Error('I did not ask to render!');
		}
	}

	public render(ctx: IRestrictedRenderingContext): void {
		if (this._shouldUpdateDecorations || this._shouldUpdateCursorPosition) {

			if (this._shouldUpdateDecorations) {
				this._shouldUpdateDecorations = false;
				this._zonesFromDecorations = this._createZonesFromDecorations();
			}

			if (this._shouldUpdateCursorPosition) {
				this._shouldUpdateCursorPosition = false;
				if (this._hideCursor) {
					this._zonesFromCursors = [];
				} else {
					this._zonesFromCursors = this._createZonesFromCursors();
				}
			}

			let allZones: editorCommon.OverviewRulerZone[] = [];
			allZones = allZones.concat(this._zonesFromCursors);
			allZones = allZones.concat(this._zonesFromDecorations);

			this._overviewRuler.setZones(allZones, false);
		}

		let hasRendered = this._overviewRuler.render(false);

		if (hasRendered && this._overviewRuler.getLanesCount() > 0 && (this._zonesFromDecorations.length > 0 || this._zonesFromCursors.length > 0)) {
			let ctx2 = this._overviewRuler.getDomNode().getContext('2d');
			ctx2.beginPath();
			ctx2.lineWidth = 1;
			ctx2.strokeStyle = 'rgba(197,197,197,0.8)';
			ctx2.moveTo(0, 0);
			ctx2.lineTo(0, this._overviewRuler.getPixelHeight());
			ctx2.stroke();

			ctx2.moveTo(0, 0);
			ctx2.lineTo(this._overviewRuler.getPixelWidth(), 0);
			ctx2.stroke();
		}
	}
}
