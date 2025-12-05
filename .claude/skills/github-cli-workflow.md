GitHub CLI (gh) 是 GitHub 官方命令行工具，以下是其常见功能：
🔐 认证与配置
gh auth login              # 登录 GitHub 账户
gh auth logout             # 登出
gh auth status             # 查看认证状态
gh config set editor vim   # 设置默认编辑器
📦 仓库管理
gh repo create             # 创建新仓库
gh repo clone owner/repo   # 克隆仓库
gh repo fork               # Fork 仓库
gh repo view               # 查看仓库信息
gh repo list owner         # 列出用户/组织的仓库
gh repo delete owner/repo  # 删除仓库
🔀 Pull Request
gh pr create               # 创建 PR
gh pr list                 # 列出 PR
gh pr view 123             # 查看 PR #123
gh pr checkout 123         # 切换到 PR #123
gh pr merge 123            # 合并 PR
gh pr close 123            # 关闭 PR
gh pr review 123           # 审查 PR
gh pr diff 123             # 查看 PR 差异
gh pr checks               # 查看 CI 检查状态
🐛 Issue 管理
gh issue create            # 创建 issue
gh issue list              # 列出 issues
gh issue view 456          # 查看 issue #456
gh issue close 456         # 关闭 issue
gh issue reopen 456        # 重新打开 issue
gh issue comment 456       # 添加评论
🔄 Workflow (GitHub Actions)
gh workflow list           # 列出所有 workflows
gh workflow view           # 查看 workflow 详情
gh workflow run            # 手动触发 workflow
gh run list                # 列出 workflow 运行记录
gh run view 789            # 查看运行详情
gh run watch               # 实时查看运行状态
gh run download            # 下载 artifacts
📋 Gist
gh gist create file.txt    # 创建 gist
gh gist list               # 列出 gists
gh gist view <id>          # 查看 gist
gh gist edit <id>          # 编辑 gist
🏷️ Release
gh release create v1.0.0   # 创建 release
gh release list            # 列出 releases
gh release view v1.0.0     # 查看 release
gh release download v1.0.0 # 下载 release assets
gh release upload v1.0.0 file.zip  # 上传文件到 release
🔍 浏览与搜索
gh browse                  # 在浏览器中打开仓库
gh search repos <query>    # 搜索仓库
gh search issues <query>   # 搜索 issues
gh search prs <query>      # 搜索 PRs
💬 API 调用
gh api repos/owner/repo/issues          # 调用 GitHub API
gh api graphql -f query='...'           # GraphQL 查询
gh api repos/owner/repo/pulls/123/comments  # 获取 PR 评论
🔧 实用示例
# 创建 PR 并指定标题和正文
gh pr create --title "Fix bug" --body "This fixes #123"

# 创建带标签的 issue
gh issue create --title "Bug report" --label bug,priority

# 列出我的 PR
gh pr list --author @me

# 查看 PR 的 CI 状态
gh pr checks

# 批准并合并 PR
gh pr review 123 --approve
gh pr merge 123 --squash

# 从模板创建仓库
gh repo create my-project --template owner/template-repo

# 查看当前分支的 PR
gh pr view --web
🎨 别名设置
gh alias set pv 'pr view'
gh alias set co 'pr checkout'
gh pv 123  # 等同于 gh pr view 123
📊 扩展功能
gh extension list          # 列出已安装扩展
gh extension install owner/gh-extension  # 安装扩展
gh extension upgrade --all # 更新所有扩展
GitHub CLI 的优势在于可以在终端中完成大部分 GitHub 操作，无需切换到浏览器，特别适合命令行工作流。