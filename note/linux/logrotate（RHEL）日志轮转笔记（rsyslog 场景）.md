
## 简介

`logrotate` 是 Linux 上常用的日志轮转（rotate）工具，用于：
- 按时间/大小切分日志文件（轮转）
- 压缩历史日志、删除过期日志，控制磁盘占用
- 轮转后按需创建新日志文件，并通过脚本通知服务重新打开日志文件句柄（如 rsyslog）

> 本文以 RHEL + rsyslog 为主线，同时保留“配置项大全”作为速查/百科。

---

## 它是怎么被唤醒的（谁来运行 logrotate）

`logrotate` 不是常驻进程，通常由系统定期触发（默认每天一次），常见入口包括：
- `systemd timer`：`logrotate.timer`（较新发行版常见）
- `cron`：`/etc/cron.daily/logrotate`（部分版本/环境仍可见）

### cron 入口示例

`/etc/cron.daily/logrotate`

```sh
#!/bin/sh
/usr/sbin/logrotate /etc/logrotate.conf

EXITVALUE=$?
if [ $EXITVALUE != 0 ]; then
    /usr/bin/logger -t logrotate "ALERT exited abnormally with [$EXITVALUE]"
fi

exit $EXITVALUE
```
### cron 调度时间示例

查看调度配置（示例：`/etc/cron.d/dailyjobs`），每天凌晨 04:02 执行 `/etc/cron.daily`，其中包含 logrotate：

```cron
# Run the daily, weekly, and monthly jobs if cronie-anacron is not installed
SHELL=/bin/bash
PATH=/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=root

# run-parts
02 4 * * * root [ ! -f /etc/cron.hourly/0anacron ] && run-parts /etc/cron.daily
22 4 * * 0 root [ ! -f /etc/cron.hourly/0anacron ] && run-parts /etc/cron.weekly
42 4 1 * * root [ ! -f /etc/cron.hourly/0anacron ] && run-parts /etc/cron.monthly
```

---

## 配置文件

### 全局配置（入口）

位置：`/etc/logrotate.conf`

```conf
# see "man logrotate" for details
# global options do not affect preceding include directives

# rotate log files weekly
weekly

# keep 26 weeks worth of backlogs
rotate 26

# create new (empty) log files after rotating old ones
create

# use date as a suffix of the rotated file
dateext

# uncomment this if you want your log files compressed
#compress

# packages drop log rotation information into this directory
include /etc/logrotate.d

# system-specific logs may also be configured here.
```

说明：
- `/etc/logrotate.conf` 定义“全局默认值”（如 `weekly/rotate/create/dateext` 等）。
- 全局默认值会被各个 stanza 继承；stanza 内显式写的选项会覆盖全局。
- 仅有全局配置不会自动轮转“所有日志文件”：必须有某个 stanza（在 `/etc/logrotate.conf` 或 `/etc/logrotate.d/*`）明确匹配到日志路径，logrotate 才会处理。

### 个性化配置（分配置目录）

位置：`/etc/logrotate.d/`

```bash
ls -al /etc/logrotate.d/
```

该目录下通常按“服务/组件”拆分文件（如 `syslog`/`rsyslog`、`nginx` 等）。

### 配置文件加载规则（理解 `logrotate -v`）

执行：

```bash
logrotate -v /etc/logrotate.conf
```

行为是：
1. 读取 `/etc/logrotate.conf` 的全局配置
2. 读取 `include` 指定目录（通常 `/etc/logrotate.d/`）内的规则文件
3. 合并成“本次运行要处理的一组轮转规则”，逐条判断并执行
   `-v` 仅增加输出，不改变轮转逻辑；强制轮转用 `-f`

> 安全要求（常见排障点）：
> 被 `include` 引入的配置文件不能对 group/world 可写，否则 logrotate 会拒绝读取。

---

## logrotate 怎么轮转日志（RHEL + rsyslog）

