# tiny-agent 基础 UI 库

## breathe

为目标元素添加呼吸效果

### 添加以及移除呼吸效果

```js
const breatheBtn = document.getElementById('breathe-btn');
addBreathe(breatheBtn);

// 移除呼吸效果
removeBreathe(breatheBtn);
```

## floatElement

添加浮动元素，如 tooltip、 modal、popover 等元素

### 添加 tooltip

```js
// 示例1: 简单文本 tooltip
const tooltipBtn = document.getElementById('tooltip-btn');
if (tooltipBtn) {
  const tooltip = addTooltip(tooltipBtn, '这是一个简单的文本提示');

  // 可以稍后通过 tooltip.destroy() 移除
}
```

### 添加 popup

```js
// 示例 2: 点击触发的 popup
const clickPopupBtn = document.getElementById('click-popup-btn');
if (clickPopupBtn) {
  const customContent = document.createElement('div');
  customContent.innerHTML =
    '<strong>点击触发的弹出内容</strong><p>点击外部区域关闭</p>';
  customContent.style.padding = '5px';

  const popup = addPopup(clickPopupBtn, customContent, {
    placement: 'bottom',
    showArrow: true,
    arrowColor: '#007bff',
    className: 'custom-popup',
    triggerMode: 'click', // 默认值，可省略
  });

  // 可以通过 popup.isOpen() 检查状态
  // 可以通过 popup.destroy() 移除
}
```

### 手动控制的 popup

```js
// 示例 3: 手动控制的 popup
const manualBtn = document.getElementById('manual-btn');
const openPopupBtn = document.getElementById('open-popup-btn');

if (manualBtn && openPopupBtn) {
  const content = document.createElement('div');
  content.innerHTML =
    '<h4>手动控制的弹出框</h4><p>这个弹出框需要通过代码控制</p><button class="close-popup-btn">关闭</button>';

  // 创建手动控制的弹出框
  const popup = addPopup(manualBtn, content, {
    placement: 'right',
    closeOnClickOutside: false,
    closeOnEsc: true,
    triggerMode: 'manual', // 关键配置！使用手动触发模式
  });

  // 通过其他元素控制显示
  openPopupBtn.addEventListener('click', () => {
    popup.show();
  });

  // 找到关闭按钮并添加事件
  setTimeout(() => {
    const closeBtn = content.querySelector('.close-popup-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.hide();
      });
    }
  }, 100);
}
```
