// Original work © 2026 zhebuilds. AGPLv3 plus ADDITIONAL_TERMS.md.

# 键盘用户看不出焦点落在哪个控件上

> 状态：先就此询问 maintainer 意向。一版最小实现已在本地分支备好，确认后再提 PR。
> 本条是纯样式用法修正，**不引入新颜色**。

## 现象

用键盘操作时，焦点落在搜索框、输入框和下拉选择按钮上几乎没有视觉提示。

这几个控件聚焦时确实会画一圈 focus ring，但那一圈用的是品牌色的半透明版本（`--accent-soft`）。这层淡淡的水印紧贴控件边框，颜色浅到在实际界面里几乎融进背景。结果是：**Tab 键走到这些控件上时，用户看不出焦点在哪**，只能靠猜。

同一个界面里：

- 原生 `<button>` 走全局的 `:focus-visible` 轮廓线，清晰可见
- 搜索框 / 输入框 / 下拉按钮走 `box-shadow` 画的水印环，几乎看不见

两者并存，视觉重量明显不一致。这不是装饰问题——键盘用户依赖焦点环才能知道自己在哪，环看不清等于这三个控件在键盘流里「半隐身」。

顺带一提，错误态输入框用的是 `--bad-soft`，情况完全一致：校验失败的提示环也偏淡。

## 复现

用浏览器 dev server（`npm run dev`）即可，不需要 Tauri / Rust 环境（`src/dev/mock.ts` 提供假后端）：

1. `npm run dev` 打开页面
2. 反复按 <kbd>Tab</kbd>，走到顶部搜索框
3. 观察搜索框外围 —— 边框变色了，但那圈 `box-shadow` 很难察觉
4. 打开设置页，走到任意一个下拉选择按钮，同样看不清环
5. 打开需要填路径的设置面板，Tab 进输入框，同样看不清
6. 对照这一现象：Tab 到页面上任意一个真 `<button>`，它的焦点轮廓一目了然

对比第 3–5 步与第 6 步，就能看出两类控件的焦点提示不成一套。

## 原因

`src/styles.css` 里这几处的 `box-shadow` 用了 `--*-soft` 变量。`-soft` 这一族本来是给**大面积填充**用的（例如卡片的高亮底色、警告条的整块背景），大面积铺开时用这种淡化版本是合适的。

但 focus ring 是**细窄的描边**，视觉体量小得很，再叠一层淡化就几乎消失。同一批变量的两套用途，混在了一处用法里。

涉及的四处：

| 位置 | 选择器 | 当前值 |
|---|---|---|
| ~860 | `.search-box:focus-within` | `box-shadow: … var(--accent-soft)` |
| ~1455 | `.select-button:focus-visible` | `box-shadow: … var(--accent-soft)` |
| ~1542 | `.input:focus` | `box-shadow: … var(--accent-soft)` |
| ~1551 | `.input.invalid` | `box-shadow: … var(--bad-soft)` |

「#9 / #10 侧栏方向键」那条线已经合进 main（见当前 HEAD 的 `fix(sidebar): keep arrow keys on the resize handle from seeking playback`），说明 maintainer 在意键盘交互的正确性。**键盘这条路走得通、但看不见自己在哪**，和那条是同一类问题，只是表现形态不同：那条管的是「键盘能操作」，这条管的是「键盘用户能看见」。

## 建议

**不动任何颜色值。** `--accent`（浅色主题 `#e0683a` / 深色主题 `#f07f4c`）和 `--bad` 保持当前值，一个像素都不改。

改的只是用法：焦点环停止使用半透明版，改用同一色值的实心版。

```css
/* 四处统一处理 */
box-shadow: 0 0 0 3px var(--accent);   /* 原来是 var(--accent-soft) */
box-shadow: 0 0 0 3px var(--bad);      /* .input.invalid，原来是 var(--bad-soft) */
```

环的宽度、边框色、圆角一律不动，只换色值来源。**视觉上的唯一差别是这圈变得看得见了。**

两个刻意的边界，想先请 maintainer 确认：

1. **`.select.open .select-button` 保持原样。** 它和 `.select-button:focus-visible` 目前共用一条规则。建议**拆开**，只改 `:focus-visible` 那条 —— 下拉展开态属于既有外观，不该被这次改动顺带调整。
2. **`.device-dot.online` 和其他 `-soft` 填充保持原样。** 前者是装饰性光晕不是焦点环；后者是填充色不是描边，动它们等于改已完成功能的视觉。

一句话总结：这不是改主题配色，是修一处把「填充变量」用在「描边」上的用法错误。

## 验证

已实跑：

- `npx tsc --noEmit` —— 0 错误
- `npm test` —— 28/28 通过（本次为纯 CSS 改动，不影响任何测试）
- `npm run build` —— 完整生产构建通过
- `npm run dev` —— dev server 正常启动，无编译报错
- 用 grep 逐条核对四处 `box-shadow` 落点，以及 `.select.open` 与 `.device-dot.online` 未被误改

**未实跑（如实声明）：** 仓库禁止安装 playwright / puppeteer，因此**没有做真实浏览器的 Tab 键遍历与截图**，也没有做人工目视确认。上面「看得清楚与否」的判断来源是：读 CSS 确认 ring 实际取值为半透明变量，再与相邻的原生按钮 `:focus-visible` 实线轮廓做形式对比。**这一条最终需要 maintainer 亲自 Tab 一圈确认观感。** 如果 maintainer 觉得实心环太重，也可以在中途再讨论把环加粗一点或改用 `outline` 实现，那样同样是另一种解法。