本节回答两个问题：
- “它怎么判断要不要轮转？”
- “轮转时到底做了哪些动作？”

### 是否轮转：判断依据

`logrotate` 会基于以下信息决定某个日志这次是否轮转：
- 规则触发条件：如 `daily/weekly/monthly` 或 `size/minsize/maxsize`
- 状态文件：默认 `/var/lib/logrotate.status` 记录上次轮转时间点，避免同周期重复轮转
- 其他条件：如 `notifempty`（空文件不轮转）、`missingok`（文件不存在不报错）等

补充：
- `-v` 只会打印更多细节；不会改变是否轮转的判断。
- 需要“无条件立即轮转”用 `-f`；需要“演练不落盘”用 `-d`。

### logrotate 实际做了什么（以 rsyslog 为例）

示例配置（系统日志保留 180 天）：

```conf
/var/log/messages
/var/log/secure
/var/log/maillog
/var/log/cron
/var/log/spooler
{
    daily
    rotate 180
    maxage 180

    missingok
    notifempty

    compress
    delaycompress

    dateext
    dateformat -%Y%m%d

    sharedscripts
    postrotate
        /bin/systemctl kill -s HUP rsyslog.service >/dev/null 2>&1 || true
    endscript
}
```

当某个文件（例如 `/var/log/messages`）满足轮转条件时，典型流程如下：

1) 重命名当前日志文件（生成“轮转文件”）
- 启用 `dateext/dateformat` 时，轮转文件名会带日期后缀，例如：
  `/var/log/messages` -> `/var/log/messages-20260228`
- 未启用 `dateext` 时常见是数字后缀：`messages.1`、`messages.2` 等（取决于配置）

2) 创建新的空日志文件（如果启用了 `create`）
- 新建同名文件 `/var/log/messages`，并设置权限/属主（由 `create`/`su` 等配置决定）
- 这一步很关键：rsyslog 必须能继续写入新文件

3) 执行 `postrotate`：通知 rsyslog 重新打开日志文件句柄
- `systemctl kill -s HUP rsyslog.service` 的目的通常不是“重启服务”，而是让 rsyslog 收到 `HUP` 后重新打开日志文件，从而继续往新建的 `/var/log/messages` 写入
- `sharedscripts` 表示本 stanza 匹配多个日志时，脚本只执行一次（避免对 rsyslog 重复发送信号）

4) 压缩与延迟压缩
- `compress`：轮转文件将被压缩（常见为 `.gz`）
- `delaycompress`：最新一次轮转出来的文件先不压缩，等下一次轮转时再压缩上一期，降低“程序仍短暂写旧文件”时的风险

5) 清理策略（rotate/maxage）
- `rotate 180`：数量维度最多保留约 180 份历史文件
- `maxage 180`：时间维度删除超过 180 天的轮转文件
  两者同时使用可实现“双保险”（避免轮转频率变化或手工执行导致保留超预期）

---

## 示例（目标：保留 180 天）

### 1) syslog/rsyslog 系统日志保留 180 天

```conf
/var/log/messages
/var/log/secure
/var/log/maillog
/var/log/cron
/var/log/spooler
{
    daily
    rotate 180
    maxage 180

    missingok
    notifempty

    compress
    delaycompress

    dateext
    dateformat -%Y%m%d

    sharedscripts
    postrotate
        /bin/systemctl kill -s HUP rsyslog.service >/dev/null 2>&1 || true
    endscript
}
```

### 2) 二进制日志（wtmp 等）

```conf
/var/log/wtmp
{
    daily
    rotate 180
    maxage 180

    missingok
    notifempty

    compress
    delaycompress

    dateext
    dateformat -%Y%m%d

    # wtmp/utmp 属于二进制日志，建议按系统约定权限显式创建
    create 0664 root utmp
}
```

说明：
- 同一个 stanza 里 `create` 只能写一次；如果不同文件需要不同的 `create` 权限/属主，建议拆成多个 stanza。

