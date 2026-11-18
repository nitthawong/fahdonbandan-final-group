import { useEffect, useRef, useState } from 'react'
import { dragoImages, getDragoColorImages } from './dragoColors'

const SETTINGS_KEY = 'fahdonbandan:frog-settings'
const MAX_NAME_LENGTH = 24
const DEFAULT_NAME = 'Drago'
const colors = { orange: 'Orange', yellow: 'Yellow', white: 'White' }
const DRAG_MARGIN = 8
const ARROW_OFFSETS = {
  ArrowLeft: [-16, 0],
  ArrowRight: [16, 0],
  ArrowUp: [0, -16],
  ArrowDown: [0, 16],
}
const moods = {
  auto: 'Automatic',
  idle: 'Relaxed',
  thinking: 'Curious',
  working: 'Focused',
  done: 'Happy',
  limit: 'Surprised',
}

function readSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY))
    return {
      name: typeof saved?.name === 'string' ? saved.name.slice(0, MAX_NAME_LENGTH) : '',
      mood: Object.hasOwn(moods, saved?.mood) ? saved.mood : 'auto',
      color: Object.hasOwn(colors, saved?.color) ? saved.color : 'orange',
    }
  } catch {
    return { name: '', mood: 'auto', color: 'orange' }
  }
}

const labels = {
  idle: 'Ready to chat',
  thinking: 'Waiting for a reply…',
  done: 'Reply ready',
  limit: 'Reply unavailable',
}

function fitOnScreen(x, y, board) {
  const viewport = document.documentElement
  return {
    x: Math.max(DRAG_MARGIN, Math.min(x, viewport.clientWidth - board.width - DRAG_MARGIN)),
    y: Math.max(DRAG_MARGIN, Math.min(y, viewport.clientHeight - board.height - DRAG_MARGIN)),
  }
}

