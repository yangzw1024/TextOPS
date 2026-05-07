import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

let statusBarItem: vscode.StatusBarItem;
let notifyBarItem: vscode.StatusBarItem;
let notifyTimer: ReturnType<typeof setTimeout> | undefined;
let errorDecorationType: vscode.TextEditorDecorationType;
let duplicateDecorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    context.subscriptions.push(statusBarItem);

    // 创建临时通知状态栏（右侧，优先级高，显示操作结果 2 秒后自动消失）
    notifyBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
    context.subscriptions.push(notifyBarItem);

    // 创建错误装饰器
    errorDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        border: '1px solid red'
    });
    context.subscriptions.push(errorDecorationType);

    // 创建重复行装饰器
    duplicateDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 165, 0, 0.25)',
        border: '1px solid orange',
        overviewRulerColor: 'orange',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    context.subscriptions.push(duplicateDecorationType);

    // 监听选区变化
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(updateStatusBar)
    );

    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('textops.removeDuplicateLines', removeDuplicateLines),
        vscode.commands.registerCommand('textops.highlightDuplicateLines', highlightDuplicateLines),
        vscode.commands.registerCommand('textops.clearHighlights', clearHighlights),
        vscode.commands.registerCommand('textops.alignColumns', alignColumns),
        vscode.commands.registerCommand('textops.sortByColumn', sortByColumn),
        vscode.commands.registerCommand('textops.sortAsc', () => sortQuick(true)),
        vscode.commands.registerCommand('textops.sortDesc', () => sortQuick(false)),
        vscode.commands.registerCommand('textops.toJsonStringLines', toJsonStringLines),
        vscode.commands.registerCommand('textops.formatJson', formatJson),
        vscode.commands.registerCommand('textops.convertJsonYaml', convertJsonYaml),
        vscode.commands.registerCommand('textops.trimLines', trimLines),
        vscode.commands.registerCommand('textops.removeEmptyLines', removeEmptyLines),
        vscode.commands.registerCommand('textops.cleanK8sYaml', cleanK8sYaml),
        vscode.commands.registerCommand('textops.tableToMarkdown', tableToMarkdown),
        vscode.commands.registerCommand('textops.generatePassword', generatePassword)
    );

    updateStatusBar();
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function updateStatusBar() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        statusBarItem.hide();
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        statusBarItem.hide();
        return;
    }

    const lineCount = selection.end.line - selection.start.line + 1;
    const selectedText = editor.document.getText(selection);
    const lines = selectedText.split('\n');

    const numbers: number[] = [];
    let allNumbers = true;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') { continue; }
        if (isNumeric(trimmed)) {
            numbers.push(parseFloat(trimmed));
        } else {
            allNumbers = false;
            break;
        }
    }

    if (allNumbers && numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const max = Math.max(...numbers);
        const min = Math.min(...numbers);
        const avg = sum / numbers.length;
        statusBarItem.text = `Selected ${numbers.length} | Sum ${sum} | Max ${max} | Min ${min} | Avg ${avg.toFixed(2)}`;
    } else {
        statusBarItem.text = `Selected ${lineCount} lines`;
    }

    statusBarItem.show();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Show a temporary message in the status bar for 2 seconds, then hide it.
 * Uses a dedicated status bar item so it never interferes with the stats bar.
 */
function notify(message: string, isError = false) {
    if (notifyTimer) {
        clearTimeout(notifyTimer);
        notifyTimer = undefined;
    }
    notifyBarItem.text = (isError ? '$(error) ' : '$(check) ') + message;
    notifyBarItem.backgroundColor = isError
        ? new vscode.ThemeColor('statusBarItem.errorBackground')
        : undefined;
    notifyBarItem.show();
    notifyTimer = setTimeout(() => {
        notifyBarItem.hide();
        notifyTimer = undefined;
    }, 2000);
}

function getTextToProcess(editor: vscode.TextEditor): { text: string; range: vscode.Range } {
    const selection = editor.selection;
    if (selection.isEmpty) {
        const document = editor.document;
        const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            document.lineAt(document.lineCount - 1).range.end
        );
        return { text: document.getText(), range: fullRange };
    } else {
        return { text: editor.document.getText(selection), range: selection };
    }
}

function isNumeric(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}

function detectColumnType(lines: string[], column: number, separator: string): boolean {
    const sampleSize = Math.min(10, lines.length);
    let numericCount = 0;

    for (let i = 0; i < sampleSize; i++) {
        const cols = separator === ' '
            ? lines[i].split(/\s+/).filter(cell => cell.length > 0)
            : lines[i].split(separator);
        const val = (cols[column] || '').trim();
        if (val && isNumeric(val)) {
            numericCount++;
        }
    }

    return numericCount > sampleSize / 2;
}

