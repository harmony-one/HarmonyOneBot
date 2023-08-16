import QRCodeUtil from 'qrcode'
import sharp from "sharp";

type CoordinateMapping = [number, number[]]

const CONNECTING_ERROR_MARGIN = 0.1
const CIRCLE_SIZE_MODIFIER = 2.5
const QRCODE_MATRIX_MARGIN = 7

function isAdjecentDots(cy: number, otherCy: number, cellSize: number) {
  if (cy === otherCy) {
    return false
  }
  const diff = cy - otherCy < 0 ? otherCy - cy : cy - otherCy

  return diff <= cellSize + CONNECTING_ERROR_MARGIN
}

function getMatrix(value: string, errorCorrectionLevel: QRCodeUtil.QRCodeErrorCorrectionLevel) {
  const arr = Array.prototype.slice.call(
    QRCodeUtil.create(value, { errorCorrectionLevel }).modules.data,
    0
  )
  const sqrt = Math.sqrt(arr.length)

  return arr.reduce(
    (rows, key, index) =>
      (index % sqrt === 0 ? rows.push([key]) : rows[rows.length - 1].push(key)) && rows,
    []
  )
}

export const QrCodeUtil = {
  generate(uri: string, size: number, logoSize: number) {
    const dotColor = '#141414'
    const edgeColor = '#ffffff'
    const dots: string[] = []
    const matrix = getMatrix(uri, 'Q')
    const cellSize = size / matrix.length
    const qrList = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ]

    qrList.forEach(({ x, y }) => {
      const x1 = (matrix.length - QRCODE_MATRIX_MARGIN) * cellSize * x
      const y1 = (matrix.length - QRCODE_MATRIX_MARGIN) * cellSize * y
      const borderRadius = 0.45
      for (let i = 0; i < qrList.length; i += 1) {
        const dotSize = cellSize * (QRCODE_MATRIX_MARGIN - i * 2)
        dots.push(
          `
            <rect
              fill="${i % 2 === 0 ? dotColor : edgeColor}"
              height="${dotSize}"
              rx="${dotSize * borderRadius}"
              ry="${dotSize * borderRadius}"
              width="${dotSize}"
              x="${x1 + cellSize * i}"
              y="${y1 + cellSize * i}"
            />
          `
        )
      }
    })

    const clearArenaSize = Math.floor((logoSize + 25) / cellSize)
    const matrixMiddleStart = matrix.length / 2 - clearArenaSize / 2
    const matrixMiddleEnd = matrix.length / 2 + clearArenaSize / 2 - 1
    const circles: [number, number][] = []

    // Getting coordinates for each of the QR code dots
    matrix.forEach((row: QRCodeUtil.QRCode[], i: number) => {
      row.forEach((_, j: number) => {
        if (matrix[i][j]) {
          if (
            !(
              (i < QRCODE_MATRIX_MARGIN && j < QRCODE_MATRIX_MARGIN) ||
              (i > matrix.length - (QRCODE_MATRIX_MARGIN + 1) && j < QRCODE_MATRIX_MARGIN) ||
              (i < QRCODE_MATRIX_MARGIN && j > matrix.length - (QRCODE_MATRIX_MARGIN + 1))
            )
          ) {
            if (
              !(
                i > matrixMiddleStart &&
                i < matrixMiddleEnd &&
                j > matrixMiddleStart &&
                j < matrixMiddleEnd
              )
            ) {
              const cx = i * cellSize + cellSize / 2
              const cy = j * cellSize + cellSize / 2
              circles.push([cx, cy])
            }
          }
        }
      })
    })

    // Cx to multiple cys
    const circlesToConnect: Record<number, number[]> = {}

    // Mapping all dots cicles on the same x axis
    circles.forEach(([cx, cy]) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (circlesToConnect[cx]) {
        circlesToConnect[cx].push(cy)
      } else {
        circlesToConnect[cx] = [cy]
      }
    })

    // Drawing lonely dots
    Object.entries(circlesToConnect)
      // Only get dots that have neighbors
      .map(([cx, cys]) => {
        const newCys = cys.filter(cy =>
          cys.every(otherCy => !isAdjecentDots(cy, otherCy, cellSize))
        )

        return [Number(cx), newCys] as CoordinateMapping
      })
      .forEach(([cx, cys]) => {
        cys.forEach(cy => {
          dots.push(
            `<circle cx="${cx}" cy="${cy}" fill="${dotColor}" r="${cellSize / CIRCLE_SIZE_MODIFIER}" />`
          )
        })
      })

    // Drawing lines for dots that are close to each other
    Object.entries(circlesToConnect)
      // Only get dots that have more than one dot on the x axis
      .filter(([_, cys]) => cys.length > 1)
      // Removing dots with no neighbors
      .map(([cx, cys]) => {
        const newCys = cys.filter(cy => cys.some(otherCy => isAdjecentDots(cy, otherCy, cellSize)))

        return [Number(cx), newCys] as CoordinateMapping
      })
      // Get the coordinates of the first and last dot of a line
      .map(([cx, cys]) => {
        cys.sort((a, b) => (a < b ? -1 : 1))
        const groups: number[][] = []

        for (const cy of cys) {
          const group = groups.find(item =>
            item.some(otherCy => isAdjecentDots(cy, otherCy, cellSize))
          )
          if (group) {
            group.push(cy)
          } else {
            groups.push([cy])
          }
        }

        return [cx, groups.map(item => [item[0], item[item.length - 1]])] as [number, number[][]]
      })
      .forEach(([cx, groups]) => {
        groups.forEach(([y1, y2]) => {
          dots.push(
            `
              <line
                x1="${cx}"
                x2="${cx}"
                y1="${y1}"
                y2="${y2}"
                stroke="${dotColor}"
                stroke-width="${cellSize / (CIRCLE_SIZE_MODIFIER / 2)}"
                stroke-linecap="round"
              />
            `
          )
        })
      })

    return dots
  }
}

