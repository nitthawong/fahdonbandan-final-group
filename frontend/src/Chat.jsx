
import { useState, useEffect, useRef } from 'react'
import './App.css'

const STORAGE_KEY = 'ourteam-chats'
const ACTIVE_KEY = 'ourteam-active-chat'

const greeting =
  "Hello! I'm the ฟ้าดลบันดาล AI Assistant. How can I help you today?"

function makeChat() {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    messages: [{ sender: 'bot', text: greeting }]
  }
}

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const chats = Array.isArray(saved) ? saved : []
    const activeId = localStorage.getItem(ACTIVE_KEY)

    if (chats.length === 0) {
      const chat = makeChat()
      return { chats: [chat], activeId: chat.id }
    }

    return {
      chats,
      activeId: chats.some(chat => chat.id === activeId)
        ? activeId
        : chats[0].id
    }
  } catch {
    const chat = makeChat()
    return { chats: [chat], activeId: chat.id }
  }
}

function getBotReply(question) {
  const q = question.toLowerCase()

  if (q.includes('ham') || q.includes('แฮม')) {
    return 'Ham is our Frontend Developer. She works on the Portfolio and Chat UI.'
  }

  if (q.includes('run') || q.includes('รัน')) {
    return 'Run is our Backend Developer, responsible for backend APIs.'
  }

  if (q.includes('ping') || q.includes('พิง')) {
    return 'Phuping works on AI Integration, CI/CD, and Deployment.'
  }

  if (
    q.includes('project') ||
    q.includes('โปรเจกต์') ||
    q.includes('ผลงาน')
  ) {
    return 'Our project is Team Portfolio & AI Chatbot, combining frontend, backend APIs, and AI integration.'
  }

  if (
    q.includes('team') ||
    q.includes('ทีม') ||
    q.includes('สมาชิก')
  ) {
    return 'Our team ฟ้าดลบันดาล has 3 members: Ham, Run, and Phuping.'
  }

  return "I'm a demo chatbot. You can ask me about our team, members, or projects!"
}

function Chat() {
  const [chatState, setChatState] = useState(loadChats)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const { chats, activeId } = chatState
  const activeChat = chats.find(chat => chat.id === activeId)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    localStorage.setItem(ACTIVE_KEY, activeId || '')
  }, [chats, activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [activeChat?.messages])

  function createNewChat() {
    const chat = makeChat()

    setChatState(previous => ({
      chats: [chat, ...previous.chats],
      activeId: chat.id
    }))

    setInput('')
  }

  function selectChat(id) {
    setChatState(previous => ({ ...previous, activeId: id }))
  }

  function renameChat(id) {
    const chat = chats.find(item => item.id === id)
    if (!chat) return

    const result = window.prompt('Rename chat:', chat.title)
    if (result === null) return

    const title = result.trim().slice(0, 60)
    if (!title) return

    setChatState(previous => ({
      ...previous,
      chats: previous.chats.map(item =>
        item.id === id ? { ...item, title } : item
      )
    }))
  }

  function deleteChat(id) {
    const chat = chats.find(item => item.id === id)
    if (!chat) return

    if (!window.confirm(`Delete "${chat.title}"?`)) return

    setChatState(previous => {
      const remaining = previous.chats.filter(item => item.id !== id)

      if (remaining.length === 0) {
        const fresh = makeChat()
        return { chats: [fresh], activeId: fresh.id }
      }

      return {
        chats: remaining,
        activeId:
          previous.activeId === id
            ? remaining[0].id
            : previous.activeId
      }
    })
  }

  function clearAllChats() {
    if (!window.confirm('Delete ALL chat history? This cannot be undone.')) {
      return
    }

    const fresh = makeChat()
    setChatState({ chats: [fresh], activeId: fresh.id })
    setInput('')
  }

  function sendMessage(text = input) {
    const question = String(text).trim()
    if (!question) return

    const targetId = activeId

    setChatState(previous => ({
      ...previous,
      chats: previous.chats.map(chat => {
        if (chat.id !== targetId) return chat

        return {
          ...chat,
          title:
            chat.title === 'New Chat'
              ? question.slice(0, 30)
              : chat.title,
          messages: [
            ...chat.messages,
            { sender: 'user', text: question },
            { sender: 'bot', text: getBotReply(question) }
          ]
        }
      })
    }))

    setInput('')
  }

  return (
    <>
      <header className="navbar">
        <div className="logo">ฟ้าดลบันดาล</div>
        <nav>
          <a href="/">Home</a>
          <a href="/#team">Team</a>
          <a href="/#projects">Projects</a>
          <a href="/chat" className="chat-button">AI Chat →</a>
        </nav>
      </header>

      <main className="chat-page">
        <div className="chat-intro">
          <div className="bot-icon">✦</div>

          <h1>
            <span className="sparkle">✦</span>
            {' '}Ask Our AI Assistant{' '}
            <span className="sparkle">✦</span>
          </h1>

          <p>
            Have a question about our team or projects?
            Ask anything!
          </p>
        </div>

        <div className="chat-layout">
          <aside className="chat-sidebar">
            <h3>Chat History</h3>

            <button
              id="new-chat-btn"
              type="button"
              onClick={createNewChat}
            >
              + New Chat
            </button>

            <div id="chat-history">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={
                    `history-item ${chat.id === activeId ? 'active' : ''}`
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span
                    onClick={() => selectChat(chat.id)}
                    title={chat.title}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {chat.title}
                  </span>

                  <button
                    type="button"
                    aria-label="Rename chat"
                    title="Rename chat"
                    onClick={() => renameChat(chat.id)}
                    style={historyButtonStyle}
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    aria-label="Delete chat"
                    title="Delete chat"
                    onClick={() => deleteChat(chat.id)}
                    style={historyButtonStyle}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              id="clear-all-btn"
              type="button"
              onClick={clearAllChats}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '9px',
                borderRadius: '12px',
                cursor: 'pointer',
                background: '#fffaf5',
                color: '#2b2a4a',
                border: '1px solid #2b2a4a'
              }}
            >
              🗑 Clear All History
            </button>
          </aside>

          <div className="chat-main">
            <div id="chat-messages">
              {activeChat?.messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.sender === 'user'
                      ? 'user-message'
                      : 'bot-message'
                  }
                >
                  {message.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                id="user-input"
                placeholder="Type your message..."
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') sendMessage()
                }}
              />

              <button
                id="send-button"
                type="button"
                onClick={() => sendMessage()}
              >
                Send →
              </button>
            </div>
          </div>
        </div>

        <div className="suggestions">
          {[
            'About our team',
            'Our projects',
            'Team members'
          ].map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </main>

      <footer>
        <p>© 2026 ฟ้าดลบันดาล. All rights reserved.</p>
      </footer>
    </>
  )
}

const historyButtonStyle = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '17px',
  color: '#2b2a4a',
  padding: '2px 5px',
  boxShadow: 'none',
  flexShrink: 0
}

export default Chat