### 3) systemd 管理的业务服务日志（通用写法）

```conf
/var/log/myapp/*.log
{
    daily
    rotate 180
    maxage 180

    missingok
    notifempty

    compress
    delaycompress

    dateext
    dateformat -%Y%m%d

    # 如果日志目录/文件属于非 root 用户，建议加 su，避免权限/安全问题
    su myapp myapp
    create 0640 myapp myapp

    sharedscripts
    postrotate
        /bin/systemctl reload myapp.service >/dev/null 2>&1 || true
    endscript
}
```

说明：
- `reload`/`HUP`/重启选哪个取决于服务是否支持“重开日志文件”。优先使用应用/服务官方推荐方式。
- 如果 `postrotate` 需要 root 权限（例如 `systemctl`），请在实际环境中验证脚本是否具备足够权限（logrotate 通常由 root 触发；但在 stanza 使用 `su` 时应特别留意）。

---

## 命令使用

常用命令：

```bash
# 1) 演练：只看会做什么，不落盘、不更新状态文件
logrotate -d /etc/logrotate.conf

# 2) 实跑：详细输出
logrotate -v /etc/logrotate.conf

# 3) 强制轮转（比如刚改了 /etc/logrotate.d/xxx）
logrotate -vf /etc/logrotate.conf

# 4) 用独立状态文件（不同用户/不同日志集合分开管理）
logrotate -v -s /var/lib/logrotate.myapp.status /etc/logrotate.d/myapp

# 5) 把 verbose 输出写到文件（注意会覆盖）
logrotate -v -l /var/log/logrotate-run.log /etc/logrotate.conf

# 6) 传入多个配置文件（后面的配置会覆盖前面的同名设置）
logrotate -v /etc/logrotate.conf /etc/logrotate-extra.conf
```

---

## 配置详解（按功能分类）

以下为 logrotate 配置项的完整整理（按功能分类）。实际使用时建议先掌握“常用项”，其余作为速查。

### 轮转控制（Rotation）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `rotate <count>` | 保留旧日志的份数，超过后删除。`0`=不保留直接删；`-1`=不删除 | `rotate -1` 会无限积累日志，需谨慎，建议配合 `maxage` |
| `olddir <directory>` | 将轮转后的旧日志移入指定目录 | `rename()` 跨文件系统会失败；跨设备场景通常需要 `copy`/`copytruncate`/`renamecopy` 等策略 |
| `noolddir` | 日志在原目录轮转（覆盖 `olddir`） | — |
| `su <user> <group>` | 指定轮转时使用的用户/组 | 主要用于非 root 拥有的日志目录/文件场景，避免权限与安全检查导致跳过 |

### 轮转频率（Frequency）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `hourly` | 每小时轮转一次 | 需要调度（timer/cron）也改为每小时运行，否则不会“真正每小时轮转” |
| `daily` | 每天轮转一次 | — |
| `weekly [weekday]` | 每周轮转，可指定星期几（0=周日，1=周一 ... 6=周六） | 不指定 weekday 时通常默认为周日（0） |
| `monthly [monthday]` | 每月轮转，可指定日期（如 1=1 号） | — |
| `yearly` | 每年轮转一次 | `yearly` 等价于 `annually`（不同版本可能同时支持） |
| `size <size>` | 按大小轮转（支持 k/M/G），不考虑时间 | 与时间类选项同时出现时，以“最后出现的那个”为准，避免混用 |
| `minsize <size>` | 大小超过阈值且满足时间间隔才轮转 | 时间未到则不轮转 |
| `maxsize <size>` | 大小超过阈值就立即轮转（无视时间间隔） | 常用于防止日志异常暴涨 |

