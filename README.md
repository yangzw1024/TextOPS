# TextOPS

专为开发者和运维工程师设计的强大文本处理扩展。提供智能排序、JSON/YAML格式化、数据对齐、K8s YAML清理等10+种实用功能，让文本处理变得简单高效。

## 功能特性

- **智能统计** - 选中数字自动计算求和、平均值、最值
- **智能排序** - 自动识别数字/文本类型，支持按列排序
- **列对齐** - 自动识别分隔符，完美对齐不规则文本
- **JSON/YAML格式化** - 支持错误检测和高亮显示
- **K8s专用** - 一键清理YAML运行时字段，保留核心配置

## 使用方法

1. 选中文本或将光标定位到文件中
2. 右键选择 **TextOPS** 菜单
3. 选择相应的操作功能

## 功能示例

### 智能统计
选中数字时状态栏自动显示统计信息：
```
100
200
150
```
状态栏显示：`Selected 3 | Sum 450 | Max 200 | Min 100 | Avg 150.00`

### 去除重复行
```
# 输入
apple
banana
apple
orange
banana

# 输出
apple
banana
orange
```

### 列对齐
```
# 输入
name    age  city
John  25    NewYork
Alice   30 London
Bob 22      Tokyo

# 输出
name  age city   
John  25  NewYork
Alice 30  London 
Bob   22  Tokyo  
```

### 智能排序
```
# 数字排序（升序）
30 → 8
10 → 10
8  → 20
20 → 30

# 文本排序（升序）
Zebra  → Banana
apple  → Zebra
Banana → apple
cat    → cat
```

### 按列排序
```
# 按第2列（年龄）升序排序
John 25 NewYork  → Bob 22 Tokyo
Alice 30 London  → John 25 NewYork
Bob 22 Tokyo     → Alice 30 London
```

### JSON/YAML格式化
**正确格式** - 自动美化：
```json
{"name":"test","value":123}

↓ 格式化后

{
  "name": "test",
  "value": 123
}
```

**错误格式** - 高亮错误行：
```json
{"name":"test","value":123"missing":"comma"}
```
保持原文本不变，红色高亮错误行，显示错误提示

### 转JSON字符串数组
```
# 输入
line 1
line 2
line 3

# 输出
"line 1",
"line 2",
"line 3",
```

### 清理空白
```
# 输入
  hello  
  world  

# 输出
hello
world
```

### 移除空行
```
# 输入
line 1

line 2


line 3

# 输出
line 1
line 2
line 3
```

### K8s YAML清理
```yaml
# 清理前
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  uid: 12345
  resourceVersion: "123"
  managedFields: [...]
status:
  phase: Running
spec:
  containers:
  - name: app
    image: nginx

# 清理后
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: app
      image: nginx
```

## 安装

1. 打开 VSCode
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "TextOPS"
4. 点击安装

## 许可证

MIT