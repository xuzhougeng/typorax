# Typorax

一个面向 Typora 风格工作流的本地 Markdown 编辑器骨架，目标平台是 macOS 和 Windows，技术路线优先考虑轻量化和后续可扩展性。

## 当前选型

- `Tauri 2`
  作为桌面壳，满足“一次编译，多端分发”，比 Electron 更轻。
- `Vite + TypeScript`
  保持前端层简单直接，不引入额外重量级 UI 框架。
- `CodeMirror 6`
  负责 Markdown 编辑体验，后续可继续加快捷键、补全、粘贴规则、块级交互。
- `unified + remark + rehype`
  负责 Markdown 解析与渲染链，适合做自定义语法和自定义渲染规则。

## 已搭好的能力

- 本地文件打开 / 保存 / 另存为
- Markdown 实时预览
- GFM 支持
- 自定义语法扩展示例
  现在内置了 `:::note` / `:::warning` 这类 callout 指令
- 自定义 CSS 注入
  右侧 `Render Lab` 可以直接编辑预览样式
- 可扩展的编辑器 / 渲染器分层

## 项目结构

- `src/app.ts`
  应用壳、状态、文件操作、布局切换
- `src/editor/markdown-editor.ts`
  CodeMirror 编辑器封装
- `src/markdown/engine.ts`
  Markdown 渲染引擎和插件注册点
- `src/services/settings.ts`
  本地设置持久化
- `src-tauri/src/lib.rs`
  原生文件对话框和磁盘读写命令

## 为什么这个架构适合继续做成 Typora 类产品

- 编辑器和渲染链已经分层，后面可以逐步补足 Typora 级功能，而不是推倒重来。
- 自定义语法不依赖硬编码分支，可以继续往 `remark` 插件方向扩。
- 自定义渲染规则不只限于 CSS，后续也可以扩成 HTML 变换、节点级渲染器甚至插件系统。
- 桌面能力在 Rust 侧，不会被 Electron 的体积和资源占用拖住。

## 下一阶段建议

1. 把双栏编辑升级成单栏混合渲染，逐步靠近 Typora 的所见即所得体验。
2. 加图片拖拽、粘贴上传、本地资源管理。
3. 加数学公式、Mermaid、表格增强和导出能力。
4. 把语法扩展和渲染扩展注册表做成插件系统。
5. 增加命令面板、最近文件、偏好设置和主题包。

## 运行

```bash
npm install
npm run tauri:dev
```

如果在 Linux 上本地调试 Tauri，需要先安装 `webkit2gtk` / `javascriptcoregtk` / `libsoup-3.0` 等系统依赖；macOS 和 Windows 则按各自 Tauri 工具链准备即可。

## GitHub 发版

- workflow 文件在 `.github/workflows/release.yml`
- 当你 push 一个以 `v` 开头的 tag 时会触发构建，例如：
  - `v0.1.0`
  - `v1.0.0`
  - `v1`
- workflow 会校验 tag 和 `package.json` 里的版本关系：
  - 允许完整版本 tag，例如 `package.json` 是 `0.1.0` 时使用 `v0.1.0`
  - 从主版本 `1` 开始，也允许主版本别名 tag，例如 `1.2.3` 对应 `v1`
- macOS 只构建 Apple Silicon (`aarch64-apple-darwin`)，产出 `app` / `dmg`
- Windows 会产出 `nsis` / `msi` 安装包
