import { useEffect, useRef, useState } from 'react'

const SETTINGS_KEY = 'fahdonbandan:frog-settings'
const MAX_NAME_LENGTH = 24
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
    }
  } catch {
    return { name: '', mood: 'auto' }
  }
}

const labels = {
  idle: 'Ready to chat',
  thinking: 'Waiting for a reply…',
  done: 'Reply ready',
  limit: 'Reply unavailable',
}

export default function DragonMascot({ state }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const [settings, setSettings] = useState(readSettings)
  const [ready, setReady] = useState(false)
  const name = settings.name.trim() || 'Mango'
  const hasRequestStatus = state === 'thinking' || state === 'limit'
  const pose = hasRequestStatus || settings.mood === 'auto' ? state : settings.mood
  const stateRef = useRef(pose)

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // The controls remain usable for the current visit.
    }
  }, [settings])

  useEffect(() => {
    stateRef.current = pose
    sceneRef.current?.update({ state: pose })
  }, [pose])

  useEffect(() => {
    const canvas = canvasRef.current
    let disposed = false
    let resizeObserver

    function stopScene() {
      resizeObserver?.disconnect()
      sceneRef.current?.destroy()
      sceneRef.current = null
    }

    function useFallback() {
      if (disposed) return
      stopScene()
      setReady(false)
    }

    canvas.addEventListener('webglcontextlost', useFallback)

    import('./dragonMascotScene')
      .then(({ mountDragon }) => {
        if (disposed) return

        const scene = mountDragon(canvas, {
          state: stateRef.current,
          animate: true,
          followPointer: true,
        })
        if (!scene) return

        sceneRef.current = scene
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => scene.resize())
          resizeObserver.observe(canvas)
        }
        setReady(true)
      })
      .catch(useFallback)

    return () => {
      disposed = true
      canvas.removeEventListener('webglcontextlost', useFallback)
      stopScene()
    }
  }, [])

  return (
    <div className="chat-mascot-control">
      <figure className="chat-mascot" data-ready={ready} data-state={pose}>
        <div className="chat-mascot-art" aria-hidden="true">
          <span className="chat-mascot-fallback"><i /></span>
          <canvas ref={canvasRef} />
        </div>
        <figcaption className="chat-mascot-tag">
          <span className="chat-mascot-name">{name}</span>
          <span className="chat-mascot-status">{labels[state]}</span>
        </figcaption>
      </figure>

      <details className="chat-mascot-settings">
        <summary>Customize mascot</summary>
        <div className="chat-mascot-fields">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={settings.name}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Mango"
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
        </div>
      </details>
    </div>
  )
}
