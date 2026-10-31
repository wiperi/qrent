# Qrent 联系方式、账户和域名检查（2026-10-31）

## 生产状态

- 联系页：中英文均已移除深圳占位办公室、地址及未经核实的办公时间。
  页脚显示 2026，并自动使用当前 UTC 年份。
- 联系表单：原来只打印输入、却提示发送成功；现在明确打开邮件草稿，
  由用户在自己的邮件客户端发送，没有伪造送达状态。
- 联系页首次生产发布：PR #317，原仓库 main `5931bb05c5bbb004d7cf834b0e6e39334c9008df`。
  原 Vercel Production deployment `7451497025` 于 2026-10-31 00:10:33 UTC 成功。
  `/zh/contact`、`/en/contact` 都已核对 HTTP、初始 HTML 和实际浏览器。
- 账户后端：实际运行版本 `0feda9e12a2ee8bbf8af01ac0e1b91a37ca5f985`，
  CD `41137782725`。原 Redis 已恢复，最终检查为 healthy、内部 PONG，
  后端连接 PING 成功；公网匿名退出为预期的 401。
- 完整账户前端 [PR #306](https://github.com/wiperi/qrent/pull/306) 已合并，
  生产版本 `539fcb020f3debfb5d36cd733a49b5fc9de517ab`。
  原 Vercel Production deployment `7452571824` 于 2026-10-31 01:44:36 UTC 成功，
  原仓库 main CI `41156712959` 通过。中英文 account/contact 均为 200，账户页 noindex。
- 原生 Chrome 隔离无痕窗口已实测登录、刷新恢复、邮箱能力提示和退出恢复访客状态；
  未改动用户正常浏览器窗口中的账户。生产界面截图及 HTTP 检查已保存。

没有修改线上表结构、原有用户 ID 或收藏关系，没有导出部署 Secrets。
这次维护没有新增地图、模型请求，没有发送真实验证邮件或购买付费服务。

## 账户修复范围

后端沿用 Express/tRPC、Prisma/MySQL 的原用户、会话和收藏结构：

- 注册和资料更新共用输入白名单，不能由调用方设置 ID、验证状态和关联。
  邮箱 trim/lowercase，保留原表 50 字符限制。
- 登录兼容已有六位密码；新设密码至少八位、最多 72 个 UTF-8 字节，
  避免 bcrypt 截断。资料接口只返回明确允许公开的账户字段。
- JWT 同时验证原会话表的有效记录；退出撤销当前会话，改密码原子撤销全部会话。
  凭据行锁和条件更新阻止并发旧密码登录、覆盖新密码或恢复过期验证状态。
- 邮箱验证码使用安全随机数、摘要存储、30 分钟有效、原子消费一次。
  重发、尝试次数、账户和连接来源均有限流；Redis 故障有明确超时与失败状态。
- 发信必须先验证 SendGrid 可读、有效周期内的正数赠送额度，再以 Redis 原子预留。
  额度不明、为零、已过期或请求结果不确定时都停止，不启用付费兜底。

已上线的 PR #306 前端改动包括：刷新恢复登录、禁用存储时的内存回退、跨标签同步、
账户切换时清除原账户查询缓存、逐请求冻结 token、真实退出、过期处理、账户邮箱状态页、
模态框焦点/Escape/重新打开、未登录收藏入口。邮件暂不可发送时，已有验证码仍可提交。

## 验证与发布边界

- 本地 51 项隔离后端测试、32 项前端测试（13 账户、19 SEO/content）通过，
  类型检查和生产构建通过；没有调用旧测试里的生产数据库 setup。
- 本地浏览器覆盖登录/刷新、短暂错误重试、跨标签退出/切换、撤销会话、
  验证码倒计时以及发信停用后的已有验证码提交。
  Native Chrome iPhone 16（393 × 852）检查过布局；IAB 未生效的 viewport 设置不算移动端验收。
- 首次生产验收在注册 503 时停止；确认 Redis 恢复后，保留失败回执，复用同一隔离身份
  做一次有界续验。最终 22 个接口检查通过：注册白名单、资料脱敏、两个独立会话、
  退出撤销、改密码撤销、旧密码拒绝、收藏添加/查询/删除及空收藏/会话清理。
  保留一个合成验收用户供审计，没有修改原有用户；之后的生产 UI 登录/刷新/退出也通过。
- 新发邮件在未确认有效赠送额度时明确返回 503，未发出验证码返回 400；
  这是已验证的停用状态，不能称邮箱投递已完成。
- 独立安全复核发现的问题均已修正并覆盖。
  控制进程恢复脚本额外检查 systemd 钩子、启动二进制/参数、服务停止传播、
  live restore 及业务 PID/启动时间、镜像、挂载指纹。
  未满足前提时不重启控制进程，不运行 Compose down 或卷清理。

## Redis 恢复与数据保留

原 Redis init 成为僵尸，Docker/containerd 对任务状态不一致；旧任务清理后，
停止态 OCI 实例与遗留 `/run/containerd` 临时目录又阻塞同 ID 的启动。
最终只处理经证明不含活动进程的原 Redis 运行时，把旧临时目录原子移到私有隔离区保留。
实际 bundle/rootfs 挂载数为 0，本次没有执行卸载命令。

关键回执：控制进程恢复 `41150584477`；独占孤儿运行时恢复 `41152775132`；
最终 bundle 计划 `41156194857`、执行 `41156268507`；最终健康检查 `41156442971`。
最终执行回执为 verified，原 Docker Redis 容器 ID、镜像、匿名数据卷均保留，
MySQL、后端、n8n 的 PID/启动时间、镜像、挂载及实际 mountinfo 摘要保持原样，
原 `.env`、Compose 和数据库表结构保持原样。

Redis 由 `qrent-account-store.service` 监督，启动前先检查专用公网端口保护；
Docker 自身不自动启动这一个 Redis。普通后端 CI/CD 仍只更新后端，保留原数据库和 Redis。
单次外网 TCP 探测 6379 超时，结合内部 PONG 与规则回执，确认不需要开放公网 Redis。
当前磁盘约 2.3 GiB 可用，原 2 GiB 发布门槛未降低。恢复期间暂停了仅运维脚本提交的
重复后端镜像发布，实际账户后端代码始终是已部署的 0feda9e，最终前端 main CI 已通过。

每次失败/不确定尝试、备份和防重复标记都保留，不再次执行同一恢复动作。
后续先用原仓库手动 workflow 的只读 plan，不能删除标记、盲目重启 Docker、
清空 Redis 或改用新卷。部署密码始终留在原 GitHub environment Secrets。

## ShipAny 与后续账户工作

只读参考了本机 `shipany-账户支付模板/shipany-tanstack/src/core/auth/`。
它的 Better Auth/Drizzle 结构不能直接替换现有整数 ID 的 Prisma 用户与收藏表；
后续迁移需要密码哈希、所有权关联、兼容回填及回滚方案。

仍需补充：

1. 免费且确实可发信的邮件服务、密码找回流程。当前查询到的新发验证码邮件没有有效额度，
   不应以虚假的成功提示掩盖。
2. 将保留的 localStorage bearer / 90 天 JWT 迁移为经过兼容验证的 HttpOnly 会话/BFF。
3. 注册和找回出现滥用时可接入服务端验证的 [Turnstile 免费方案](https://developers.cloudflare.com/turnstile/plans/)；普通浏览房源不必强制验证码。官方免费档支持不限量验证，且可独立于其他 Cloudflare 服务使用，不要求迁移域名。
   当前没有把未配置的 CAPTCHA 或短信验证码宣传成已启用。
4. Google OAuth、订阅资格、一个月期限、每天推送属于后续完整订阅阶段，尚未实现。

## 域名、DNS 与邮件

注册商是 Namecheap；实际权威 DNS 是 Cloudflare：
`fattouche.ns.cloudflare.com`、`sue.ns.cloudflare.com`。
`www` CNAME 指向原 Vercel 集成，API 通过 Cloudflare 代理。
根域 HTTPS 重定向到 www，网站和 HTTPS 均能正常访问。
修改联系页、账户代码不需要变更注册商、NS 或应用托管，当前未修改任何 DNS 记录。

Registry RDAP 到期时间为 **2027-03-11 23:59:59 UTC**；
这不能证明 Namecheap 账户的自动续费开关已开启，自动续费尚未核实。

旧邮件 MX/SPF 使用 Namecheap forwarding，SendGrid s1/s2 DKIM 仍存在、域验证有效。
只读配额接口返回 remain=0、total=0、overage=0，next_reset=2025-09-02，
生产 capabilities 为 emailVerification=false，因此没有开通新付费计划或发送真实邮件。
联系页直接使用 Gmail，不依赖域名转发发信。

资料：[Registry RDAP](https://rdap.centralnic.com/rent/domain/qrent.rent)、
[Namecheap DNS 委托](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/)、
[SendGrid 额度接口](https://www.twilio.com/docs/sendgrid/api-reference/users-api/retrieve-your-credit-balance)、
[SendGrid 域验证](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)。

## 爬虫和预算的独立验收

悉尼日任务 `20261031_020005_264602` 已于 2026-10-31 06:28:33 北京时间完成。
只修补失败区域，没有重新跑全量、清账本或重算已成功的模型/通勤请求。

- 原学校周边范围 41/41 查询，5,064 个来源 ID；这是历史学校区域范围，不是整个悉尼。
- 去重后符合范围 2,733 地址；发布 2,661，暂缓 72。
- 发布来源：Domain 1,484 / Real Estate 1,177；学校关联 3,986。
- 只读回验检查 2,661 MySQL 行和 3,986 API 关联，失败列表均为空。
- `0 2 * * * /root/qrent-scraper/run_scraper.sh` 每天定时入口仍在；墨尔本暂缓。

正式持久账本只读核对：模型已计/预留 CNY 12.792124 / 50；
其他 API/代理 USD 0.60 / 4；通勤赠金 USD 0.638 / 40。
这不是供应商最终模型发票。维护本身未新增 API/代理采购和地图/模型请求。

私有验收回执、失败记录、备份校验和与生产截图保存在被忽略的
`packages/scraper/output/account-maintenance-20261031/`，不会提交凭据或原始数据库。
