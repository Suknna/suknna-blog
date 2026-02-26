日期：2026-02-04

环境信息：

+ OrbStack：2.0.5 (19905)
+ kubectl：v1.32.7
+ kube-apiserver / kubelet（集群）：v1.33.5+orb1



1. 问题出现：`kubectl top` 失灵

---

我想在本地集群里看一下 Pod 的资源使用量，按惯例跑：

```bash
kubectl top pod -A
```

这一步如果正常，应该能看到每个 Pod 的 CPU(cores)/MEMORY(bytes)。

但现实是：`top` 没有指标可用（典型表现是无数据或 Metrics not available 之类的提示）。直觉告诉我：metrics-server 可能没装好。



2. 先不要动 metrics-server：先把链路理清楚

---

`kubectl top` 的数据来源是 `metrics.k8s.io` API，而 `metrics.k8s.io` 是 metrics-server 聚合出来的。metrics-server 本身不采集，它去各节点 kubelet 拉指标。

所以链路是这样的：

+ kubelet 暴露 Summary API：`/stats/summary`
+ metrics-server 抓 Summary API（或相关 kubelet stats）
+ metrics-server 生成 `metrics.k8s.io`
+ `kubectl top` 读取 `metrics.k8s.io`

结论：排查时必须先确认 kubelet 有没有“原材料”。



3. metrics 层排查：API 还在，但可能只是空转

---

我先直接看 `metrics.k8s.io` 是否返回内容：

```bash
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/pods" | head
```

当它返回 `PodMetricsList` 时，说明 metrics-server 至少活着、API 路由也通。  
但这不代表数据就完整，因为 metrics-server 可能只是拿到了一部分，或者 kubelet 根本没吐 Pod/Container stats。

接着看 metrics-server 日志（用于确认它是否在抱怨 kubelet）：

```bash
kubectl -n kube-system logs deploy/metrics-server --tail=200
```

Kubernetes 社区里有一类非常典型的错误：metrics-server 抓 kubelet 的 `/stats/summary` 时得到 500，然后 `kubectl top` 没数据。[1]



4. kubelet 层排查：Summary API 才是真相

---

既然 metrics-server 只是中间商，那就绕过它，直接查 kubelet Summary API。

先取一个 node 名：

```bash
NODE="$(kubectl get node -o name | head -n1 | cut -d/ -f2)"
```

然后通过 apiserver proxy 请求：

```bash
kubectl get --raw "/api/v1/nodes/$NODE/proxy/stats/summary" | head
```

关键点在 `pods` 字段。我用 `rg` 快速定位：

```bash
kubectl get --raw "/api/v1/nodes/$NODE/proxy/stats/summary" | rg '"pods"' -n
```

当时的核心现象是：Summary 里 Pod/Container 级别统计不对劲（常见就是 `pods` 为空或缺失）。  
这就解释了为什么 `kubectl top` 没法工作：上游根本拿不到 Pod 的资源使用量。



5. 查 GitHub：OrbStack issue 给了答案

---

到这一步，问题从“metrics-server 配置”变成了“kubelet 的 stats 从哪里来”。

继续搜索后，找到了 OrbStack 的相关 issue：

[https://github.com/orbstack/orbstack/issues/2143](https://github.com/orbstack/orbstack/issues/2143)

里面提到：需要在 kubelet 配置中开启一个 feature gate：

```yaml
featureGates:
  PodAndContainerStatsFromCRI: true
```



6. 修复：在 kubelet 配置里开启 `PodAndContainerStatsFromCRI`

---

我在 OrbStack 的 Kubernetes 设置页（Kubelet Configuration）里加上：

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  PodAndContainerStatsFromCRI: true
```

应用并重启集群后，再验证：

```bash
kubectl top pod -A
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/pods" | head
kubectl get --raw "/api/v1/nodes/$NODE/proxy/stats/summary" | rg '"pods"' -n
```

这次 `kubectl top` 正常输出，`metrics.k8s.io` 也能看到容器级的 `usage.cpu` / `usage.memory`。



7. 这个配置的作用：为什么加了它就好？

---

Kubernetes 官方文档对这个开关的解释很明确：

+ 默认情况下，kubelet 使用内嵌 cAdvisor 获取节点概要指标数据
+ 如果启用 `PodAndContainerStatsFromCRI`，并且容器运行时支持通过 CRI 访问统计信息，那么 kubelet 会改为通过 CRI 获取 Pod/容器级别指标，而不是从 cAdvisor 获取。[2]

把它翻译成一句话就是：

让 kubelet “别自己猜”，而是“直接问容器运行时（CRI）你到底用了多少 CPU/内存”。

在 OrbStack 这种“本地虚拟化封装很深”的环境里，cAdvisor 的观测路径可能不完整；改走 CRI stats 之后，kubelet 能拿到更可靠的 Pod/Container 统计，于是 Summary API 变完整，metrics-server 才有东西可聚合，`kubectl top` 才能恢复。



8. 收获：以后遇到 `kubectl top` 问题怎么最快定位？

---

我把排查顺序固定成三步，基本就不会走弯路：

1）看聚合层：`metrics.k8s.io` 是否有数据

```bash
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/pods" | head
```

2）看源头：kubelet Summary API 的 `pods` 是否正常

```bash
kubectl get --raw "/api/v1/nodes/$NODE/proxy/stats/summary" | rg '"pods"' -n
```

3）如果 Summary 的 pod stats 不正常，再去找“该发行版/环境”的已知问题  
这次就是 OrbStack issue 直接给了 feature gate 的解法。



9. 延伸阅读

---

+ OrbStack issue（本次直接线索）：`orbstack/orbstack#2143`  
[https://github.com/orbstack/orbstack/issues/2143](https://github.com/orbstack/orbstack/issues/2143)
+ Kubernetes 官方文档：Node metrics、Summary API、以及 `PodAndContainerStatsFromCRI` 的说明  
[https://kubernetes.io/zh-cn/docs/reference/instrumentation/node-metrics/](https://kubernetes.io/zh-cn/docs/reference/instrumentation/node-metrics/)  [2]
+ Kubernetes issue：metrics-server 抓 `/stats/summary` 返回 500、`kubectl top` 无数据的典型案例（用于对照症状）  
[https://github.com/kubernetes/kubernetes/issues/111276](https://github.com/kubernetes/kubernetes/issues/111276)  [1]



参考

---

[1] [https://github.com/kubernetes/kubernetes/issues/111276](https://github.com/kubernetes/kubernetes/issues/111276)  
[2] [https://kubernetes.io/zh-cn/docs/reference/instrumentation/node-metrics/](https://kubernetes.io/zh-cn/docs/reference/instrumentation/node-metrics/)

