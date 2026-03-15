---
date: 2025-01-12
updated: 2026-03-15T14:41:56+08:00
---

## 核心概念

|   |   |   |
|---|---|---|
|概念|作用|数据结构/接口|
|Logger|日志记录入口点，持有Handler和配置信息|struct slog.Logger|
|Handler|处理日志记录的核心逻辑（格式转换、输出）|interface slog.Handler|
|Record|单挑日志等的完整信息容器|struct slog.Record|
|Attr|原子日志数据单元(键值对)|struct slog.Attr|
|Group|结构化嵌套数据容器(包含多个Attr或子Group)|通过slog.Group创建|
|Level|日志级别控制(Debug/Info/Warn/Error)|type slog.Level int|
|HandlerOptions|配置handler行为(如日志级别、源码位置等)|struct slog.HandlerOptions|

## 从slog.Info到终端输出的全流程

以下以slog.Info("message","key",value)调用默认的TextHandler为例：

**用户调用slog提供的Info接口**

```
slog.Info("user login", "user_id", 123, "ip", "192.168.1.1")
```

**Info接口调用默认logger的log方法**

```
// Info calls [Logger.Info] on the default logger.
func Info(msg string, args ...any) {
	Default().log(context.Background(), LevelInfo, msg, args...)
}
```

**参数转换**

```
// 自动将键值对转换为 Attr 列表
attrs := []slog.Attr{
    slog.String("msg", "user login"), // 自动处理消息参数
    slog.Any("user_id", 123),
    slog.Any("ip", "192.168.1.1"),
}
```

**创建Record**

```
// 创建日志记录容器
r := slog.NewRecord(
    time.Now(),            // 时间戳
    slog.LevelInfo,        // 日志级别
    "user login",          // 消息
    pc,                    // 程序计数器（用于源码位置）
)
r.AddAttrs(attrs...)       // 添加属性
```

**log方法去创建record记录信息**

```
// log is the low-level logging method for methods that take ...any.
// It must always be called directly by an exported logging method
// or function, because it uses a fixed call depth to obtain the pc.
func (l *Logger) log(ctx context.Context, level Level, msg string, args ...any) {
    // 判断日志级别是否符合要求,如果日志级过低则不打印之间返回
	if !l.Enabled(ctx, level) {
		return
	}
    // 定义pc变量用于获取slog.Info执行函数的指针
	var pc uintptr
    // 判断是否开启runtime的调用
	if !internal.IgnorePC {
        // 通过runtime获取函数的指针
		var pcs [1]uintptr
		// skip [runtime.Callers, this function, this function's caller]
		runtime.Callers(3, pcs[:])
		pc = pcs[0]
	}
    // 将日志信息记录到Record中，包含时间、级别、信息、所在函数的指针、后续其他的参数
	r := NewRecord(time.Now(), level, msg, pc)
	r.Add(args...)
	if ctx == nil {
		ctx = context.Background()
	}
    // 调用handler进行个性化处理
	_ = l.Handler().Handle(ctx, r)
}
```

**TextHandler处理流程**

```
Handler.Handle() 执行步骤：
1. 检查日志级别是否启用（Enabled）
2. 处理分组嵌套（WithGroup 积累的层级）
3. 应用 ReplaceAttr 转换
4. 格式化输出
```

**TextHandler格式化逻辑**

```
func (h *TextHandler) Handle(ctx context.Context, r Record) error {
    // 1. 收集所有属性
    var attrs []Attr
    r.Attrs(func(a Attr) bool {
        attrs = append(attrs, a)
        return true
    })
    
    // 2. 处理分组层级
    state := h.newGroupState()
    defer state.free()
    state.appendGroupPrefix(h.groups)
    
    // 3. 构建输出缓冲区
    buf := buffer.New()
    defer buf.Free()
    
    // 4. 写入基础字段
    buf.WriteString(r.Time.Format(h.timeFormat))
    buf.WriteByte(' ')
    buf.WriteString(r.Level.String())
    buf.WriteByte(' ')
    buf.WriteString(r.Message)
    
    // 5. 写入属性键值对
    for _, a := range attrs {
        buf.WriteByte(' ')
        a.Key = state.prefix + a.Key // 应用分组前缀
        h.appendAttr(buf, a, state)
    }
    
    // 6. 输出到终端
    h.mu.Lock()
    defer h.mu.Unlock()
    _, err := h.w.Write(buf.Bytes())
    return err
}
```

**终端输出结果**

```
2025-05-16T15:04:05Z INFO user login user_id=123 ip=192.168.1.1
```

**关键组件交互流程**

```
+----------------+       +-----------------+       +------------------+
|   User Code    |       |    slog.Logger  |       |   TextHandler    |
+----------------+       +-----------------+       +------------------+
       |                         |                          |
       | slog.Info(...)          |                          |
       |------------------------>|                          |
       |                         |                          |
       |                         | Create slog.Record       |
       |                         |------------------------->|
       |                         |                          |
       |                         |                          | Formatting
       |                         |                          |----------> os.Stdout
       |                         |                          |
       |                         |                          |
```

## 四、各组件技术细节

### 1. **Record 结构**

```
type Record struct {
    Time    time.Time
    Message string
    Level   Level
    PC      uintptr    // 程序计数器（用于源码位置）
    attrs   []Attr     // 原始属性
    groups  []string   // 当前分组层级
}
```

### 2. **Handler 接口方法**

```
type Handler interface {
    Enabled(context.Context, Level) bool
    Handle(context.Context, Record) error
    WithAttrs(attrs []Attr) Handler
    WithGroup(name string) Handler
}
```

### 3. **属性处理机制**

- **WithAttrs**：追加固定属性到后续日志

```
logger := slog.Default().With("service", "auth")
// 后续所有日志自动携带 service=auth
```

- **WithGroup**：创建嵌套命名空间

```
logger := slog.Default().WithGroup("http")
logger.Info("request", "method", "GET")
// 输出：http.method=GET
```

---

## 五、性能优化设计

1. **内存复用**：

- 使用 `sync.Pool` 缓存 Record 和 Buffer
- 避免频繁内存分配

2. **延迟计算**：

```
// 仅在需要时获取源码位置
if h.opts.AddSource {
    r.PC = getCallerPC()
}
```

3. **零分配设计**：

```
// 使用 append 而不是 fmt.Sprintf 构建字符串
buf.WriteString(r.Level.String())
```

---

## 六、扩展能力

1. **自定义 Handler**：

```
type CSVHandler struct {
    w io.Writer
}

func (h *CSVHandler) Handle(ctx context.Context, r Record) error {
    // 转换为 CSV 格式
    _, err := fmt.Fprintf(h.w, "%s,%s,%s\n", 
                          r.Time.Format(time.RFC3339),
                          r.Level,
                          r.Message)
    return err
}
```

2. **动态过滤**：

```
func (h *FilterHandler) Enabled(ctx context.Context, l slog.Level) bool {
    return l >= h.minLevel // 仅允许指定级别以上
}
```

---

## 七、完整调用时序图

```
User Code           slog.Logger          TextHandler          os.Stdout
   |                    |                     |                     |
   | slog.Info()        |                     |                     |
   |------------------->|                     |                     |
   |                    | NewRecord()         |                     |
   |                    |-------------------> |                     |
   |                    | Handle()            |                     |
   |                    |-------------------->|                     |
   |                    |                     | formatRecord()      |
   |                    |                     |-------------------->|
   |                    |                     |                     |--[Write]--> 
   |<-----------------------------------------|---------------------|
```
