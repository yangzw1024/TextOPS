import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

let statusBarItem: vscode.StatusBarItem;
let errorDecorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    context.subscriptions.push(statusBarItem);
    
    // 创建错误装饰器
    errorDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        border: '1px solid red'
    });
    context.subscriptions.push(errorDecorationType);

    // 监听选区变化
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(updateStatusBar)
    );

    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('textops.removeDuplicateLines', removeDuplicateLines),
        vscode.commands.registerCommand('textops.alignColumns', alignColumns),
        vscode.commands.registerCommand('textops.sortByColumn', sortByColumn),
        vscode.commands.registerCommand('textops.sortAsc', () => sortQuick(true)),
        vscode.commands.registerCommand('textops.sortDesc', () => sortQuick(false)),
        vscode.commands.registerCommand('textops.toJsonStringLines', toJsonStringLines),
        vscode.commands.registerCommand('textops.formatJson', formatJson),
        vscode.commands.registerCommand('textops.trimLines', trimLines),
        vscode.commands.registerCommand('textops.removeEmptyLines', removeEmptyLines),
        vscode.commands.registerCommand('textops.cleanK8sYaml', cleanK8sYaml)
    );

    updateStatusBar();
}

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
    
    // 检查是否都是数字
    const numbers: number[] = [];
    let allNumbers = true;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
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

async function alignColumns() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        
        // 使用正则表达式分割多个空格或tab为列分隔符
        const rows = lines.map(line => line.split(/\s+/).filter(cell => cell.length > 0));
        
        // 计算每列的最大宽度
        const maxWidths: number[] = [];
        rows.forEach(row => {
            row.forEach((cell, index) => {
                maxWidths[index] = Math.max(maxWidths[index] || 0, cell.length);
            });
        });
        
        // 对齐每行
        const alignedLines = rows.map(row => {
            return row.map((cell, index) => {
                return index === row.length - 1 ? cell : cell.padEnd(maxWidths[index]);
            }).join(' ');
        });
        
        const result = alignedLines.join('\n');
        
        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('分列对齐操作失败');
    }
}

async function removeDuplicateLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const uniqueLines = [...new Set(lines)];
        const result = uniqueLines.join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('去重操作失败');
    }
}

function isNumeric(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}

function detectColumnType(lines: string[], column: number, separator: string): boolean {
    const sampleSize = Math.min(10, lines.length);
    let numericCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        const cols = separator === ' ' ? lines[i].split(/\s+/).filter(cell => cell.length > 0) : lines[i].split(separator);
        const val = (cols[column] || '').trim();
        if (val && isNumeric(val)) {
            numericCount++;
        }
    }
    
    return numericCount > sampleSize / 2;
}

async function sortQuick(ascending: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const separator = ' ';
        const column = 0;
        
        const isNumeric = detectColumnType(lines, column, separator);
        
        const sortedLines = lines.sort((a, b) => {
            const aCols = a.split(/\s+/).filter(cell => cell.length > 0);
            const bCols = b.split(/\s+/).filter(cell => cell.length > 0);
            const aVal = aCols[column] || '';
            const bVal = bCols[column] || '';

            let comparison: number;
            if (isNumeric) {
                comparison = parseFloat(aVal) - parseFloat(bVal);
            } else {
                comparison = aVal.localeCompare(bVal);
            }

            return ascending ? comparison : -comparison;
        });

        const result = sortedLines.join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('排序操作失败');
    }
}

async function sortByColumn() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const columnInput = await vscode.window.showInputBox({
            prompt: '请输入列号（从1开始）',
            value: '1'
        });
        if (!columnInput) return;

        const column = parseInt(columnInput) - 1;
        if (column < 0) {
            vscode.window.showErrorMessage('列号必须大于0');
            return;
        }

        const separatorInput = await vscode.window.showInputBox({
            prompt: '请输入列分隔符',
            value: ' '
        });
        if (separatorInput === undefined) return;

        const separator = separatorInput === '\\t' ? '\t' : separatorInput || ' ';

        const sortOrder = await vscode.window.showQuickPick(['升序', '降序'], {
            placeHolder: '选择排序方向'
        });
        if (!sortOrder) return;

        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        
        const isNumeric = detectColumnType(lines, column, separator);
        
        const sortedLines = lines.sort((a, b) => {
            const aCols = separator === ' ' ? a.split(/\s+/).filter(cell => cell.length > 0) : a.split(separator);
            const bCols = separator === ' ' ? b.split(/\s+/).filter(cell => cell.length > 0) : b.split(separator);
            const aVal = aCols[column] || '';
            const bVal = bCols[column] || '';

            let comparison: number;
            if (isNumeric) {
                comparison = parseFloat(aVal) - parseFloat(bVal);
            } else {
                comparison = aVal.localeCompare(bVal);
            }

            return sortOrder === '升序' ? comparison : -comparison;
        });

        const result = sortedLines.join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('排序操作失败');
    }
}

