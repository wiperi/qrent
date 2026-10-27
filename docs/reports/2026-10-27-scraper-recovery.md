# Qrent 采集恢复验收（2026-10-27）

## 代码与真实部署位置

- 主仓库：<https://github.com/wiperi/qrent>。后端在同仓库 `packages/backend`，前端、共享代码、Agent 和采集器也在此 monorepo；本次未找到另一个可访问的 Qrent 后端仓库。
- Real Estate：`packages/scraper/src/scrapers/realestate.py`；Domain：`packages/scraper/src/scrapers/domain.py`。
- 旧说明提到的 `packages/tt.scraper-v2` 没有提交，根目录 `tt*` 规则会忽略它。
- 腾讯云现有独立采集目录：`/root/qrent-scraper`；本次 release：`/root/qrent-scraper/releases/recovery-20261027`。运行环境为 TencentOS Server 4.4、Python 3.11、Xvfb、Camoufox。

## 根因与修复

原程序和 cron 都还在。2026-10-27 原日志中的所有 Real Estate 导航因旧的 gost/SSH 代理返回 `ERR_TUNNEL_CONNECTION_FAILED`，得到 0 条后仍报告完成；旧 shell 经过 `tee` 丢失 Python 退出码。

新的入口保留原 SQLite 数据库，按 `(house_id, source)` upsert；新增的 enrichment 表保存评分等扩展信息。空扫描、403/429、预算耗尽、详情失败或部分地区失败返回非零，保留历史房源。列表刷新不会清空已有描述和评分。

网页选择器也已修正：Domain 使用当前卡片的规范链接解析州和邮编，保留房号与街道原文；Real Estate 从链接识别 VIC/NSW、从房源 JSON-LD 读取实际邮编。搜索结果可能包含邻区，因此不能直接把搜索邮编写到每条房源上；缺失邮编只在另一来源的同房号、街道、城区和州有唯一对应时补齐。

## 网络、增量与费用

- Domain 默认直连。私有环境配置 `PROXY_SOURCES=realestate`，仅 Real Estate 使用 FlashProxy 澳洲住宅代理；开始 Real Estate 前验证出口 `country=AU`，一次任务保持黏性会话，失败重试更换会话。代理故障时 Domain 仍能落库，整体报告部分完成。
- 图片、字体、视频不下载，但保留图片 URL；公共 CDN 脚本及样式使用无认证直连，保留必要 CORS 响应头，移除 Cookie/Authorization。直连失败不会转收费代理补拉。
- Domain 先采集；最近 7 天内完整的同址、同租金、同卧室数详情可给 Real Estate 或同平台复用。不同房号不合并，原站 ID、价格、链接始终各自保留。
- 购买的是一次性 Residential Lite 1GB，实际扣款 **USD 0.30**，无自动续费；余额 **USD 2.70**。试验结束账户刷新显示剩余 **946.52 MB**。这是供应商读数，应用内传输估计不能替代其账单。
- 代理会话设计来源：恢复的 Qrent 服务器 LycheeIP/gost 部署。千问密钥私下复用本机 `pdftomd/.env` 的 DashScope 配置；均存于权限 0600 的忽略文件，不进入 Git。
- 将已不在当前账户模型列表中的 `qwen-plus-1220` 改为环境可选的 `qwen-plus`，实际调用和房源评分均成功。Playwright 固定为 Camoufox 0.5.8 兼容的 1.62.0；DashScope 升级至 2.0.2。

## 真实验收

本地验证：Domain 直连悉尼 Newtown / 墨尔本各 20 条，2 条详情、1 条实际千问评分成功，代理请求和代理字节均为 0；Real Estate AU 代理两地各 25 条，2 条详情成功。

服务器第一次合并验收：`20261027_142128_921925`，两地各取一页。

| 来源 | Newtown | Melbourne | 合计 |
| --- | ---: | ---: | ---: |
| Domain 直连 | 20 | 20 | 40 |
| Real Estate AU | 25 | 25 | 50 |

- 90 条全部插入原库，4 个 Domain 详情成功、1 个真实千问评分成功；`status=success`、进程退出 0，错误列表为空。
- 澳洲出口：Victoria / Telstra。应用记录代理 13 次、697,164 bytes；普通直连 330 次、25,009,942 bytes；屏蔽 230 个资源，未触及预算。
- 原库总量由 1,962 条变为 2,052 条，原有 407 条活跃记录保留并新增 90 条活跃记录；`PRAGMA quick_check` 返回 `ok`。
- 本地与服务器均运行 21 项采集专项测试：地区、房号、跨源 ID、增量缓存、CORS、敏感头、预算、失败退出、代理故障时 Domain 继续、旧数据保留等；全部通过。依赖检查通过。

正式脚本复测：`20261027_143012_681655`，Real Estate 两地各 25 条、各 1 条实际详情成功，另有 4 条详情复用 Domain、9 条邮编同址补齐，新增 2 条其余 upsert；评分 1 条，退出 0。代理记录 1,759,103 bytes，普通流量 35,026,465 bytes。此时安装用的临时本机网络已经停用，运行不依赖本机在线。

安装后的最终入口复测：`20261027_143709_664984`，Domain 直连 Sydney 市区再新增 20 条，无代理请求，退出 0。最终数据库 **2,074 条 / 519 条活跃**，本次累计新增 **112 条**。在线备份条数一致、完整性检查通过；实际验证了独占锁退出 75，以及错误参数经 shell/tee 返回非零 1。

原始逐次报告和 CSV 位于服务器对应 output 目录；本地证据位于被忽略的 `packages/scraper/output/recovery-20261027`。这些是真实采集记录，不是测试假数据。

## 运行与回滚

`/root/qrent-scraper/run_scraper.sh` 已安装 `ops/run_recovery.sh`，接回原有 **每日 02:00（Asia/Beijing）** cron，crond 状态 active。下一次为 2026-10-28 02:00，尚未声称该未来任务已执行。脚本提供独占锁、2 小时超时、每次 5,000 请求 / 约 30 MB 已记录代理传输上限。每天先采 Domain，详情总计最多 30 条、评分最多 5 条。每区先取一页，配置为悉尼大学周边 **22 区**和墨尔本 **9 区**，**不等于两个都市区的全量覆盖**；需要时可明确提高页数，预算仍生效。

每日 **03:00** 备份已改用 `ops/backup_sqlite.py` 的 SQLite 在线备份接口，能包含 WAL 中已提交数据，保留原来的 30 天常规备份清理。原脚本、crontab 和数据库备份在 `/root/qrent-scraper/backup/pre-recovery-20261027`，清理任务不会递归删除这个回滚目录；可把备份的 `run_scraper.sh` 复制回原位置恢复旧入口。本次增量写入不会自动删除历史记录。

此独立部署写入 SQLite。仓库主后端使用另一条 MySQL 数据路径，本次不能把 SQLite 更新称为网页后端已同步；公开网站和 API 健康检查均返回 HTTP 200。

服务器 33 个运行源码/测试/依赖文件的 SHA-256 与本地一致，清单存于 release 的 `DEPLOYMENT.json`。已清理安装包、临时浏览器配置及重复的私有下载文件。14:48 删除了本次临时 SSH 公钥，确认服务器匹配数为 0，并用该密钥重新登录得到权限拒绝；本机临时私钥、公钥及安装用网络转发均已删除或停止。
