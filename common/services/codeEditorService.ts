/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import Event from 'vs/base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ICommonCodeEditor, ICommonDiffEditor, isCommonCodeEditor, isCommonDiffEditor, IDecorationRenderOptions, IModelDecorationOptions } from 'vs/editor/common/editorCommon';
import { IEditor } from 'vs/platform/editor/common/editor';

export var ICodeEditorService = createDecorator<ICodeEditorService>('codeEditorService');

export interface ICodeEditorService {
	_serviceBrand: any;

	addCodeEditor(editor: ICommonCodeEditor): void;
	onCodeEditorAdd: Event<ICommonCodeEditor>;

	removeCodeEditor(editor: ICommonCodeEditor): void;
	onCodeEditorRemove: Event<ICommonCodeEditor>;

	getCodeEditor(editorId: string): ICommonCodeEditor;

	listCodeEditors(): ICommonCodeEditor[];

	/**
	 * Returns the current focused code editor (if the focus is in the editor or in an editor widget) or null.
	 */
	getFocusedCodeEditor(): ICommonCodeEditor;

	registerDecorationType(key: string, options: IDecorationRenderOptions, parentTypeKey?: string): void;
	removeDecorationType(key: string): void;
	resolveDecorationOptions(typeKey: string, writable: boolean): IModelDecorationOptions;
}

/**
 * Uses `editor.getControl()` and returns either a `codeEditor` or a `diffEditor` or nothing.
 */
export function getCodeOrDiffEditor(editor: IEditor): { codeEditor: ICommonCodeEditor; diffEditor: ICommonDiffEditor } {
	if (editor) {
		let control = editor.getControl();
		if (control) {
			if (isCommonCodeEditor(control)) {
				return {
					codeEditor: control,
					diffEditor: null
				};
			}
			if (isCommonDiffEditor(control)) {
				return {
					codeEditor: null,
					diffEditor: control
				};
			}
		}
	}

	return {
		codeEditor: null,
		diffEditor: null
	};
}

/**
 * Uses `editor.getControl()` and returns either the code editor, or the modified editor of a diff editor or nothing.
 */
export function getCodeEditor(editor: IEditor): ICommonCodeEditor {
	let r = getCodeOrDiffEditor(editor);
	return r.codeEditor || (r.diffEditor && r.diffEditor.getModifiedEditor()) || null;
}
