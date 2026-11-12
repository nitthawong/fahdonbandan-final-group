
import { useEffect } from 'react'
import './App.css'

const members = {
  ham: {
    name: 'Ham',
    fullName: 'ARTHITTAYA RUAISAP',
    role: 'Frontend Developer',
    photo: '/ham.jpg',
    about:
      'My name is Arthittaya Ruaisap (Ham). I am an AI Engineering and Data Science student at Bangkok University.',
    tasks:
      'Designing the team Portfolio website, developing the Home and Team pages, creating member profiles, and building the AI Chat interface.',
    skills: [
      'HTML',
      'CSS',
      'JavaScript',
      'Basic Python',
      'Website Design with VS Code'
    ],
    project: 'AI Chat & Team Portfolio Website',
    projectDetails:
      'Designed the Portfolio website, interactive member cards, individual profile pages, and AI Chat user interface.'
  },

  run: {
    name: 'Run',
    fullName: 'NITTHA WONGYALA',
    role: 'Backend Developer',
    photo: '/run.jpeg',
    about:
      'My name is Nittha Wongyala (Run). I am the Backend Developer of the ฟ้าดลบันดาล team.',
    tasks:
      'Developing Backend APIs using Node.js and Express, and working with PostgreSQL for database integration.',
    skills: ['Node.js', 'Express', 'PostgreSQL'],
    project: 'AI Chat & Team Portfolio Website',
    projectDetails:
      'Responsible for Backend API development for the team Portfolio and AI Chatbot project.'
  },

  ping: {
    name: 'Phuping',
    fullName: 'PHACHALAPHON KAMONLOET',
    role: 'AI & CI/CD Engineer',
    photo: '/ping.jpeg',
    about:
      'My name is Phachalaphon Kamonloet (Phuping). I am responsible for AI integration and CI/CD in the ฟ้าดลบันดาล team.',
    tasks:
      'Connecting the AI API, using Prompt Engineering to help the chatbot answer questions about our team, and setting up a CI/CD Pipeline for automated deployment.',
    skills: [
      'Python',
      'AI API Integration',
      'Prompt Engineering',
      'CI/CD Pipeline'
    ],
    project: 'Full-stack Portfolio & AI Chatbot',
    projectDetails:
      'Responsible for AI Chatbot integration using team Portfolio information and implementing a CI/CD Pipeline for automated deployment.'
  }
}

function Profile() {
  const params = new URLSearchParams(window.location.search)
  const requestedKey = params.get('member') || 'ham'
  const key = members[requestedKey] ? requestedKey : 'ham'
  const member = members[key]

  useEffect(() => {
    document.body.dataset.member = key

    return () => {
      delete document.body.dataset.member
    }
  }, [key])

  return (
    <main className="profile-page">
      <a href="/#team" className="back-link">
        ← Back to Team
      </a>

      <div className="profile-layout">
        <div className="profile-info">
          <p className="profile-label">MEET OUR TEAM</p>

          <h1 id="profile-fullname">{member.fullName}</h1>
          <p id="profile-name">{member.name}</p>
          <h2 id="profile-role">{member.role}</h2>

          <h3>About Me</h3>
          <p id="profile-about">{member.about}</p>

          <h3>My Responsibilities</h3>
          <p id="profile-tasks">{member.tasks}</p>

          <h3>Skills</h3>
          <div id="profile-skills">
            {member.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>

          <h3>Project</h3>
          <p id="profile-project">{member.project}</p>

          <h3>My Contribution</h3>
          <p id="profile-project-details">
            {member.projectDetails}
          </p>
        </div>

        <div className="profile-badge">
          <div className="badge-rope"></div>

          <div className="badge-card">
            <div className="badge-avatar" id="badge-avatar">
              <img
                src={member.photo}
                alt={member.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
              />
            </div>

            <h2 id="badge-name">{member.fullName}</h2>
            <p id="badge-nickname">{member.name}</p>
            <p id="badge-role">{member.role}</p>

            <div className="badge-barcode">
              |||| ||| |||| |||
            </div>
            <small>ฟ้าดลบันดาล TEAM</small>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Profile
