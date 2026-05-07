# Changelog

## [1.1.0] - 2026-05-07

### Added
- **Highlight Duplicate Lines**: visually mark duplicate lines with orange background decoration, without modifying text
- **Clear Highlights**: remove all TextOPS decorations from the active editor
- **JSON ↔ YAML Convert**: auto-detect format and convert bidirectionally between JSON and YAML
- **Table to Markdown**: convert whitespace or tab-aligned plain text tables to GitHub-flavoured Markdown tables
- **Generate Password**: insert a random password (default 12 characters) containing uppercase, lowercase, digits and safe special characters (`!?_,.-~`)

### Changed
- Replaced popup notifications with a dedicated status bar item that auto-dismisses after 2 seconds
- Reorganized right-click context menu into logical groups: Lines / Format / Convert / DevOps / Generate
- Default password length changed to 12 characters
- Translated `Sort by Column` UI prompts from Chinese to English

### Fixed
- `To JSON String Lines`: properly escape backslash, `\n`, `\r`, `\t` in addition to double quotes
- Variable shadowing: renamed local `isNumeric` to `isNumericColumn` in sort functions
- Removed unused `getLineNumber` function

### Chore
- Moved `vsce` from `dependencies` to `devDependencies`, upgraded to `@vscode/vsce`
- Added `bugs.url` field to `package.json` for Open VSX compatibility

## [1.0.1] - 2025-12-01

### Fixed
- `Clean K8s YAML` now supports multi-document YAML files separated by `---`

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Unique Lines: remove duplicate lines
- Align Columns: pad columns to equal width
- Sort Asc / Sort Desc: auto-detect numeric vs text and sort
- Sort by Column: sort multi-column data by any column and separator
- To JSON String Lines: convert plain lines to escaped JSON string array
- Format JSON / YAML: pretty-print with inline error highlighting
- Trim Lines: strip leading and trailing whitespace
- Remove Empty Lines: delete all blank lines
- Clean K8s YAML: strip runtime-only fields from Kubernetes manifests
- Smart Statistics: show sum, avg, max, min in status bar when numbers are selected