function detectFormat(text: string): 'json' | 'yaml' | 'unknown' {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return 'json';
    }
    if (trimmed.includes(':') && !trimmed.startsWith('{')) {
        return 'yaml';
    }
    return 'unknown';
}

function getJsonErrorLine(text: string, error: any): number {
    const lineMatch = error.message.match(/line (\d+)/i);
    if (lineMatch) { return parseInt(lineMatch[1]); }

    const posMatch = error.message.match(/position (\d+)/);
    if (posMatch) {
        const position = parseInt(posMatch[1]);
        return text.substring(0, position).split('\n').length;
    }

    return 1;
}

function formatWithErrors(text: string, format: 'json' | 'yaml'): { result: string; errorLine?: number } {
    if (format === 'json') {
        try {
            const jsonObject = JSON.parse(text.trim());
            return { result: JSON.stringify(jsonObject, null, 2) };
        } catch (error: any) {
            return { result: text, errorLine: getJsonErrorLine(text, error) };
        }
    } else {
        try {
            const yamlObject = yaml.load(text.trim());
            return { result: yaml.dump(yamlObject, { indent: 2 }) };
        } catch (error: any) {
            return { result: text, errorLine: error.mark ? error.mark.line + 1 : 1 };
        }
    }
}

// ---------------------------------------------------------------------------
// Commands — existing
// ---------------------------------------------------------------------------

async function alignColumns() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const rows = lines.map(line => line.split(/\s+/).filter(cell => cell.length > 0));

        const maxWidths: number[] = [];
        rows.forEach(row => {
            row.forEach((cell, index) => {
                maxWidths[index] = Math.max(maxWidths[index] || 0, cell.length);
            });
        });

        const alignedLines = rows.map(row =>
            row.map((cell, index) =>
                index === row.length - 1 ? cell : cell.padEnd(maxWidths[index])
            ).join(' ')
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(range, alignedLines.join('\n'));
        });
    } catch {
        vscode.window.showErrorMessage('Align columns failed');
    }
}

async function removeDuplicateLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const result = [...new Set(lines)].join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch {
        vscode.window.showErrorMessage('Remove duplicates failed');
    }
}

async function sortQuick(ascending: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const column = 0;
        const isNumericColumn = detectColumnType(lines, column, ' ');

        const sortedLines = [...lines].sort((a, b) => {
            const aCols = a.split(/\s+/).filter(cell => cell.length > 0);
            const bCols = b.split(/\s+/).filter(cell => cell.length > 0);
            const aVal = aCols[column] || '';
            const bVal = bCols[column] || '';
            const comparison = isNumericColumn
                ? parseFloat(aVal) - parseFloat(bVal)
                : aVal.localeCompare(bVal);
            return ascending ? comparison : -comparison;
        });

        await editor.edit(editBuilder => {
            editBuilder.replace(range, sortedLines.join('\n'));
        });
    } catch {
        vscode.window.showErrorMessage('Sort failed');
    }
}

async function sortByColumn() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const columnInput = await vscode.window.showInputBox({
            prompt: 'Enter column number (starting from 1)',
            value: '1'
        });
        if (!columnInput) { return; }

        const column = parseInt(columnInput) - 1;
        if (column < 0) {
            vscode.window.showErrorMessage('Column number must be greater than 0');
            return;
        }

        const separatorInput = await vscode.window.showInputBox({
            prompt: 'Enter column separator (use \\t for tab)',
            value: ' '
        });
        if (separatorInput === undefined) { return; }

        const separator = separatorInput === '\\t' ? '\t' : separatorInput || ' ';

        const sortOrder = await vscode.window.showQuickPick(['Ascending', 'Descending'], {
            placeHolder: 'Select sort direction'
        });
        if (!sortOrder) { return; }

        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const isNumericColumn = detectColumnType(lines, column, separator);

        const sortedLines = [...lines].sort((a, b) => {
            const aCols = separator === ' '
                ? a.split(/\s+/).filter(cell => cell.length > 0)
                : a.split(separator);
            const bCols = separator === ' '
                ? b.split(/\s+/).filter(cell => cell.length > 0)
                : b.split(separator);
            const aVal = aCols[column] || '';
            const bVal = bCols[column] || '';
            const comparison = isNumericColumn
                ? parseFloat(aVal) - parseFloat(bVal)
                : aVal.localeCompare(bVal);
            return sortOrder === 'Ascending' ? comparison : -comparison;
        });

        await editor.edit(editBuilder => {
            editBuilder.replace(range, sortedLines.join('\n'));
        });
    } catch {
        vscode.window.showErrorMessage('Sort by column failed');
    }
}

