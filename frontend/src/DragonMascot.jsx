import { useEffect, useState } from 'react'

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
  const [settings, setSettings] = useState(readSettings)
  const name = settings.name.trim() || 'Mango'
  const hasRequestStatus = state === 'thinking' || state === 'limit'
  const pose = hasRequestStatus || settings.mood === 'auto' ? state : settings.mood

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // The controls remain usable for the current visit.
    }
  }, [settings])

  return (
    <div className="chat-mascot-control">
      <figure className="chat-mascot" data-state={pose}>
        <div className="chat-mascot-art" aria-hidden="true">
          <img src="/mango-bearded-dragon.png" alt="" width="640" height="640" />
          <span className="chat-mascot-emote">
            {pose === 'thinking' ? '···' : pose === 'working' ? '✧' : pose === 'done' ? '✦' : pose === 'limit' ? '!' : ''}
          </span>
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
