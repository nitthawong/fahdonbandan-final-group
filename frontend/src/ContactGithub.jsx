import { useLayoutEffect, useRef, useState } from 'react'

const GITHUB_URL = 'https://github.com/nitthawong/fahdonbandan-final-group'
// The 33×33 QR matrix encodes GITHUB_URL. Keep the two in sync.
const QR_ROWS = [
  '111111100000110000011001001111111',
  '100000100101011110001100001000001',
  '101110101110110010000110001011101',
  '101110101111101111011010101011101',
  '101110101101010100011101001011101',
  '100000101100111110001000101000001',
  '111111101010101010101010101111111',
  '000000001110101100111101000000000',
  '101111100000111101010000001111100',
  '111111001011100010011001001101101',
  '010111100101000100100010111010110',
  '010101011001001010111100101011100',
  '101000110000000000110011110111001',
  '110111011111011110111001001001111',
  '110100101110101000000010011000110',
  '000101001010000010110100011101100',
  '100000101110001001000011110110001',
  '101101011010001011111101001101101',
  '011001101101110111001100110110110',
  '001010000110010011111110000111110',
  '111011100000111010011010110111000',
  '100110011110101101111101101001001',
  '100100101000100110101000110111010',
  '100111010101011100111111011101101',
  '101101111000110101000011111110010',
  '000000001000111010110001100010101',
  '111111100111100110101111101010110',
  '100000101001111010001101100011101',
  '101110101101010100110000111111010',
  '101110101100000110011001110011011',
  '101110101111101000101010001100000',
  '100000100101011010001110000011100',
  '111111101011100011010011110100010',
]
const qrPoints = QR_ROWS.flatMap((row, y) =>
  Array.from(row, (value, x) => ({ x: x + 4, y: y + 4, dark: value === '1' }))
    .filter(point => point.dark),
)

const cloudPoints = []
for (let y = 10; y <= 28; y += 0.5) {
  for (let x = 5; x <= 35; x += 0.5) {
    const left = ((x - 12) / 7) ** 2 + ((y - 22) / 5.5) ** 2
    const top = ((x - 20) / 9) ** 2 + ((y - 18) / 8) ** 2
    const right = ((x - 28) / 7) ** 2 + ((y - 22) / 5.5) ** 2
    if (Math.min(left, top, right) <= 1) cloudPoints.push({ x, y })
  }
}

const MODULE_SIZE = 10
const BOARD_SIZE = 410
const DURATION = 1050
const CLOUD_COLORS = [
  [121, 150, 201],
  [178, 126, 177],
  [137, 116, 191],
  [91, 145, 191],
]

const tiles = qrPoints.map(({ x, y }, index) => ({
  x,
  y,
  start: cloudPoints[Math.floor(index * cloudPoints.length / qrPoints.length)],
  delay: (index % 17) * 0.009,
  arc: index % 2 === 0 ? -1.7 : 1.7,
  color: CLOUD_COLORS[index % CLOUD_COLORS.length],
}))

function smoothStep(value) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function drawQR(context, progress) {
  context.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE)
  const paper = smoothStep((progress - 0.66) / 0.34)
  const ink = smoothStep((progress - 0.7) / 0.3)

  if (paper > 0) {
    context.fillStyle = `rgba(255, 255, 255, ${paper})`
    context.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE)
  }

  const colors = CLOUD_COLORS.map(color =>
    `rgb(${color.map(channel => Math.round(channel * (1 - ink))).join(', ')})`,
  )

  for (const tile of tiles) {
    context.fillStyle = colors[CLOUD_COLORS.indexOf(tile.color)]
    const travel = smoothStep((progress - tile.delay) / 0.83)
    const arc = tile.arc * Math.sin(Math.PI * travel)
    const x = (tile.start.x + (tile.x - tile.start.x) * travel) * MODULE_SIZE
    const y = (tile.start.y + (tile.y - tile.start.y) * travel + arc) * MODULE_SIZE
    const edges = smoothStep((travel - 0.52) / 0.48)

    if (edges === 1) {
      context.fillRect(x, y, MODULE_SIZE, MODULE_SIZE)
    } else {
      const size = 4.2 + 5.8 * edges
      const offset = (MODULE_SIZE - size) / 2
      const left = x + offset
      const top = y + offset
      const right = left + size
      const bottom = top + size
      const radius = size * (1 - edges) / 2

      context.beginPath()
      context.moveTo(left + radius, top)
      context.lineTo(right - radius, top)
      context.quadraticCurveTo(right, top, right, top + radius)
      context.lineTo(right, bottom - radius)
      context.quadraticCurveTo(right, bottom, right - radius, bottom)
      context.lineTo(left + radius, bottom)
      context.quadraticCurveTo(left, bottom, left, bottom - radius)
      context.lineTo(left, top + radius)
      context.quadraticCurveTo(left, top, left + radius, top)
      context.closePath()
      context.fill()
    }
  }
}

export default function ContactGithub() {
  const [open, setOpen] = useState(false)
  const canvas = useRef(null)
  const progress = useRef(0)

  useLayoutEffect(() => {
    const context = canvas.current.getContext('2d')
    if (!context) return

    const target = open ? 1 : 0
    const start = progress.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const duration = DURATION * Math.abs(target - start)

    if (duration === 0 || reduceMotion.matches) {
      progress.current = target
      drawQR(context, target)
      return
    }

    const startTime = performance.now()
    let frame

    function animate(now) {
      const elapsed = Math.min(1, Math.max(0, (now - startTime) / duration))
      progress.current = reduceMotion.matches ? target : start + (target - start) * elapsed
      drawQR(context, progress.current)

      if (elapsed < 1 && !reduceMotion.matches) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [open])

  return (
    <div className="contact-github" data-open={open}>
      <div className="contact-qr-copy">
        <h3>Find us on GitHub</h3>
        <p id="team-github-status" role="status">
          {open ? 'Scan the cloud’s QR to open our repository.' : 'Tap the little cloud to open a QR for our team’s code.'}
        </p>
        <a className="contact-github-link" href={GITHUB_URL}>Open GitHub ↗</a>
      </div>

      <button
        type="button"
        className="contact-qr-toggle"
        aria-label={open ? 'Hide GitHub QR code' : 'Reveal GitHub QR code'}
        aria-describedby="team-github-status"
        onClick={() => setOpen(previous => !previous)}
      >
        <span className="contact-qr-scene" aria-hidden="true">
          <span className="contact-cloud-sparkle contact-cloud-sparkle--gold">✦</span>
          <span className="contact-cloud-sparkle contact-cloud-sparkle--pink">✧</span>
          <span className="contact-cloud-butterfly">
            <img src="/butterfly-pink.png" alt="" />
          </span>
          <canvas
            ref={canvas}
            className="contact-qr-board"
            width={BOARD_SIZE}
            height={BOARD_SIZE}
          />
        </span>
        <span className="contact-qr-label">{open ? '↺ Back to the cloud' : '✦ Reveal GitHub QR'}</span>
      </button>
    </div>
  )
}
