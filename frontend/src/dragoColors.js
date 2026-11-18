export const dragoImages = {
  idle: '/drago-idle.png',
  expressions: '/drago-expressions.webp',
}

const sourcePixels = new Map()
const colorImages = new Map()

function ease(value) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

export function recolorDragoPixels(pixels, color) {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue

    const red = pixels[offset]
    const green = pixels[offset + 1]
    const blue = pixels[offset + 2]
    // Golden scales have greater chroma than the slate, eyes, and shadows.
    const mask = Math.min(
      ease((red - blue - 53) / 34),
      ease((green - blue - 43) / 22),
      ease((red - 151) / 36),
    )
    if (mask === 0) continue

    const white = 78 + (0.3 * red + 0.62 * green + 0.08 * blue) * 0.89
    let targetRed = red + 8
    let targetGreen = green - 24
    let targetBlue = blue - 7

    if (color === 'yellow') {
      targetRed = red + 4
      targetGreen = green + 31
      targetBlue = blue + 8
    } else if (color === 'white') {
      targetRed = white + 4
      targetGreen = white + 2
      targetBlue = white
    }

    pixels[offset] = red + (targetRed - red) * mask
    pixels[offset + 1] = green + (targetGreen - green) * mask
    pixels[offset + 2] = blue + (targetBlue - blue) * mask
  }
}

function loadSource(url) {
  if (!sourcePixels.has(url)) {
    sourcePixels.set(url, new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = image.naturalWidth
          canvas.height = image.naturalHeight
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context.drawImage(image, 0, 0)
          resolve(context.getImageData(0, 0, canvas.width, canvas.height))
        } catch (error) {
          reject(error)
        }
      }
      image.onerror = reject
      image.src = url
    }).catch(error => {
      sourcePixels.delete(url)
      throw error
    }))
  }
  return sourcePixels.get(url)
}

async function makeColorImage(url, color) {
  const original = await loadSource(url)
  const { width, height } = original
  const pixels = new Uint8ClampedArray(original.data)
  recolorDragoPixels(pixels, color)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}

export function getDragoColorImages(color) {
  if (!colorImages.has(color)) {
    colorImages.set(color, Promise.all([
      makeColorImage(dragoImages.idle, color),
      makeColorImage(dragoImages.expressions, color),
    ]).then(([idle, expressions]) => ({ color, idle, expressions })).catch(error => {
      colorImages.delete(color)
      throw error
    }))
  }
  return colorImages.get(color)
}
