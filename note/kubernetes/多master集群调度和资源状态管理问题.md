
在多节点中master集群的apiserver是无状态的所有master节点的apiserver都是工作的，controller manager和scheduler是在某一个时间段内只有一个节点的controller manager和scheduler进行工作 

# 如何查看：

在kubernetes1.24版本之前使用leases来查看

```bash
[root@k8s-master1 ~]# kubectl get lease -n kube-system
NAME                      HOLDER                                             AGE
kube-controller-manager   k8s-master2_72e295a6-5e0c-4849-9d0c-82b3246f160f   14d
kube-scheduler            k8s-master3_09a0890c-9b20-4b00-9b9a-c41c3a74ca89   14d
```

在kubernetes1.24版本之后使用ep来查看

```bash
[root@k8s-master1 ~]# kubectl get ep -n kube-system
NAME             ENDPOINTS                                           AGE
calico-typha     172.20.20.15:5473                                   14d
kube-dns         10.15.156.73:53,10.15.156.73:53,10.15.156.73:9153   14d
metrics-server   10.10.159.134:4443                                  14d

#注意如果你使用的是1.24以后的版本的kubernetes这个命令执行完成后会有kube-controller-manager和kube-scheduler的内容
```

