# TextOPS

**TextOPS** is a powerful text manipulation extension for VS Code, built for developers and DevOps engineers who deal with messy text every day — log outputs, config files, Kubernetes manifests, CSV data, and more.

Stop copy-pasting into external tools. Everything you need is right in your editor, one right-click away.

---

## Features at a Glance

| Feature | Description |
|---|---|
| 📊 **Smart Statistics** | Instant sum, avg, max, min for selected numbers |
| 🔤 **Sort Asc / Desc** | Auto-detects numeric vs text, sorts intelligently |
| 🗂️ **Sort by Column** | Sort multi-column data by any column and separator |
| 📐 **Align Columns** | Pad columns to equal width for clean, readable output |
| 🧹 **Unique Lines** | Remove duplicate lines, preserve order |
| 🔍 **Highlight Duplicates** | Visually mark duplicate lines without modifying text |
| ✂️ **Trim Lines** | Strip leading and trailing whitespace from every line |
| 🚫 **Remove Empty Lines** | Clean up blank lines in one click |
| 🔁 **To JSON String Lines** | Convert plain lines to properly escaped JSON string array |
| 🎨 **Format JSON / YAML** | Auto-detect and pretty-print, with inline error highlighting |
| 🔄 **JSON ↔ YAML Convert** | Instantly convert between JSON and YAML formats |
| 📋 **Table to Markdown** | Convert plain text tables to GitHub-flavoured Markdown |
| ☸️ **Clean K8s YAML** | Strip runtime-only fields from Kubernetes manifests |
| 🔐 **Generate Password** | Create secure random passwords with custom length |

---

## How to Use

All features are accessible from the right-click context menu:

1. Select the text you want to process (or leave nothing selected to process the entire file)
2. Right-click → **TextOPS** → choose an operation

---

## Feature Details

### 📊 Smart Statistics

Select a block of numbers and the status bar instantly shows live statistics — no calculator needed.

```
100
200
150
75
```

Status bar: `Selected 4 | Sum 525 | Max 200 | Min 75 | Avg 131.25`

---

### 🔤 Sort Asc / Sort Desc

Sorts lines by the first column. Automatically detects whether the data is numeric or text, so numbers sort as numbers — not lexicographically.

```
# Input          # Sorted Asc (numeric)
30               8
10       →       10
8                20
20               30
```

```
# Input          # Sorted Asc (text)
Zebra            Banana
apple    →       Zebra
Banana           apple
cat              cat
```

---

### 🗂️ Sort by Column

Need to sort a table by the 3rd column? Sort by Column lets you pick the column number, separator (space, comma, tab, etc.), and direction — all via a quick interactive prompt.

```
# Sort by column 2 (age), ascending
John   25  NewYork          Bob    22  Tokyo
Alice  30  London   →       John   25  NewYork
Bob    22  Tokyo            Alice  30  London
```

---

### 📐 Align Columns

Automatically detects whitespace-separated columns and pads each to equal width. Great for making log output or tabular data readable at a glance.

```
# Input                  # Output
name age city            name  age city
John 25 NewYork    →     John  25  NewYork
Alice 30 London          Alice 30  London
Bob 22 Tokyo             Bob   22  Tokyo
```

---

### 🧹 Unique Lines

Removes duplicate lines while preserving the original order of first occurrences.

```
# Input          # Output
apple            apple
banana   →       banana
apple            orange
orange
banana
```

---

### 🔍 Highlight Duplicate Lines

Highlights all lines that appear more than once with an orange background. Does **not** modify your text — perfect for reviewing data before cleaning. Use **Clear Highlights** to remove the markers.

```
# Before highlighting
apple
banana
apple      ← will be highlighted
orange
banana     ← will be highlighted
```

After running the command, duplicate lines are visually marked in the editor.

---

### ✂️ Trim Lines

Strips leading and trailing whitespace from every line. Useful for cleaning up copy-pasted content from terminals, spreadsheets, or web pages.

```
# Input            # Output
  hello world      hello world
    foo bar    →   foo bar
  baz              baz
```

---

### 🚫 Remove Empty Lines

Removes all blank lines (including lines that contain only whitespace).

```
# Input      # Output
line 1       line 1
             line 2
line 2   →   line 3
             
line 3
```

