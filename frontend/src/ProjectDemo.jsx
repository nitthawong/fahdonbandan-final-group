import { Fragment, useEffect, useState } from 'react'

const examples = {
  chat: {
    nodes: [
      { name: 'Frontend', detail: 'Ham’s interface collects the message and displays the reply.' },
      { name: 'Backend API', detail: 'Run’s API receives the message, sends it to the AI integration, and returns the reply.' },
      { name: 'AI Integration', detail: 'Phuping’s integration uses the question and team information to generate a reply.' },
    ],
    route: [0, 1, 2, 1, 0],
  },
  release: {
    nodes: [
      { name: 'Push code', detail: 'The team pushes an update to the project repository.' },
      { name: 'Build & check', detail: 'CI checks the update and builds the frontend files.' },
      { name: 'Deploy', detail: 'CD publishes the new version so visitors can open it.' },
    ],
    route: [0, 1, 2],
  },
}

export default function ProjectDemo() {
  const [mode, setMode] = useState('chat')
  const [inspected, setInspected] = useState(0)
  const [step, setStep] = useState(null)
  const { nodes, route } = examples[mode]
  const lastStep = (route.length - 1) * 2
  const running = step !== null && step < lastStep
  const complete = step === lastStep
  const routeIndex = step === null ? 0 : Math.floor(step / 2)
  const selected = step === null ? inspected : route[routeIndex]
  const nextNode = route[routeIndex + 1]
  const traveling = running && step % 2 === 1
  const activeWire = traveling ? Math.min(selected, nextNode) : -1
  const returning = traveling && nextNode < selected

  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => setStep(step + 1), 650)
    return () => window.clearTimeout(timer)
  }, [running, step, mode])

  function changeMode(nextMode) {
    setMode(nextMode)
    setInspected(0)
    setStep(null)
  }

  function inspect(index) {
    setInspected(index)
    setStep(null)
  }

  let detail = nodes[selected].detail
  if (mode === 'chat' && step >= 6) {
    detail = complete
      ? 'The reply appears in the chat window.'
      : 'The API returns the generated reply to the frontend.'
  }

  return (
    <details
      className="project-demo"
      onToggle={event => {
        if (!event.currentTarget.open) inspect(0)
      }}
    >
      <summary>See how it works</summary>
      <div className="project-demo-controls">
        <div className="project-demo-modes" role="group" aria-label="Demo flow">
          <button type="button" aria-pressed={mode === 'chat'} onClick={() => changeMode('chat')}>
            Chat flow
          </button>
          <button type="button" aria-pressed={mode === 'release'} onClick={() => changeMode('release')}>
            CI/CD
          </button>
        </div>
        <button type="button" className="demo-play" onClick={() => setStep(0)} disabled={running}>
          {running ? 'Running…' : complete ? 'Run again' : 'Run demo'}
        </button>
      </div>

      <div className="project-demo-flow" role="group" aria-label="Flow steps">
        {nodes.map((node, index) => (
          <Fragment key={node.name}>
            {index > 0 && (
              <span
                className="project-demo-wire"
                data-travel={activeWire === index - 1 ? (returning ? 'back' : 'forward') : undefined}
                aria-hidden="true"
              />
            )}
            <button type="button" aria-pressed={selected === index} onClick={() => inspect(index)}>
              {node.name}
            </button>
          </Fragment>
        ))}
      </div>

      <div className="project-demo-detail" aria-live="polite">
        <p>{detail}</p>
        {mode === 'chat' && (
          <div className="project-demo-chat">
            <p>What is the ฟ้าดลบันดาล project?</p>
            {complete && <p>We built a team portfolio and an AI chatbot that answers questions about our project.</p>}
          </div>
        )}
      </div>
    </details>
  )
}