### 文件筛选（File selection）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `missingok` | 日志文件不存在时不报错，继续处理下一个 | — |
| `nomissingok` | 日志文件不存在时报错（默认行为） | — |
| `ignoreduplicates` | 忽略后续对同一日志文件的重复匹配 | — |
| `ifempty` | 即使日志为空也轮转（默认） | — |
| `notifempty` | 日志为空时不轮转 | — |
| `minage <count>` | 不轮转小于 count 天的日志 | — |
| `maxage <count>` | 删除超过 count 天的旧日志 | 通常在该 stanza 触发轮转/清理时生效；配合 `rotate` 使用更稳妥 |
| `tabooext [+] <list>` | 设置禁止扫描的文件扩展名列表，`+` 表示追加 | 默认包含 `.bak`、`.old`、`.orig`、`.rpmsave` 等常见备份扩展名 |
| `taboopat [+] <list>` | 设置禁止扫描的 glob 模式列表 | 默认为空 |

### 文件与目录操作（Files and Folders）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `create [mode owner group]` | 轮转后立即创建同名新日志文件，可指定权限/属主 | 一般在 `postrotate` 前创建；`copy`/`copytruncate` 模式下不适用 |
| `nocreate` | 轮转后不创建新日志文件 | — |
| `createolddir [mode [owner [group]]]` | olddir 不存在时自动创建，默认权限 0755 | — |
| `nocreateolddir` | olddir 不存在时不自动创建 | — |
| `copy` | 复制日志文件，不修改原文件 | 适合做快照；`create` 在此模式下无效 |
| `nocopy` | 不复制（覆盖 `copy`） | — |
| `copytruncate` | 复制后将原文件就地截断为 0，而不是移走再新建 | 无法通知程序重开日志时常用；复制与截断之间存在极小窗口可能丢日志 |
| `nocopytruncate` | 覆盖 `copytruncate` | — |
| `renamecopy` | 先重命名为临时文件，执行脚本后再复制为最终名，最后删除临时文件 | 适合需要脚本介入且可能跨设备的场景；隐含 `nocopytruncate` |
| `norenamecopy` | 覆盖 `renamecopy` | — |
| `shred` | 用 `shred -u` 安全删除旧日志（降低恢复可能） | 性能较慢，默认关闭 |
| `noshred` | 不使用 shred（默认） | — |
| `shredcycles <count>` | 指定 shred 覆写次数 | 不指定则使用 shred 默认值 |
| `allowhardlink` | 允许轮转有多个硬链接的文件 | 默认关闭；配合 `shred`/`copytruncate` 可能影响所有硬链接目标，需谨慎 |
| `noallowhardlink` | 不轮转有多个硬链接的文件（默认） | — |

### 压缩（Compression）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `compress` | 压缩旧日志，默认用 gzip | — |
| `nocompress` | 不压缩旧日志 | — |
| `compresscmd` | 指定压缩命令（默认 `/bin/gzip`） | 修改后通常也需要更新 `compressext` |
| `uncompresscmd` | 指定解压命令（默认 `/bin/gunzip`） | — |
| `compressext` | 指定压缩文件扩展名（默认 `.gz`） | — |
| `compressoptions` | 传给压缩程序的命令行参数（gzip 默认 `-6`） | 换用其他压缩程序时可能需要调整 |
| `delaycompress` | 推迟到下一次轮转才压缩上一个旧日志 | 需与 `compress` 配合；适用于程序仍可能短暂写旧日志的场景 |
| `nodelaycompress` | 覆盖 `delaycompress` | — |

### 文件命名（Filenames）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `extension <ext>` | 轮转后保留原扩展名，如 `mylog.foo` -> `mylog.1.foo.gz` | — |
| `addextension <ext>` | 轮转后追加指定扩展名 | 若原文件已有该扩展名，可能被移动到末尾 |
| `start <count>` | 轮转编号起始值，如 `start 0` 则第一个旧文件为 `.0` | — |
| `dateext` | 用日期替代数字序号作为旧文件后缀 | — |
| `nodateext` | 覆盖 `dateext`，使用数字序号 | — |
| `dateformat <format>` | 自定义日期格式（类似 strftime，logrotate 支持的格式符有限） | 日期戳建议保持“年-月-日”顺序以便字典序排序，否则可能影响“最旧文件”判断 |
| `dateyesterday` | 用昨天日期命名，使文件名与日志内容时间更一致 | — |
| `nodateyesterday` | 覆盖 `dateyesterday` | — |
| `datehourago` | 用一小时前时间命名（适合 hourly 轮转） | — |
| `nodatehourago` | 覆盖 `datehourago` | — |

