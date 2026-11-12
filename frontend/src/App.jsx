import Chat from './Chat'
import Profile from './Profile'
import { useState, useRef } from 'react'
import './App.css'

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

function MemberCard({ member }) {
  const [flipped, setFlipped] = useState(false)

  function tiltCard(event) {
    if (event.pointerType === 'touch') return

    const card = event.currentTarget
    const rect = card.getBoundingClientRect()

    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    const rotateY = (x - 0.5) * 36
    const rotateX = (0.5 - y) * 36

    card.style.setProperty('--tilt-x', `${rotateX}deg`)
    card.style.setProperty('--tilt-y', `${rotateY}deg`)
  }

  function resetTilt(event) {
    const card = event.currentTarget
    card.style.setProperty('--tilt-x', '0deg')
    card.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <div className={`lanyard-item ${member.color}`}>
      <div className="lanyard-strap"></div>
      <div className="lanyard-ring"></div>

      <div
        className={`lanyard-card ${flipped ? 'is-flipped' : ''}`}
        onPointerMove={tiltCard}
        onPointerLeave={resetTilt}
        tabIndex={0}
        role="button"
        aria-label={`Flip ${member.nickname}'s card`}
        aria-pressed={flipped}
        onClick={(event) => {
          if (!event.target.closest('a')) {
            setFlipped(previous => !previous)
          }
        }}
        onKeyDown={(event) => {
          if (
            event.target.closest('a') ||
            !['Enter', ' '].includes(event.key)
          ) return

          event.preventDefault()
          setFlipped(previous => !previous)
        }}
      >
        <div className="lanyard-inner">
          <div className="lanyard-front">
            <div className="lanyard-color"></div>

            <div className="lanyard-avatar">
              <img src={member.image} alt={member.nickname} />
            </div>

            <h3>{member.name}</h3>
            <p>{member.nickname}</p>
            <small>{member.role}</small>
          </div>

          <div className="lanyard-back">
            <h3>{member.name}</h3>
            <p>{member.nickname}</p>

            <p><strong>Role</strong></p>
            <p>{member.role}</p>

            <p><strong>Work</strong></p>
            <p>{member.work}</p>

            <a
              href={`/profile?member=${member.id}`}
              className="profile-link"
            >
              View Profile →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}


function App() {
  const [skyMode, setSkyMode] = useState('day')
  const sparkleId = useRef(0)
  const [sparkles, setSparkles] = useState([])
  const lastSparkleTime = useRef(0)

function createSparkle(event) {
  if (event.pointerType === 'touch') return

  const now = Date.now()
  if (now - lastSparkleTime.current < 80) return
  lastSparkleTime.current = now

  const rect = event.currentTarget.getBoundingClientRect()

  const sparkle = {
    id: sparkleId.current++,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }

  setSparkles(previous => [...previous.slice(-12), sparkle])
}
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
  onPointerMove={event => {
    moveClouds(event)
    createSparkle(event)
  }}
  onPointerLeave={resetClouds}
>
  <div className="sparkle-layer" aria-hidden="true">
  {sparkles.map(sparkle => (
    <span
      key={sparkle.id}
      className="mouse-sparkle"
      style={{
        left: sparkle.x,
        top: sparkle.y
      }}
      onAnimationEnd={() => {
        setSparkles(previous =>
          previous.filter(item => item.id !== sparkle.id)
        )
      }}
    >
      ✦
    </span>
  ))}
</div>
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
  onClick={() =>
    setSkyMode(previous =>
      previous === 'day' ? 'sunset' : 'day'
    )
  }
  aria-label="Toggle day and night"
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
          Click a badge to flip it!
        </p>

        <div className="lanyard-wall">
          <div className="lanyard-rail"></div>

          <div className="lanyard-container">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
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
          Team email coming soon.
        </p>
      </section>

      <footer>
        <p>© 2026 ฟ้าดลบันดาล. All rights reserved.</p>
      </footer>
    </>
  )
}

function Main() {
  if (window.location.pathname === '/profile') {
    return <Profile />
  }

  if (window.location.pathname === '/chat') {
    return <Chat />
  }

  return <App />
}

export default Main
