# coding:utf8

ERR_DEFAULT = -1  # 未知错误(或系统内部错误)

ERR_LOST_PARAMS = -2  # 参数缺失

ERR_SESSION_INVALID = -3  # 无效的会话ID [表示由netsdk_alloc分配的ip失效了]

ERR_CONNECTION_FAIL = -4  # 网络连接失败

ERR_ACCESS_DENIED = -5  # 拒绝访问 [鉴权失败]

ERR_TARGET_OFFLINE = -6  # 对方不在线

ERR_SESSION_FAIL = -7  # 错误的会话 [把错误的会话ID用做函数操作]

ERR_CONNECTION_TIMEOUT = -8  # 请求超时

ERR_GATEWAY = -9  # 获取网关信息失败 [无法取得网关信息]

ERR_DATA = -10  # 数据错误
