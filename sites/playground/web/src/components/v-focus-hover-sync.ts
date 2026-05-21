export const vFocusHoverSync = {
  mounted(el) {
    el.addEventListener('focus', () => {
      el.dispatchEvent(new MouseEvent('mouseenter', {
        bubbles: false,
        cancelable: true,
      }))
    })

    el.addEventListener('blur', () => {
      el.dispatchEvent(new MouseEvent('mouseleave', {
        bubbles: false,
        cancelable: true,
      }))
    })
  }
}
