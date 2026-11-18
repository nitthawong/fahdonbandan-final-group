import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DragonMascot from './DragonMascot'
import './App.css'

const STORAGE_KEY = 'ourteam-chats'
const ACTIVE_KEY = 'ourteam-active-chat'
const API_URL =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`

function makeChatId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const greeting =
  "Hello! I'm the ฟ้าดลบันดาล AI Assistant. How can I help you today?"

function makeChat() {
  return {
    id: makeChatId(),
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

function AssistantReply({ text, canCopy }) {
  const [copyStatus, setCopyStatus] = useState('')

  async function copyReply() {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Could not copy')
    }
  }

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      {canCopy && (
        <div className="chat-reply-actions">
          <button type="button" onClick={copyReply}>Copy reply</button>
          <span role="status">{copyStatus}</span>
        </div>
      )}
    </>
  )
}

function Chat() {
  const [chatState, setChatState] = useState(loadChats)
  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingChatId, setLoadingChatId] = useState(null)
  const [error, setError] = useState(null)
  const messagesRef = useRef(null)
  const historyToggleRef = useRef(null)
  const pendingRef = useRef(false)

  const { chats, activeId } = chatState
  const activeChat = chats.find(chat => chat.id === activeId)
  let mascotState = 'idle'
  if (loadingChatId === activeId) {
    mascotState = 'thinking'
  } else if (error?.chatId === activeId) {
    mascotState = 'limit'
  } else if (activeChat?.messages.length > 1 && activeChat.messages.at(-1).sender === 'bot') {
    mascotState = 'done'
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    localStorage.setItem(ACTIVE_KEY, activeId || '')
  }, [chats, activeId])

  useEffect(() => {
    const container = messagesRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [activeChat?.messages, loadingChatId])

  function closeHistory() {
    if (!historyOpen) return
    setHistoryOpen(false)
    historyToggleRef.current?.focus({ preventScroll: true })
  }

  function createNewChat() {
    const chat = makeChat()

    setChatState(previous => ({
      chats: [chat, ...previous.chats],
      activeId: chat.id
    }))

    setInput('')
    closeHistory()
  }

  function selectChat(id) {
    setChatState(previous => ({ ...previous, activeId: id }))
    closeHistory()
  }

  function deleteRemote(id) {
    fetch(`${API_URL}/api/chat/history/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(error => console.error('Could not delete remote chat history:', error))
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

    deleteRemote(id)
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

    chats.forEach(chat => deleteRemote(chat.id))
    const fresh = makeChat()
    setChatState({ chats: [fresh], activeId: fresh.id })
    setInput('')
  }

  async function sendMessage(text = input) {
    const question = String(text).trim()

    if (!question || pendingRef.current) return

    pendingRef.current = true
    setError(null)

    const targetId = activeId
    setLoadingChatId(targetId)

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
            { sender: 'user', text: question }
          ]
        }
      })
    }))

    setInput('')

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: targetId,
          message: question
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from AI')
      }

      setChatState(previous => ({
        ...previous,
        chats: previous.chats.map(chat =>
          chat.id === targetId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { sender: 'bot', text: data.reply }
                ]
              }
            : chat
        )
      }))
    } catch (err) {
      console.error('เชื่อมต่อ Backend ไม่สำเร็จ:', err)
      setError({
        chatId: targetId,
        message: err.message || 'Something went wrong. Please try again.',
      })
    } finally {
      pendingRef.current = false
      setLoadingChatId(null)
    }
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
          <DragonMascot state={mascotState} />

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
            <button
              type="button"
              className="chat-history-toggle"
              ref={historyToggleRef}
              aria-expanded={historyOpen}
              aria-controls="chat-history-panel"
              onClick={() => setHistoryOpen(previous => !previous)}
            >
              <span>Chat History</span>
              <span aria-hidden="true">{historyOpen ? '−' : '+'}</span>
            </button>
            <div id="chat-history-panel" data-open={historyOpen}>
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
                  >
                    <button
                      type="button"
                      className="chat-history-title"
                      aria-current={chat.id === activeId ? 'true' : undefined}
                      onClick={() => selectChat(chat.id)}
                      title={chat.title}
                    >
                      {chat.title}
                    </button>

                    <button
                      type="button"
                      className="chat-history-action"
                      aria-label="Rename chat"
                      title="Rename chat"
                      onClick={() => renameChat(chat.id)}
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      className="chat-history-action"
                      aria-label="Delete chat"
                      title="Delete chat"
                      onClick={() => deleteChat(chat.id)}
                      disabled={loadingChatId === chat.id}
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
                disabled={loadingChatId !== null}
              >
                🗑 Clear All History
              </button>
            </div>
          </aside>

          <div className="chat-main">
            <div id="chat-messages" ref={messagesRef}>
              {activeChat?.messages.map((message, index) => (
                <div
                  key={`${activeId}-${index}`}
                  className={message.sender === 'user' ? 'user-message' : 'bot-message'}
                >
                  {message.sender === 'bot' ? (
                    <AssistantReply text={message.text} canCopy={index > 0} />
                  ) : message.text}
                </div>
              ))}

              {loadingChatId === activeId && (
                <div className="bot-message typing-message" role="status">
                  <span className="chat-loading-stars" aria-hidden="true">✦ ✧ ✦</span>
                  <span>Waiting for the AI reply…</span>
                </div>
              )}

              {error?.chatId === activeId && (
                <p className="chat-request-error" role="alert">
                  {error.message}
                </p>
              )}
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                id="user-input"
                aria-label="Your message"
                placeholder="Type your message..."
                value={input}
                disabled={loadingChatId !== null}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) sendMessage()
                }}
              />

              <button
                id="send-button"
                type="button"
                disabled={loadingChatId !== null}
                onClick={() => sendMessage()}
              >
                {loadingChatId !== null ? 'Thinking...' : 'Send →'}
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
              disabled={loadingChatId !== null}
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


export default Chat
