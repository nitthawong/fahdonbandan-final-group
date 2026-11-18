import { useEffect, useRef, useState } from 'react'
import './PhysicsLanyard.css'

const DRAG_THRESHOLD = 6
const MAX_ANGLE = 0.5
const REST_POSE = { strap: 0, badge: 0, pitch: 0 }

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function MemberBadge({ member, variant = 'team' }) {
  const isProfile = variant === 'profile'
  const [flipped, setFlipped] = useState(false)
  const anchor = useRef(null)
  const hanger = useRef(null)
  const drag = useRef(null)
  const frame = useRef(0)
  const pose = useRef(REST_POSE)
  const suppressClick = useRef(false)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function draw(next) {
    pose.current = next
    const style = hanger.current.style
    style.setProperty('--strap-angle', `${next.strap}rad`)
    style.setProperty('--badge-angle', `${next.badge - next.strap}rad`)
    style.setProperty('--badge-pitch', `${next.pitch}rad`)
    style.setProperty('--badge-yaw', `${next.strap * 0.45}rad`)
  }

  function settle(initialVelocity, constrain) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(REST_POSE)
      return
    }

    let strapSpeed = initialVelocity
    let badgeSpeed = initialVelocity * 0.45
    let pitchSpeed = 0
    let lastTime = performance.now()

    function swing(now) {
      const dt = clamp((now - lastTime) / 1000, 0, 1 / 30)
      lastTime = now
      const { strap, badge, pitch } = pose.current

      // Gravity restores each angle. The moving clip also pulls on the card.
      strapSpeed += (-38 * Math.sin(strap) - 4.5 * strapSpeed) * dt
      badgeSpeed += (-27 * Math.sin(badge) + 11 * (strap - badge) - 4.1 * badgeSpeed) * dt
      pitchSpeed += (-43 * pitch - 7 * pitchSpeed) * dt

      const nextStrap = strap + strapSpeed * dt
      const nextBadge = badge + badgeSpeed * dt
      const next = {
        strap: constrain(nextStrap),
        badge: constrain(nextBadge),
        pitch: pitch + pitchSpeed * dt,
      }
      if (next.strap !== nextStrap) strapSpeed = 0
      if (next.badge !== nextBadge) badgeSpeed = 0

      const displacement = Math.max(Math.abs(next.strap), Math.abs(next.badge), Math.abs(next.pitch))
      const speed = Math.max(Math.abs(strapSpeed), Math.abs(badgeSpeed), Math.abs(pitchSpeed))
      if (displacement < 0.002 && speed < 0.015) {
        draw(REST_POSE)
        return
      }

      draw(next)
      frame.current = requestAnimationFrame(swing)
    }

    frame.current = requestAnimationFrame(swing)
  }

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return

    cancelAnimationFrame(frame.current)
    const bounds = anchor.current.getBoundingClientRect()
    const pivotX = bounds.left + bounds.width / 2
    const pivotY = bounds.top
    const viewportWidth = document.documentElement.clientWidth
    const halfWidth = hanger.current.offsetWidth / 2
    const radius = hanger.current.offsetHeight
    const leftRoom = Math.max(0, pivotX - halfWidth - 8)
    const rightRoom = Math.max(0, viewportWidth - pivotX - halfWidth - 8)
    const maxLeft = Math.min(MAX_ANGLE, leftRoom / radius)
    const maxRight = Math.min(MAX_ANGLE, rightRoom / radius)
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pivotX,
      pivotY,
      startPose: pose.current,
      pointerAngle: Math.atan2(event.clientX - pivotX, Math.max(1, event.clientY - pivotY)),
      constrain: value => clamp(value, -maxRight, maxLeft),
      moved: false,
      velocity: 0,
      lastTime: event.timeStamp,
    }
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function clearReflection() {
    if (isProfile) hanger.current.style.removeProperty('--foil-opacity')
  }

  function moveDrag(event) {
    if (isProfile && (event.pointerType === 'mouse' || drag.current?.id === event.pointerId)) {
      const bounds = event.currentTarget.getBoundingClientRect()
      const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1)
      const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1)
      const style = hanger.current.style
      style.setProperty('--foil-x', `${x * 100}%`)
      style.setProperty('--foil-y', `${y * 100}%`)
      style.setProperty('--foil-angle', `${105 + x * 65}deg`)
      style.setProperty('--foil-opacity', '0.52')
    }

    const current = drag.current
    if (!current || current.id !== event.pointerId) return

    const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY)
    if (!current.moved && distance < DRAG_THRESHOLD) return

    current.moved = true
    suppressClick.current = true
    const pointerAngle = Math.atan2(
      event.clientX - current.pivotX,
      Math.max(1, event.clientY - current.pivotY),
    )
    const turn = current.pointerAngle - pointerAngle
    const verticalPull = (event.clientY - current.startY) * 0.004
    const next = {
      strap: current.constrain(current.startPose.strap + turn * 1.3),
      badge: current.constrain(current.startPose.badge + turn * 0.85),
      pitch: clamp(current.startPose.pitch + verticalPull, -0.27, 0.27),
    }
    const dt = Math.max((event.timeStamp - current.lastTime) / 1000, 1 / 120)
    current.velocity = (next.strap - pose.current.strap) / dt
    current.lastTime = event.timeStamp
    draw(next)
  }

  function endDrag(event) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return

    drag.current = null
    if (event.pointerType !== 'mouse' || event.type === 'pointercancel') clearReflection()
    const recentlyMoved = event.timeStamp - current.lastTime < 80
    const velocity = event.type === 'pointerup' && recentlyMoved ? current.velocity : 0
    if (current.moved || pose.current !== REST_POSE) {
      settle(clamp(velocity, -1.65, 1.65), current.constrain)
    }
  }

  function flip(event) {
    if (event.detail > 0 && suppressClick.current) return
    setFlipped(previous => !previous)
  }

  return (
    <div ref={anchor} className={`lanyard-item ${isProfile ? 'lanyard-item--profile' : member.color}`}>
      <div ref={hanger} className="lanyard-hanger">
        <div className="lanyard-strap" aria-hidden="true" />

        <div className={`lanyard-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="lanyard-clip" aria-hidden="true" />
          <button
            type="button"
            className="lanyard-flip"
            aria-label={`Flip ${member.nickname}'s card`}
            aria-pressed={flipped}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerLeave={isProfile ? clearReflection : undefined}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onClick={flip}
          />

          <div className="lanyard-inner">
            <div className="lanyard-front" aria-hidden={flipped}>
              <div className="lanyard-color">
                {isProfile && <span className="lanyard-issuer">ฟ้าดลบันดาล</span>}
              </div>
              <div className="lanyard-avatar">
                <img src={member.image} alt={member.nickname} />
              </div>
              <h3>{member.name}</h3>
              <p>{member.nickname}</p>
              <small>{member.role}</small>
              {isProfile && <div className="lanyard-card-id">MEMBER / {member.id.toUpperCase()}</div>}
            </div>

            <div className="lanyard-back" inert={!flipped}>
              <h3>{member.name}</h3>
              <p>{member.nickname}</p>
              <p><strong>Role</strong></p>
              <p>{member.role}</p>
              <p><strong>{isProfile ? 'Project' : 'Work'}</strong></p>
              <p>{member.work}</p>
              <a
                href={isProfile ? '#profile-contribution' : `/profile?member=${member.id}`}
                className="profile-link"
                aria-label={isProfile ? undefined : `View ${member.nickname}'s profile`}
              >
                {isProfile ? 'View contribution ↓' : 'View Profile →'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PhysicsLanyard({ members }) {
  return (
    <div className="lanyard-wall">
      {members.map(member => (
        <MemberBadge key={member.id} member={member} />
      ))}
    </div>
  )
}