export default function DragonMascot({ state }) {
  const [settings, setSettings] = useState(readSettings)
  const [position, setPosition] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [coloredImages, setColoredImages] = useState(null)
  const [greeting, setGreeting] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const peekTimer = useRef(null)
  const greetingTimer = useRef(null)
  const suppressGreeting = useRef(false)
  const figure = useRef(null)
  const handle = useRef(null)
  const press = useRef(null)
  const name = settings.name.trim() || DEFAULT_NAME
  const hasRequestStatus = state === 'thinking' || state === 'limit'
  const automaticIdle = state === 'idle' && settings.mood === 'auto'
  const images = coloredImages?.color === settings.color ? coloredImages : dragoImages
  let pose = settings.mood === 'auto' ? state : settings.mood

  if (automaticIdle && peeking) pose = 'thinking'
  if (greeting) pose = 'done'
  if (hasRequestStatus) pose = state

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // The controls remain usable for the current visit.
    }
  }, [settings])

  useEffect(() => {
    let active = true
    getDragoColorImages(settings.color)
      .then(images => { if (active) setColoredImages(images) })
      .catch(() => {})
    return () => { active = false }
  }, [settings.color])

  useEffect(() => () => {
    window.clearTimeout(greetingTimer.current)
    window.clearTimeout(peekTimer.current)
  }, [])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!automaticIdle || motion.matches) return

    const peek = window.setInterval(() => {
      const bounds = figure.current?.getBoundingClientRect()
      if (motion.matches || document.hidden || press.current || !bounds ||
          bounds.bottom < 0 || bounds.top > window.innerHeight) return
      setPeeking(true)
      peekTimer.current = window.setTimeout(() => setPeeking(false), 1500)
    }, 12500)

    return () => window.clearInterval(peek)
  }, [automaticIdle])

  useEffect(() => {
    const element = figure.current

    function keepOnScreen() {
      const bounds = element.getBoundingClientRect()
      setPosition(previous => {
        if (!previous) return previous
        const next = fitOnScreen(previous.x, previous.y, bounds)
        return next.x === previous.x && next.y === previous.y ? previous : { ...previous, ...next }
      })
    }

    window.addEventListener('resize', keepOnScreen)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(keepOnScreen)
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', keepOnScreen)
    }
  }, [])

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return
    suppressGreeting.current = false
    const bounds = figure.current.getBoundingClientRect()
    press.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      bounds,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event) {
    const active = press.current
    if (active?.id !== event.pointerId) return

    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    if (!active.moved && Math.hypot(dx, dy) < 5) return

    active.moved = true
    suppressGreeting.current = true
    setDragging(true)
    const { bounds } = active
    setPosition(previous => ({
      ...fitOnScreen(bounds.left + dx, bounds.top + dy, bounds),
      dockHeight: previous?.dockHeight ?? bounds.height,
    }))
  }

  function stopDrag(event) {
    if (press.current?.id !== event.pointerId) return
    press.current = null
    setDragging(false)
  }

  function greet(event) {
    if (hasRequestStatus || (event.detail > 0 && suppressGreeting.current)) return
    window.clearTimeout(greetingTimer.current)
    setGreeting(true)
    greetingTimer.current = window.setTimeout(() => setGreeting(false), 1200)
  }

  function returnToDock() {
    setPosition(null)
    handle.current?.focus({ preventScroll: true })
  }

  function moveWithKeys(event) {
    if (position && (event.key === 'Home' || event.key === 'Escape')) {
      event.preventDefault()
      returnToDock()
      return
    }
    if (!Object.hasOwn(ARROW_OFFSETS, event.key)) return
    event.preventDefault()

    const [dx, dy] = ARROW_OFFSETS[event.key]
    const bounds = figure.current.getBoundingClientRect()
    setPosition(previous => ({
      ...fitOnScreen((previous?.x ?? bounds.left) + dx, (previous?.y ?? bounds.top) + dy, bounds),
      dockHeight: previous?.dockHeight ?? bounds.height,
    }))
  }

  return (
    <div className="chat-mascot-control">
      <div className="chat-mascot-dock" style={position ? { minHeight: position.dockHeight } : undefined}>
        {position && (
          <button type="button" className="chat-mascot-return" onClick={returnToDock}>
            Bring {name} back
          </button>
        )}
        <figure
          ref={figure}
          className="chat-mascot"
          data-state={pose}
          data-color={settings.color}
          data-floating={Boolean(position)}
          data-dragging={dragging}
          data-greeting={greeting && !hasRequestStatus}
          style={position ? { left: position.x, top: position.y } : undefined}
        >
          <button
            ref={handle}
            type="button"
            className="chat-mascot-art"
            aria-label={`Move or greet ${name}. Click to greet, drag or use arrow keys to move. Press Home to return.`}
            title="Tap to greet · Drag to move"
            onClick={greet}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onLostPointerCapture={stopDrag}
            onKeyDown={moveWithKeys}
          >
            <span className="chat-mascot-pose" aria-hidden="true">
              <img className="chat-mascot-idle" src={images.idle} alt="" width="640" height="640" />
              <img className="chat-mascot-atlas" src={images.expressions} alt="" width="1024" height="1024" />
            </span>
            <span className="chat-mascot-emote" aria-hidden="true">
              {greeting && !hasRequestStatus ? '♥' : pose === 'thinking' ? '···' : pose === 'working' ? '✧' : pose === 'done' ? '✦' : pose === 'limit' ? '!' : ''}
            </span>
          </button>
          <figcaption className="chat-mascot-tag">
            <span className="chat-mascot-name">{name}</span>
            <span className="chat-mascot-status">{labels[state]}</span>
          </figcaption>
        </figure>
      </div>

      <details className="chat-mascot-settings">
        <summary>Customize mascot</summary>
        <div className="chat-mascot-fields">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={settings.name}
              maxLength={MAX_NAME_LENGTH}
              placeholder={DEFAULT_NAME}
              onChange={event => {
                const nextName = event.target.value
                setSettings(previous => ({ ...previous, name: nextName }))
              }}
            />
          </label>
          <label>
            <span>Mood</span>
            <select
              value={settings.mood}
              onChange={event => {
                const mood = event.target.value
                setSettings(previous => ({ ...previous, mood }))
              }}
            >
              {Object.entries(moods).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Color</span>
            <select
              value={settings.color}
              onChange={event => {
                const color = event.target.value
                setSettings(previous => ({ ...previous, color }))
              }}
            >
              {Object.entries(colors).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </div>
  )
}