async function toJsonStringLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');

        const jsonLines = lines.map(line => {
            const trimmedLine = line.trim();
            const escapedLine = trimmedLine
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
            return `"${escapedLine}",`;
        });

        await editor.edit(editBuilder => {
            editBuilder.replace(range, jsonLines.join('\n'));
        });
    } catch {
        vscode.window.showErrorMessage('To JSON string lines failed');
    }
}

async function formatJson() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const format = detectFormat(text);

        if (format === 'unknown') {
            vscode.window.showErrorMessage('Cannot detect format. Make sure the text is valid JSON or YAML.');
            return;
        }

        editor.setDecorations(errorDecorationType, []);

        const { result, errorLine } = formatWithErrors(text, format);

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });

        if (errorLine) {
            const actualErrorLine = range.start.line + errorLine - 1;
            const line = editor.document.lineAt(actualErrorLine);
            const errorRange = new vscode.Range(
                new vscode.Position(actualErrorLine, 0),
                new vscode.Position(actualErrorLine, line.text.length)
            );
            editor.setDecorations(errorDecorationType, [errorRange]);
            notify(`${format.toUpperCase()} syntax error on line ${errorLine}`, true);
        }
    } catch (error) {
        vscode.window.showErrorMessage('Format failed: ' + (error as Error).message);
    }
}

async function trimLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const result = text.split('\n').map(line => line.trim()).join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch {
        vscode.window.showErrorMessage('Trim lines failed');
    }
}

async function removeEmptyLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const result = text.split('\n').filter(line => line.trim() !== '').join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch {
        vscode.window.showErrorMessage('Remove empty lines failed');
    }
}

function cleanK8sObject(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(item => cleanK8sObject(item));
    }

    if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        const runtimeFields = new Set([
            'status', 'managedFields', 'uid', 'resourceVersion',
            'generation', 'creationTimestamp', 'selfLink',
            'finalizers', 'ownerReferences'
        ]);
        for (const [key, value] of Object.entries(obj)) {
            if (!runtimeFields.has(key)) {
                cleaned[key] = cleanK8sObject(value);
            }
        }
        return cleaned;
    }

    return obj;
}

async function cleanK8sYaml() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const parts = text.split(/(\n*\s*---\s*\n*)/);
        const result: string[] = [];

        for (const part of parts) {
            if (part.match(/\n*\s*---\s*\n*/)) {
                result.push(part);
            } else if (part.trim()) {
                const leadingWhitespace = part.match(/^\s*/)?.[0] || '';
                const trailingWhitespace = part.match(/\s*$/)?.[0] || '';
                const content = part.trim();

                try {
                    const yamlObj = yaml.load(content);
                    if (yamlObj && typeof yamlObj === 'object') {
                        const cleaned = cleanK8sObject(yamlObj);
                        const cleanedYaml = yaml.dump(cleaned, { indent: 2, lineWidth: -1 }).trim();
                        result.push(leadingWhitespace + cleanedYaml + trailingWhitespace);
                    } else {
                        result.push(part);
                    }
                } catch {
                    result.push(part);
                }
            } else {
                result.push(part);
            }
        }

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result.join(''));
        });
    } catch {
        vscode.window.showErrorMessage('Clean K8s YAML failed');
    }
}

// ---------------------------------------------------------------------------
// Commands — new
// ---------------------------------------------------------------------------

/**
 * Highlight Duplicate Lines
 * Highlights all lines that appear more than once (orange background).
 * Does not modify the document. Run "Clear Highlights" to remove.
 */
async function highlightDuplicateLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');

        // Count occurrences of each line (trimmed for comparison)
        const counts = new Map<string, number>();
        for (const line of lines) {
            const key = line.trim();
            counts.set(key, (counts.get(key) || 0) + 1);
        }

        // Collect ranges for all duplicate lines
        const decorationRanges: vscode.Range[] = [];
        const startLine = range.start.line;

        lines.forEach((line, index) => {
            if ((counts.get(line.trim()) || 0) > 1) {
                const docLine = startLine + index;
                decorationRanges.push(new vscode.Range(
                    new vscode.Position(docLine, 0),
                    new vscode.Position(docLine, line.length)
                ));
            }
        });

        editor.setDecorations(duplicateDecorationType, decorationRanges);

        if (decorationRanges.length === 0) {
            notify('No duplicate lines found.');
        } else {
            const uniqueDuplicates = [...counts.entries()].filter(([, v]) => v > 1).length;
            notify(`Found ${decorationRanges.length} duplicate lines (${uniqueDuplicates} unique values)`);
        }
    } catch {
        vscode.window.showErrorMessage('Highlight duplicates failed');
    }
}