export async function generateWcQr(uri: string, size = 480) {
  const logoSize = size / 4;
  const qrCodeStrings = QrCodeUtil.generate(uri || '', size, logoSize);

  const logoString = `
    <svg width="${logoSize}" height="${logoSize}" viewBox="0 -4 28 28">
      <g clip-path="url(#a)">
        <path
          d="M7.386 6.482c3.653-3.576 9.575-3.576 13.228 0l.44.43a.451.451 0 0 1 0 .648L19.55 9.033a.237.237 0 0 1-.33 0l-.606-.592c-2.548-2.496-6.68-2.496-9.228 0l-.648.634a.237.237 0 0 1-.33 0L6.902 7.602a.451.451 0 0 1 0-.647l.483-.473Zm16.338 3.046 1.339 1.31a.451.451 0 0 1 0 .648l-6.035 5.909a.475.475 0 0 1-.662 0L14.083 13.2a.119.119 0 0 0-.166 0l-4.283 4.194a.475.475 0 0 1-.662 0l-6.035-5.91a.451.451 0 0 1 0-.647l1.338-1.31a.475.475 0 0 1 .662 0l4.283 4.194c.046.044.12.044.166 0l4.283-4.194a.475.475 0 0 1 .662 0l4.283 4.194c.046.044.12.044.166 0l4.283-4.194a.475.475 0 0 1 .662 0Z"
          fill="#3396ff"
        />
      </g>
      <defs>
        <clipPath id="a"><path fill="#ffffff" d="M0 0h28v20H0z" /></clipPath>
      </defs>
    </svg>`

  const svgString = `<svg height="${size}" width="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}}">${qrCodeStrings.join(' ')}</svg>`;

  return sharp({
    create: {
      width: size + 50,
      height: size + 50,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .toFormat("png")
    .composite([
      {
        input: Buffer.from(svgString),
        gravity: 'center',
      },
      {
        input: Buffer.from(logoString),
        gravity: 'centre',
      }

    ])
    .toBuffer()
}