async function toJsonStringLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        
        const jsonLines = lines.map(line => {
            const trimmedLine = line.trim();
            const escapedLine = trimmedLine.replace(/"/g, '\\"');
            return `"${escapedLine}",`;
        });

        const result = jsonLines.join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('JSON转换操作失败');
    }
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

function getLineNumber(text: string, position: number): number {
    return text.substring(0, position).split('\n').length;
}



function getJsonErrorLine(text: string, error: any): number {
    // 尝试从错误信息中提取行号
    const lineMatch = error.message.match(/line (\d+)/i);
    if (lineMatch) {
        return parseInt(lineMatch[1]);
    }
    
    // 尝试从位置信息中计算行号
    const posMatch = error.message.match(/position (\d+)/);
    if (posMatch) {
        const position = parseInt(posMatch[1]);
        const beforeError = text.substring(0, position);
        return beforeError.split('\n').length;
    }
    
    // 如果无法确定具体行号，返回1
    return 1;
}

function formatWithErrors(text: string, format: 'json' | 'yaml'): { result: string; errorLine?: number } {
    if (format === 'json') {
        try {
            const jsonObject = JSON.parse(text.trim());
            return { result: JSON.stringify(jsonObject, null, 2) };
        } catch (error: any) {
            // 格式错误时不自动修复，保持原文本并返回错误行号
            const errorLine = getJsonErrorLine(text, error);
            return { result: text, errorLine };
        }
    } else {
        try {
            const yamlObject = yaml.load(text.trim());
            return { result: yaml.dump(yamlObject, { indent: 2 }) };
        } catch (error: any) {
            const errorLine = error.mark ? error.mark.line + 1 : 1;
            return { result: text, errorLine };
        }
    }
}

async function formatJson() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const format = detectFormat(text);
        
        if (format === 'unknown') {
            vscode.window.showErrorMessage('无法识别文本格式，请确保是JSON或YAML格式');
            return;
        }

        // 清除之前的高亮
        editor.setDecorations(errorDecorationType, []);
        
        const { result, errorLine } = formatWithErrors(text, format);
        
        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
        
        // 高亮错误行
        if (errorLine) {
            const actualErrorLine = range.start.line + errorLine - 1;
            const line = editor.document.lineAt(actualErrorLine);
            const errorRange = new vscode.Range(
                new vscode.Position(actualErrorLine, 0),
                new vscode.Position(actualErrorLine, line.text.length)
            );
            editor.setDecorations(errorDecorationType, [errorRange]);
            
            vscode.window.showWarningMessage(`${format.toUpperCase()}格式错误，第 ${errorLine} 行有语法错误`);
        }
    } catch (error) {
        vscode.window.showErrorMessage('格式化操作失败: ' + (error as Error).message);
    }
}

async function trimLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const trimmedLines = lines.map(line => line.trim());
        const result = trimmedLines.join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('去除空白操作失败');
    }
}

async function removeEmptyLines() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        const lines = text.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim() !== '');
        const result = nonEmptyLines.join('\n');

        await editor.edit(editBuilder => {
            editBuilder.replace(range, result);
        });
    } catch (error) {
        vscode.window.showErrorMessage('移除空行操作失败');
    }
}

function cleanK8sObject(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(item => cleanK8sObject(item));
    }
    
    if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // 要清理的字段
            if ([
                'status', 'managedFields', 'uid', 'resourceVersion', 
                'generation', 'creationTimestamp', 'selfLink',
                'finalizers', 'ownerReferences'
            ].includes(key)) {
                continue;
            }
            
            // 递归清理子对象
            cleaned[key] = cleanK8sObject(value);
        }
        return cleaned;
    }
    
    return obj;
}

async function cleanK8sYaml() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const { text, range } = getTextToProcess(editor);
        
        // 使用更精确的正则表达式分割，保留所有空行
        const parts = text.split(/(\n*\s*---\s*\n*)/);
        const result: string[] = [];
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // 如果是分隔符及其周围的空行，直接保留
            if (part.match(/\n*\s*---\s*\n*/)) {
                result.push(part);
            } else if (part.trim()) {
                // 处理YAML内容，保留前后的空行
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
                    result.push(part); // 如果解析失败，保持原文
                }
            } else {
                result.push(part);
            }
        }
        
        await editor.edit(editBuilder => {
            editBuilder.replace(range, result.join(''));
        });
    } catch (error) {
        vscode.window.showErrorMessage('清理K8s YAML操作失败');
    }
}

export function deactivate() {}