### 邮件通知（Mail）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `mail <address>` | 旧日志将被删除时，先发送到指定邮箱 | — |
| `nomail` | 不发邮件（默认） | — |
| `mailfirst` | 发送刚刚轮转的文件（最新旧日志） | — |
| `maillast` | 发送即将过期删除的文件（最老旧日志，默认） | — |

### 引入外部配置（Include）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `include <file_or_dir>` | 引入其他配置文件或目录 | 被引入的配置文件不得对 group/world 可写；会跳过非普通文件和 taboo 扩展名文件 |

### 脚本钩子（Scripts）

| 配置项 | 作用 | 注意事项 |
| --- | --- | --- |
| `prerotate … endscript` | 轮转前执行脚本 | 默认对每个匹配文件分别执行；脚本失败通常会影响该文件后续动作 |
| `postrotate … endscript` | 轮转后、压缩前执行脚本 | rsyslog 常用来发 `HUP`/reload 以重新打开日志文件 |
| `firstaction … endscript` | 整个 stanza 最先执行，仅执行一次 | 仅在至少有一个文件将被轮转时才运行；失败通常会终止该 stanza |
| `lastaction … endscript` | 整个 stanza 最后执行，仅执行一次 | 仅在至少有一个文件被轮转后才运行 |
| `preremove … endscript` | 删除旧日志前执行脚本 | 常用于清理前自定义处理 |
| `sharedscripts` | pre/postrotate 对整个 stanza 只运行一次 | 适用于对 rsyslog 这类“统一重开句柄”的服务做一次性通知 |
| `nosharedscripts` | 每个匹配文件分别执行脚本（默认） | — |

> 脚本参数传递、以及在 `sharedscripts` 下参数形态在不同版本/场景会有差异；如需严格依赖参数，请以 `man logrotate` 与实际 `-d/-v` 输出验证为准。

---

## 重要注意事项汇总（建议新人重点看）

1. 通配符谨慎：`*` 可能匹配到已轮转的旧文件，推荐用更精确的 `*.log`，或配合 `olddir` 隔离旧文件。
2. `size` 与时间选项不要混用：同时出现时以“最后出现的那个”为准，容易造成误解与误配。
3. `copytruncate` 有丢日志窗口：复制与截断之间存在极小时间窗口，高频写入场景需评估风险。
4. `rotate -1` 慎用：会无限保留旧日志，必须搭配 `maxage` 或其他手段限制磁盘占用。
5. `dateformat` 建议保持可字典序排序：尽量按“年-月-日（-时分）”顺序，避免影响最旧文件判断。
6. `allowhardlink` 慎用：配合 `shred`/`copytruncate` 可能影响所有硬链接指向的数据。
7. 配置文件权限：被 `include` 引入的配置文件不能 group/world writable，否则 logrotate 出于安全拒绝读取。
8. systemd 相关限制：如通过 `logrotate.service` 运行且 unit 启用了 `ProtectSystem`/`ReadOnlyPaths` 等，可能限制对某些路径的写入（通常 `/var/log` 不受影响，具体以 unit 为准）。
9. `hourly` 需配套修改调度：默认每天跑一次 logrotate；要实现每小时轮转必须同时调整 timer/cron 频率。
10. rsyslog 场景必须“通知重开句柄”：轮转后若不对 rsyslog 发送 `HUP`/reload，可能继续写入旧文件（取决于写入方式与实现）。
