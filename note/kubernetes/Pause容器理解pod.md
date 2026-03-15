在k8s中pod是最小单元

## pod和容器的关系
pod类似一个组容器的集合，这些容器之间共享一份存储，网络等资源。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2024/webp/42497920/1729650118846-6cac714b-efbd-4af8-aabe-86453d1e4875.webp)

一个pod下面除去主业务容器还有一个容器：pause容器。这是一个特殊的容器，它又叫infra容器，是每个pod都会自动创建的容器，它不属于用户自定义容器。

## pause容器
### pause容器镜像
使用 `docker inspect [CONTAINER_ID]` 查看一下 pause 容器的详情信息，可以发现 pause 容器使用的镜像为

```plain
registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.6
```

该镜像非常小，只有 484KB，由于它总是处于 Pause （暂时）状态，所以取名叫 pause。

## pod 在 kubelet 的创建过程
+ kubelet 在接收到 pod 的创建指令后，通过容器运行时（如 containerd、CRI-O）创建 POD 沙箱（Sanbox）
+ 运行时首先启动 pause 容器（infra 容器），该容器十分轻量它几乎不消耗资源只是长期睡眠
+ 随后业务容器启动加入（JoinNamespace 操作）到 pause 容器持有的 namespace 中

## pause 容器的作用
它仅作为 namespace 的持有者，确保业务容器崩溃不会导致整个命名空间崩溃。

## 为什么需要 pause 容器？

+ **命名空间生命周期管理**：
  如果没有 `pause` 容器，当业务容器退出时，其持有的命名空间也会被销毁，导致 Pod 内其他容器无法稳定共享资源（如网络）。`pause` 容器作为静态锚点，确保命名空间持续存在。
+ **资源清理**：
  当 Pod 被删除时，`kubelet` 会先杀死 `pause` 容器，从而自动释放所有关联的命名空间和资源（避免孤儿进程或残留资源）。

例如：你在 kubectl exec 到 pod 内部，通过 ip a 看到的地址是由 pause 容器持有的。

## 它会持有哪些资源？
### 网络命名空间（Network Namespace）最核心的资源
这是 pause 容器最重要的职责。

+ 它是什么？：一个完全隔离的网络堆栈，包括独立的网卡设备（如 eth0）、IP 地址、端口范围、路由表和 iptables/Netfiter 规则。
+ 如何持有？：pause 容器启动后，容器运行时会为它创建一个新的网络命名空间（除非使用 hostNetwork）。CNI 插件随后被调用、负载在这个命名空间内配置网络（分配 IP、创建网卡设置路由等）。
+ 为什么重要？：所有后续加入该 Pod 的业务容器，都会共享这个由 pause 容器持有的网络命名空间。因此，整个 Pod 只有一个 IP 地址，所有容器通过 localhost 相互通信，且不会发生端口冲突。

### IPC 命名空间（IPC NameSpace）
+ 它是什么？：隔离 System V 进程间通信（IPC）资源和 POSIX 消息队列。这允许 Pod 内的容器使用共享内存段或信号量等机制进行通信。
+ 如何持有？：如果 Pod 的 spec.shareProcessNamespace 字段未设置或设置为 false，pause 容器会持有一个独立的 IPC 命名空间供 POD 内容器共享。

### PID 命名空间（PID Namespace）-条件性持有
+ 它是什么？：隔离进程 ID 编号空间。不同 PID 命名空间中的进程可以有相同的 PID。
+ 如何持有？：这取决于 pod 配置。
    - 如果 spec.shareProccessNamespace 未设置或者设置为 false（默认），则每个容器包括 pause 自己都有自己的 PId 命名空间。此时 pause 容器不持有共享的 PID 命名空间。
    - 反之 pause 容器会创建一个 Pod 级别的 PID 命名空间。在这个模式下 pause 容器是 PID 1 的进程，所有容器中的进程都是它的子进程，你可以在一个容器中看到 Pod 内所有其它容器的进程。

### 挂载命名空间（Mount Namespace）- 间接关联
+ 虽然每个容器都有自己的挂载命名空间以实现文件系统隔离，但 pause 容器通常不直接持有一个共享的挂载命名空间。Pod 级别的存储（如 emptyDir 卷）是通过在每个容器的命名空间内单独挂载来实现共享的，而不是通过共享同一个挂载命名空间。

### 总结
| **资源类型** | **是否由 Pause 容器持有？** | **说明** |
| :--- | :--- | :--- |
| **网络命名空间** | **是** | **核心职责**。持有整个 Pod 的唯一 IP 和网络栈。 |
| **IPC 命名空间** | **是** | 持有 Pod 级别的 IPC 资源，供容器间通信。 |
| **PID 命名空间** | **条件性是** | 仅在 `shareProcessNamespace: true` 时持有，成为 PID 1。 |
| **挂载命名空间** | **通常否** | 每个容器独立，通过卷（Volume）机制共享存储。 |
| **UTS 命名空间** | **是** | 持有 Pod 的主机名（`spec.hostname`）。 |
| **用户命名空间** | **可能** | 如果配置了用户命名空间隔离，它也会是持有者。 |