/**
 * Clear all TextOPS highlights from the active editor.
 */
function clearHighlights() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    editor.setDecorations(duplicateDecorationType, []);
    editor.setDecorations(errorDecorationType, []);
}

/**
 * JSON ↔ YAML Convert
 * Auto-detects the current format and converts to the other.
 */
async function convertJsonYaml() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const format = detectFormat(text);

        if (format === 'unknown') {
            vscode.window.showErrorMessage('Cannot detect format. Make sure the text is valid JSON or YAML.');
            return;
        }

        let result: string;

        if (format === 'json') {
            // JSON → YAML
            const obj = JSON.parse(text.trim());
            result = yaml.dump(obj, { indent: 2, lineWidth: -1 });
        } else {
            // YAML → JSON
            const obj = yaml.load(text.trim());
            result = JSON.stringify(obj, null, 2);
        }

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });

        notify(format === 'json' ? 'Converted JSON → YAML' : 'Converted YAML → JSON');
    } catch (error) {
        vscode.window.showErrorMessage('Conversion failed: ' + (error as Error).message);
    }
}

/**
 * Table to Markdown
 * Converts whitespace-aligned or tab-separated plain text tables into
 * GitHub-flavoured Markdown tables. The first row is treated as the header.
 */
async function tableToMarkdown() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    try {
        const { text, range } = getTextToProcess(editor);
        const rawLines = text.split('\n').filter(line => line.trim() !== '');

        if (rawLines.length < 1) {
            vscode.window.showErrorMessage('No content to convert.');
            return;
        }

        // Detect separator: prefer tab if present, otherwise whitespace
        const useTab = rawLines[0].includes('\t');
        const splitLine = (line: string): string[] => {
            if (useTab) {
                return line.split('\t').map(c => c.trim());
            }
            return line.trim().split(/\s{2,}|\t/).map(c => c.trim()).filter(c => c.length > 0);
        };

        const rows = rawLines.map(splitLine);

        // Normalise column count
        const colCount = Math.max(...rows.map(r => r.length));
        const normalised = rows.map(row => {
            while (row.length < colCount) { row.push(''); }
            return row;
        });

        // Calculate column widths
        const widths: number[] = Array(colCount).fill(3); // minimum 3 for "---"
        normalised.forEach(row => {
            row.forEach((cell, i) => {
                widths[i] = Math.max(widths[i], cell.length);
            });
        });

        const formatRow = (cells: string[]) =>
            '| ' + cells.map((cell, i) => cell.padEnd(widths[i])).join(' | ') + ' |';

        const separator =
            '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |';

        const mdLines: string[] = [];
        mdLines.push(formatRow(normalised[0]));   // header
        mdLines.push(separator);
        for (let i = 1; i < normalised.length; i++) {
            mdLines.push(formatRow(normalised[i]));
        }

        await editor.edit(editBuilder => {
            editBuilder.replace(range, mdLines.join('\n'));
        });
    } catch {
        vscode.window.showErrorMessage('Table to Markdown failed');
    }
}

/**
 * Generate Password
 * Prompts for length (default 16), then inserts a cryptographically random
 * password containing uppercase, lowercase, digits, and safe special chars.
 * Safe special chars: ! ? _ , . - ~ (no shell/URL escaping needed)
 */
async function generatePassword() {
    const lengthInput = await vscode.window.showInputBox({
        prompt: 'Password length',
        value: '12',
        validateInput: v => {
            const n = parseInt(v);
            if (isNaN(n) || n < 8 || n > 128) {
                return 'Please enter a number between 8 and 128';
            }
            return null;
        }
    });
    if (!lengthInput) { return; }

    const length = parseInt(lengthInput);

    const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower   = 'abcdefghijklmnopqrstuvwxyz';
    const digits  = '0123456789';
    const special = '!?_,.-~';
    const all     = upper + lower + digits + special;

    // Guarantee at least one character from each category
    const pick = (charset: string) => charset[Math.floor(Math.random() * charset.length)];

    const passwordChars: string[] = [
        pick(upper),
        pick(lower),
        pick(digits),
        pick(special),
    ];

    for (let i = passwordChars.length; i < length; i++) {
        passwordChars.push(pick(all));
    }

    // Fisher-Yates shuffle
    for (let i = passwordChars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    const password = passwordChars.join('');

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        await editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, password);
        });
        notify('Password generated');
    } else {
        await vscode.env.clipboard.writeText(password);
        notify('Password copied to clipboard');
    }
}

export function deactivate() {}
