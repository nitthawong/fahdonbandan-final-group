import { useEffect, useRef } from 'react'

const EDITABLE = 'input, textarea, select, [contenteditable], [role="textbox"]'
const ACTION = 'button:not(:disabled), a[href], summary, [role="button"]:not([aria-disabled="true"])'
const MAX_STARS = 36
const TAP_DISTANCE = 8

export default function StarCursor() {
  const overlay = useRef(null)

  useEffect(() => {
    const layer = overlay.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let previousStar
    let press

    function createStar(x, y, dx, dy, burst) {
      while (layer.childElementCount >= MAX_STARS) layer.firstElementChild.remove()

      const star = document.createElement('span')
      star.className = burst ? 'cursor-star cursor-star--burst' : 'cursor-star'
      star.textContent = '✦'
      star.style.left = `${x}px`
      star.style.top = `${y}px`
      star.style.setProperty('--star-x', `${dx}px`)
      star.style.setProperty('--star-y', `${dy}px`)
      star.addEventListener('animationend', () => star.remove(), { once: true })
      layer.append(star)
    }

    function move(event) {
      if (press?.id === event.pointerId &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP_DISTANCE) {
        press = undefined
      }

      if (reducedMotion.matches || event.pointerType !== 'mouse' ||
          event.buttons !== 0 || event.target.closest?.(EDITABLE)) return

      const { clientX: x, clientY: y, timeStamp: time } = event
      if (previousStar && (time - previousStar.time < 42 ||
          Math.hypot(x - previousStar.x, y - previousStar.y) < 12)) return

      createStar(x, y, -7, 17, false)
      previousStar = { x, y, time }
    }

    function startPress(event) {
      if (!event.isPrimary || event.button !== 0) return
      press = undefined
      if (reducedMotion.matches || event.target.closest?.(EDITABLE)) return

      const action = event.target.closest?.(ACTION)
      if (event.pointerType !== 'touch' && !action) return
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, action }
    }

    function endPress(event) {
      if (press?.id !== event.pointerId) return
      const { x, y, action } = press
      press = undefined
      if (reducedMotion.matches || event.target.closest?.(EDITABLE) ||
          Math.hypot(event.clientX - x, event.clientY - y) > TAP_DISTANCE ||
          (action && action !== event.target.closest?.(ACTION))) return

      for (let index = 0; index < 6; index++) {
        const angle = (index / 6) * Math.PI * 2
        const radius = index % 2 === 0 ? 27 : 17
        createStar(event.clientX, event.clientY, Math.cos(angle) * radius, Math.sin(angle) * radius, true)
      }
    }

    function cancelPress(event) {
      if (press?.id === event.pointerId) press = undefined
    }

    function reset() {
      layer.replaceChildren()
      press = undefined
      previousStar = undefined
    }

    const options = { passive: true, capture: true }
    window.addEventListener('pointermove', move, options)
    window.addEventListener('pointerdown', startPress, options)
    window.addEventListener('pointerup', endPress, options)
    window.addEventListener('pointercancel', cancelPress, options)
    window.addEventListener('blur', reset)
    reducedMotion.addEventListener('change', reset)

    return () => {
      window.removeEventListener('pointermove', move, options)
      window.removeEventListener('pointerdown', startPress, options)
      window.removeEventListener('pointerup', endPress, options)
      window.removeEventListener('pointercancel', cancelPress, options)
      window.removeEventListener('blur', reset)
      reducedMotion.removeEventListener('change', reset)
      reset()
    }
  }, [])

  return <div ref={overlay} className="cursor-stars" aria-hidden="true" />
}
