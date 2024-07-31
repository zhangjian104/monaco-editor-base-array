/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { Position } from 'vs/editor/common/core/position';

export interface IConverter {
	validateViewPosition(viewLineNumber: number, viewColumn: number, modelPosition: Position): Position;
	validateViewSelection(viewSelection: Selection, modelSelection: Selection): Selection;
	convertModelSelectionToViewSelection(modelSelection: Selection): Selection;
	convertModelRangeToViewRange(modelRange: Range): Range;
}

export class ViewModelCursors {

	private configuration: editorCommon.IConfiguration;
	private converter: IConverter;

	private lastCursorPositionChangedEvent: editorCommon.ICursorPositionChangedEvent;
	private lastCursorSelectionChangedEvent: editorCommon.ICursorSelectionChangedEvent;

	constructor(configuration: editorCommon.IConfiguration, converter: IConverter) {
		this.configuration = configuration;
		this.converter = converter;
		this.lastCursorPositionChangedEvent = null;
		this.lastCursorSelectionChangedEvent = null;
	}

	public getSelections(): Selection[] {
		if (this.lastCursorSelectionChangedEvent) {
			var selections: Selection[] = [];
			selections.push(this.converter.convertModelSelectionToViewSelection(this.lastCursorSelectionChangedEvent.selection));
			for (var i = 0, len = this.lastCursorSelectionChangedEvent.secondarySelections.length; i < len; i++) {
				selections.push(this.converter.convertModelSelectionToViewSelection(this.lastCursorSelectionChangedEvent.secondarySelections[i]));
			}
			return selections;
		} else {
			return [new Selection(1, 1, 1, 1)];
		}
	}

	public onCursorPositionChanged(e: editorCommon.ICursorPositionChangedEvent, emit: (eventType: string, payload: any) => void): void {
		this.lastCursorPositionChangedEvent = e;

		var position = this.converter.validateViewPosition(e.viewPosition.lineNumber, e.viewPosition.column, e.position),
			stopRenderingLineAfter = this.configuration.editor.viewInfo.stopRenderingLineAfter;

		// Limit position to be somewhere where it can actually be rendered
		if (stopRenderingLineAfter !== -1 && position.column > stopRenderingLineAfter) {
			position = new Position(position.lineNumber, stopRenderingLineAfter);
		}
		var secondaryPositions: Position[] = [];
		for (var i = 0, len = e.secondaryPositions.length; i < len; i++) {
			secondaryPositions[i] = this.converter.validateViewPosition(e.secondaryViewPositions[i].lineNumber, e.secondaryViewPositions[i].column, e.secondaryPositions[i]);
			// Limit position to be somewhere where it can actually be rendered
			if (stopRenderingLineAfter !== -1 && secondaryPositions[i].column > stopRenderingLineAfter) {
				secondaryPositions[i] = new Position(secondaryPositions[i].lineNumber, stopRenderingLineAfter);
			}
		}

		var newEvent: editorCommon.IViewCursorPositionChangedEvent = {
			position: position,
			secondaryPositions: secondaryPositions,
			isInEditableRange: e.isInEditableRange
		};
		emit(editorCommon.ViewEventNames.CursorPositionChangedEvent, newEvent);
	}

	public onCursorSelectionChanged(e: editorCommon.ICursorSelectionChangedEvent, emit: (eventType: string, payload: any) => void): void {
		this.lastCursorSelectionChangedEvent = e;

		let selection = this.converter.validateViewSelection(e.viewSelection, e.selection);
		let secondarySelections: Selection[] = [];
		for (let i = 0, len = e.secondarySelections.length; i < len; i++) {
			secondarySelections[i] = this.converter.validateViewSelection(e.secondaryViewSelections[i], e.secondarySelections[i]);
		}

		let newEvent: editorCommon.IViewCursorSelectionChangedEvent = {
			selection: selection,
			secondarySelections: secondarySelections
		};
		emit(editorCommon.ViewEventNames.CursorSelectionChangedEvent, newEvent);
	}

	public onCursorRevealRange(e: editorCommon.ICursorRevealRangeEvent, emit: (eventType: string, payload: any) => void): void {
		var viewRange: Range = null;
		if (e.viewRange) {
			var viewStartRange = this.converter.validateViewPosition(e.viewRange.startLineNumber, e.viewRange.startColumn, e.range.getStartPosition());
			var viewEndRange = this.converter.validateViewPosition(e.viewRange.endLineNumber, e.viewRange.endColumn, e.range.getEndPosition());
			viewRange = new Range(viewStartRange.lineNumber, viewStartRange.column, viewEndRange.lineNumber, viewEndRange.column);
		} else {
			viewRange = this.converter.convertModelRangeToViewRange(e.range);
		}

		var newEvent: editorCommon.IViewRevealRangeEvent = {
			range: viewRange,
			verticalType: e.verticalType,
			revealHorizontal: e.revealHorizontal,
			revealCursor: e.revealCursor
		};
		emit(editorCommon.ViewEventNames.RevealRangeEvent, newEvent);
	}

	public onCursorScrollRequest(e: editorCommon.ICursorScrollRequestEvent, emit: (eventType: string, payload: any) => void): void {
		var newEvent: editorCommon.IViewScrollRequestEvent = {
			deltaLines: e.deltaLines,
			revealCursor: e.revealCursor
		};
		emit(editorCommon.ViewEventNames.ScrollRequestEvent, newEvent);
	}

	public onLineMappingChanged(emit: (eventType: string, payload: any) => void): void {
		if (this.lastCursorPositionChangedEvent) {
			this.onCursorPositionChanged(this.lastCursorPositionChangedEvent, emit);
		}
		if (this.lastCursorSelectionChangedEvent) {
			this.onCursorSelectionChanged(this.lastCursorSelectionChangedEvent, emit);
		}
	}

}