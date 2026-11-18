import Profile from './Profile'
import ContactGithub from './ContactGithub'
import StarCursor from './StarCursor'
import ProjectDemo from './ProjectDemo'
import PhysicsLanyard from './PhysicsLanyard'
import { lazy, Suspense, useLayoutEffect, useState } from 'react'
import './App.css'

const Chat = lazy(() => import('./Chat'))

const members = [
  {
    id: 'ham',
    name: 'ARTHITTAYA RUAISAP',
    nickname: 'Ham',
    role: 'Frontend Developer',
    work: 'Portfolio & Chat UI',
    image: '/ham.jpg',
    color: 'pink',
  },
  {
    id: 'run',
    name: 'NITTHA WONGYALA',
    nickname: 'Run',
    role: 'Backend Developer',
    work: 'Backend API',
    image: '/run.jpeg',
    color: 'blue',
  },
  {
    id: 'ping',
    name: 'PHACHALAPHON KAMONLOET',
    nickname: 'Phuping',
    role: 'AI & CI/CD Engineer',
    work: 'AI Integration & Deployment',
    image: '/ping.jpeg',
    color: 'purple',
  },
]

const SKY_MODE_KEY = 'fahdonbandan:sky-mode'

function readSkyMode() {
  try {
    return window.localStorage.getItem(SKY_MODE_KEY) === 'sunset' ? 'sunset' : 'day'
  } catch {
    return 'day'
  }
}

function App({ skyMode, onToggleSky }) {
  function moveClouds(event) {
    if (event.pointerType === 'touch') return

    const hero = event.currentTarget
    const clouds = hero.querySelectorAll('.cloud-float')

    clouds.forEach((cloud) => {
      const rect = cloud.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = centerX - event.clientX
      const dy = centerY - event.clientY
      const distance = Math.hypot(dx, dy)
      const radius = 230

      let moveX = 0
      let moveY = 0

      if (distance < radius && distance > 0) {
        const strength = (1 - distance / radius) * 22
        moveX = (dx / distance) * strength
        moveY = (dy / distance) * strength
      }

      const image = cloud.querySelector('.cloud')

      if (image) {
        image.style.setProperty('--mouse-x', `${moveX}px`)
        image.style.setProperty('--mouse-y', `${moveY}px`)
      }
    })
  }

  function resetClouds(event) {
    const clouds = event.currentTarget.querySelectorAll('.cloud')

    clouds.forEach((image) => {
      image.style.setProperty('--mouse-x', '0px')
      image.style.setProperty('--mouse-y', '0px')
    })
  }

  return (
    <>
      {/* Home */}
      <section
        className={`sky-hero ${skyMode === 'sunset' ? 'sunset' : ''}`}
        id="home"
        onPointerMove={moveClouds}
        onPointerLeave={resetClouds}
      >
        <div className="cloud-layer" aria-hidden="true">
          {[1, 2, 3].map((number) => (
            <div
              key={number}
              className={`cloud-float cloud-${number}`}
            >
              <img src="/cloud.png" className="cloud" alt="" />
            </div>
          ))}
        </div>

        <div className="butterflies" aria-hidden="true">
          {['pink', 'blue', 'yellow', 'purple'].map((color, index) => (
            <img
              key={color}
              src={`/butterfly-${color}.png`}
              className={`butterfly butterfly-${index + 1}`}
              alt=""
            />
          ))}
        </div>

       

<nav className="sky-nav">
  <a href="#home">home</a>
  <a href="#team">team</a>
  <a href="#projects">project</a>
  <a href="#contact">contact</a>
  <a href="/chat">AI chat →</a>

  <button
    type="button"
    className={`sky-toggle ${skyMode === 'sunset' ? 'is-night' : ''}`}
    onClick={onToggleSky}
    aria-label="Toggle sunset mode"
    aria-pressed={skyMode === 'sunset'}
  >
    <span className="toggle-stars">✦ ✧</span>
    <span className="toggle-clouds">☁ ☁</span>
    <span className="toggle-orb">
      {skyMode === 'day' ? '☀' : '☾'}
    </span>
  </button>
</nav>



        <div className="sky-content">
          <h1>
            ฟ้าดล
            <br />
            <span>บันดาล</span>
          </h1>
          <p>Somehow, the sky brought us together.</p>
        </div>
      </section>

      {/* Team */}
      <section className="team-section" id="team">
        <h2>Our Members</h2>

        <p className="section-description">
          Meet the people behind ฟ้าดลบันดาล.
          <br />
          Drag a badge to swing it, or tap to flip it.
        </p>

        <PhysicsLanyard members={members} />
      </section>

      {/* Projects */}
      <section className="projects-section" id="projects">
        <h2>Our Project</h2>

        <p className="section-description">
          What we are building together.
        </p>

        <div className="project-card">
          <h3>Team Portfolio & AI Chatbot</h3>

          <p>
            A portfolio website that introduces our team
            and includes an AI chatbot for visitors.
          </p>

          <div className="project-tools">
            {[
              'React',
              'CSS',
              'JavaScript',
              'Backend API',
              'AI Integration',
              'CI/CD',
              'Deployment',
            ].map((tool) => (
              <span key={tool}>{tool}</span>
            ))}
          </div>

          <ProjectDemo />

          <a href="/chat" className="project-button">
            Try AI Chat →
          </a>
        </div>
      </section>

      {/* Contact */}
      <section className="contact-section" id="contact">
        <h2>Contact Our Team</h2>

        <p>
          Have a question or want to collaborate?
          <br />
          We'd love to hear from you!
        </p>

        <p className="contact-note">
         Email us at{' '}
<a href="mailto:fahdonbandan@example.com">
  fahdonbandan@example.com
</a>
        </p>
        <ContactGithub />
      </section>

      <footer>
        <p>© 2026 ฟ้าดลบันดาล. All rights reserved.</p>
      </footer>
    </>
  )
}

function Main() {
  const [skyMode, setSkyMode] = useState(readSkyMode)

  useLayoutEffect(() => {
    document.documentElement.dataset.skyMode = skyMode
  }, [skyMode])

  function toggleSky() {
    const next = skyMode === 'day' ? 'sunset' : 'day'
    setSkyMode(next)

    try {
      window.localStorage.setItem(SKY_MODE_KEY, next)
    } catch {
      // The current page still changes when storage is unavailable.
    }
  }

  const pathname = window.location.pathname
  let page = <App skyMode={skyMode} onToggleSky={toggleSky} />

  if (pathname === '/profile') page = <Profile />
  if (pathname === '/chat') {
    page = (
      <Suspense fallback={
        <main className="chat-route-loading">
          <div className="chat-route-status" role="status">
            <span className="chat-loading-stars" aria-hidden="true">✦ ✧ ✦</span>
            <span>Opening AI Chat…</span>
          </div>
        </main>
      }>
        <Chat />
      </Suspense>
    )
  }

  return (
    <>
      {page}
      <StarCursor />
    </>
  )
}

export default Main