---

### 🔁 To JSON String Lines

Converts each line into a properly escaped JSON string with a trailing comma — ready to paste into a JSON array. Handles backslashes, quotes, tabs, and newlines correctly.

```
# Input          # Output
line 1           "line 1",
line 2    →      "line 2",
line 3           "line 3",
```

---

### 🎨 Format JSON / YAML

Auto-detects whether the selected text is JSON or YAML and pretty-prints it with consistent 2-space indentation.

**Valid input** — formats cleanly:
```json
{"name":"test","version":"1.0","tags":["a","b"]}
```
```json
{
  "name": "test",
  "version": "1.0",
  "tags": [
    "a",
    "b"
  ]
}
```

**Invalid input** — keeps original text and highlights the error line in red, so you can fix it without losing your content.

---

### 🔄 JSON ↔ YAML Convert

Automatically detects whether your text is JSON or YAML and converts it to the other format. Perfect for migrating config files or working with different tools that prefer different formats.

```yaml
# YAML input
name: my-app
version: 1.0
tags:
  - production
  - web
```

```json
# After conversion → JSON
{
  "name": "my-app",
  "version": "1.0",
  "tags": [
    "production",
    "web"
  ]
}
```

Works in both directions — JSON → YAML and YAML → JSON.

---

### 📋 Table to Markdown

Converts plain text tables (whitespace-aligned or tab-separated) into GitHub-flavoured Markdown tables. The first row is treated as the header.

```
# Input (plain text table)
Name      Age  City
John      25   NewYork
Alice     30   London
Bob       22   Tokyo
```

```markdown
# Output (Markdown table)
| Name  | Age | City    |
| ----- | --- | ------- |
| John  | 25  | NewYork |
| Alice | 30  | London  |
| Bob   | 22  | Tokyo   |
```

Perfect for pasting into GitHub issues, pull requests, or documentation.

---

### ☸️ Clean K8s YAML

When you `kubectl get` a resource and want to reuse the YAML as a template, it's full of runtime-only fields that will cause issues if you re-apply them. This command strips all of them automatically.

Removed fields: `status`, `managedFields`, `uid`, `resourceVersion`, `generation`, `creationTimestamp`, `selfLink`, `finalizers`, `ownerReferences`

Supports multi-document YAML files (separated by `---`).

```yaml
# Before
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  uid: a1b2c3d4-...
  resourceVersion: "98765"
  creationTimestamp: "2024-01-01T00:00:00Z"
  managedFields: [...]
status:
  phase: Running
  podIP: 10.0.0.1
spec:
  containers:
    - name: app
      image: nginx:latest
```

```yaml
# After
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: nginx:latest
```

---

### 🔐 Generate Password

Generates a cryptographically random password with customizable length (8–128 characters, default 12). The password includes:

- Uppercase letters (A-Z)
- Lowercase letters (a-z)
- Digits (0-9)
- Safe special characters: `! ? _ , . - ~`

These special characters don't require escaping in most shells, URLs, or config files.

**Usage:**
1. Place your cursor where you want the password
2. Run **TextOPS → Generate Password**
3. Enter the desired length (or press Enter for 12)
4. The password is inserted at the cursor position

If no editor is open, the password is copied to your clipboard instead.

**Example output:**
```
aB3!xZ9_mK2.pQ7~
```

---

## Installation

**VS Code Marketplace:**
1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS)
3. Search for **TextOPS**
4. Click Install

**Open VSX Registry:**
Search for **TextOPS** on [open-vsx.org](https://open-vsx.org) and install directly.

---

## Changelog

### 1.1.0
- ✨ Added **Highlight Duplicate Lines** — visually mark duplicates without modifying text
- ✨ Added **JSON ↔ YAML Convert** — instant bidirectional conversion
- ✨ Added **Table to Markdown** — convert plain text tables to Markdown format
- ✨ Added **Generate Password** — create secure random passwords
- 🎨 Reorganized context menu into logical groups
- 📝 Improved command descriptions and error messages

### 1.0.1
- 🐛 Bug fixes and stability improvements

### 1.0.0
- 🎉 Initial release

---

## License

[MIT](LICENSE) © yangzw1024
