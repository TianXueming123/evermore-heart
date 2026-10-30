type Color = readonly [number, number, number]

type FrameOptions = {
  width: number
  height: number
  centerX: number
  centerY: number
  scale: number
  time: number
  motion: number
  assembly: number
  heartbeat: number
  rotationX: number
  rotationY: number
  isMobile: boolean
  burst: number
}

type Filament = {
  angle: number
  reach: number
  lift: number
  sway: number
  phase: number
  speed: number
  width: number
  alpha: number
  color: number
}

type Sparkle = {
  angle: number
  radius: number
  depth: number
  size: number
  phase: number
  speed: number
  color: number
  cross: boolean
}

type Point = { x: number; y: number }

const TAU = Math.PI * 2
const FILAMENT_COLORS: Color[] = [
  [255, 210, 228],
  [255, 157, 195],
  [222, 185, 255],
  [255, 224, 202],
]

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const random = (min: number, max: number) => min + Math.random() * (max - min)
const rgba = (color: Color, alpha: number) =>
  `rgba(${color[0]},${color[1]},${color[2]},${alpha})`

function heartPoint(angle: number, radius = 1): Point {
  return {
    x: ((16 * Math.sin(angle) ** 3 * 1.08) * radius) / 17,
    y:
      -((13 * Math.cos(angle) -
        5 * Math.cos(2 * angle) -
        2 * Math.cos(3 * angle) -
        Math.cos(4 * angle)) *
        radius) /
        17 -
      0.12,
  }
}

function cubicPoint(
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
  progress: number,
): Point {
  const inverse = 1 - progress
  const a = inverse ** 3
  const b = 3 * inverse ** 2 * progress
  const c = 3 * inverse * progress ** 2
  const d = progress ** 3
  return {
    x: start.x * a + controlA.x * b + controlB.x * c + end.x * d,
    y: start.y * a + controlA.y * b + controlB.y * c + end.y * d,
  }
}

export class HeartFlow {
  private readonly filaments: Filament[] = Array.from({ length: 8 }, (_, index) => ({
    angle: Math.PI * random(0.4, 1.6),
    reach: random(1.25, 2.65),
    lift: random(0.12, 1.1),
    sway: random(0.04, 0.22),
    phase: Math.random(),
    speed: random(0.075, 0.16),
    width: random(0.35, 0.85),
    alpha: random(0.12, 0.34),
    color: index % FILAMENT_COLORS.length,
  }))

  private readonly sparkles: Sparkle[] = Array.from({ length: 1380 }, () => ({
    angle: Math.random() * TAU,
    radius:
      Math.random() < 0.72
        ? random(0.83, 1.035)
        : Math.sqrt(Math.random()) * 0.87,
    depth: random(-0.24, 0.24),
    size: random(0.5, 1.45) * (Math.random() < 0.11 ? 1.9 : 1),
    phase: Math.random() * TAU,
    speed: random(0.8, 2.5),
    color: Math.floor(random(0, FILAMENT_COLORS.length)),
    cross: Math.random() < 0.1,
  }))

  private readonly contourStreams = Array.from({ length: 12 }, (_, index) => ({
    offset: Math.random(),
    speed: random(0.045, 0.075),
    radius: random(0.95, 1.02),
    trail: random(0.24, 0.52),
    width: random(0.65, 1.35),
    depth: random(-0.08, 0.08),
    color: index % FILAMENT_COLORS.length,
    direction: index % 5 === 0 ? -1 : 1,
  }))

  drawStreamers(
    context: CanvasRenderingContext2D,
    sprites: HTMLCanvasElement[],
    options: FrameOptions,
  ) {
    const {
      width,
      height,
      centerX,
      centerY,
      scale,
      time,
      motion,
      assembly,
      heartbeat,
      isMobile,
      burst,
    } = options
    const animatedTime = time * motion
    const count = isMobile ? 5 : this.filaments.length
    const pulseCount = 1
    const baseY = height * (isMobile ? 0.67 : 0.7)
    const visibility = clamp(assembly * 1.4) * (1 - burst * 0.4)

    context.save()
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (let index = 0; index < count; index += 1) {
      const filament = this.filaments[index]
      const origin = heartPoint(filament.angle)
      const direction = Math.sign(origin.x) || (index % 2 === 0 ? 1 : -1)
      const wave = Math.sin(animatedTime * 0.62 + filament.phase * TAU)
      const sway = wave * scale * filament.sway * motion
      const start = {
        x: centerX + origin.x * scale * heartbeat,
        y: centerY + origin.y * scale * heartbeat,
      }
      const end = {
        x:
          start.x +
          direction * scale * filament.reach +
          Math.sin(animatedTime * 0.36 + filament.phase * TAU) * scale * 0.12 * motion,
        y: baseY + wave * scale * 0.065,
      }
      const controlA = {
        x: start.x + direction * scale * (0.08 + filament.sway * 0.25),
        y: start.y + scale * (0.3 + filament.lift * 0.18),
      }
      const controlB = {
        x: end.x - direction * scale * (0.72 + filament.lift * 0.28) + sway,
        y: baseY - scale * (0.1 + filament.lift * 0.26) - sway * 0.4,
      }
      const color = FILAMENT_COLORS[filament.color]
      const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y)
      gradient.addColorStop(0, rgba(color, 0.04))
      gradient.addColorStop(0.3, rgba(color, 0.65))
      gradient.addColorStop(0.72, rgba(color, 0.24))
      gradient.addColorStop(1, rgba(color, 0))
      context.globalAlpha = filament.alpha * 0.28 * visibility
      context.strokeStyle = gradient
      context.lineWidth = filament.width
      context.beginPath()
      for (let step = 0; step <= 32; step += 1) {
        const point = cubicPoint(start, controlA, controlB, end, step / 32)
        if (step === 0) context.moveTo(point.x, point.y)
        else context.lineTo(point.x, point.y)
      }
      context.stroke()

      for (let mote = 0; mote < pulseCount; mote += 1) {
        const headProgress =
          (animatedTime * filament.speed + filament.phase + mote / pulseCount) % 1
        const tailProgress = Math.max(0, headProgress - 0.18)
        const head = cubicPoint(start, controlA, controlB, end, headProgress)
        const tail = cubicPoint(start, controlA, controlB, end, tailProgress)
        const trail = context.createLinearGradient(tail.x, tail.y, head.x, head.y)
        trail.addColorStop(0, rgba(color, 0))
        trail.addColorStop(0.58, rgba(color, 0.4))
        trail.addColorStop(1, 'rgba(255,251,253,1)')
        context.globalAlpha = Math.sin(headProgress * Math.PI) * 0.9 * visibility
        context.strokeStyle = trail
        context.lineWidth = filament.width + 0.55
        context.beginPath()
        for (let step = 0; step <= 12; step += 1) {
          const progress = tailProgress + (headProgress - tailProgress) * (step / 12)
          const point = cubicPoint(start, controlA, controlB, end, progress)
          if (step === 0) context.moveTo(point.x, point.y)
          else context.lineTo(point.x, point.y)
        }
        context.stroke()

        const moteSize = 6 + Math.sin(headProgress * Math.PI) * 7
        context.globalAlpha = Math.sin(headProgress * Math.PI) * 0.88 * visibility
        context.drawImage(
          sprites[filament.color % 2 === 0 ? 0 : 1],
          head.x - moteSize / 2,
          head.y - moteSize / 2,
          moteSize,
          moteSize,
        )
      }
    }

    for (let band = 0; band < 1; band += 1) {
      const ribbon = context.createLinearGradient(0, 0, width, 0)
      ribbon.addColorStop(0, 'rgba(255,183,216,0)')
      ribbon.addColorStop(0.22, 'rgba(222,183,255,0.42)')
      ribbon.addColorStop(0.5, 'rgba(255,231,241,0.72)')
      ribbon.addColorStop(0.78, 'rgba(255,183,216,0.42)')
      ribbon.addColorStop(1, 'rgba(255,183,216,0)')
      context.globalAlpha = (0.22 - band * 0.045) * visibility
      context.strokeStyle = ribbon
      context.lineWidth = 0.65
      context.beginPath()
      for (let x = 0; x <= width + 12; x += 12) {
        const progress = x / width
        const y =
          baseY +
          Math.sin(
            progress * TAU * (1.35 + band * 0.2) +
              animatedTime * (0.48 + band * 0.08) +
              band * 1.6,
          ) *
            scale *
            (0.035 + band * 0.007) +
          Math.sin(progress * TAU * 3 - animatedTime * 0.3) * scale * 0.012 +
          band * 7
        if (x === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
    }

    const sourceY = centerY + scale * 0.53 * heartbeat
    context.save()
    context.translate(centerX, sourceY)
    context.scale(1, 0.42)
    const source = context.createRadialGradient(0, 0, 0, 0, 0, scale * 0.5)
    source.addColorStop(0, `rgba(255,238,247,${0.2 * visibility})`)
    source.addColorStop(0.12, `rgba(255,173,207,${0.13 * visibility})`)
    source.addColorStop(1, 'rgba(255,115,175,0)')
    context.globalAlpha = 1
    context.fillStyle = source
    context.fillRect(-scale * 0.5, -scale * 0.5, scale, scale)
    context.restore()
    context.restore()
  }

  drawSparkles(context: CanvasRenderingContext2D, options: FrameOptions) {
    const {
      centerX,
      centerY,
      scale,
      time,
      motion,
      assembly,
      heartbeat,
      rotationX,
      rotationY,
      isMobile,
      burst,
    } = options
    const cosY = Math.cos(rotationY)
    const sinY = Math.sin(rotationY)
    const cosX = Math.cos(rotationX)
    const sinX = Math.sin(rotationX)
    const animatedTime = time * motion
    const count = isMobile ? 920 : this.sparkles.length
    const visibility = clamp(assembly * 1.3) * (1 - burst * 0.76)

    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let index = 0; index < count; index += 1) {
      const sparkle = this.sparkles[index]
      const point = heartPoint(sparkle.angle, sparkle.radius)
      const flutter = Math.sin(animatedTime * 0.7 + sparkle.phase) * 0.0035 * motion
      const x3d = point.x + flutter
      const y3d = point.y + Math.cos(animatedTime * 0.62 + sparkle.phase) * 0.003 * motion
      const rotatedX = x3d * cosY + sparkle.depth * sinY
      const rotatedZ = -x3d * sinY + sparkle.depth * cosY
      const rotatedY = y3d * cosX - rotatedZ * sinX
      const z = y3d * sinX + rotatedZ * cosX
      const perspective = 3.8 / (3.8 - z * 0.7)
      const x = centerX + rotatedX * scale * heartbeat * perspective
      const y = centerY + rotatedY * scale * heartbeat * perspective
      const travelingLight =
        (0.5 + 0.5 * Math.sin((point.x - point.y) * 5 - animatedTime * 2 + sparkle.phase * 0.08)) ** 9
      const twinkle = 0.5 + 0.5 * Math.sin(animatedTime * sparkle.speed + sparkle.phase)
      const flash = clamp(twinkle ** 5 + travelingLight * 0.8)
      const color = FILAMENT_COLORS[sparkle.color]
      const size = sparkle.size * perspective * (0.7 + flash * 0.55)

      context.globalAlpha = (0.24 + twinkle * 0.55 + travelingLight * 0.48) * visibility
      context.fillStyle = flash > 0.34 ? '#fff9fc' : rgba(color, 0.95)
      context.beginPath()
      context.arc(x, y, size, 0, TAU)
      context.fill()

      if (sparkle.cross && flash > 0.28) {
        const length = size * (2.2 + flash * 3.3)
        context.globalAlpha = flash * 0.62 * visibility
        context.strokeStyle = '#fff4fa'
        context.lineWidth = 0.45
        context.beginPath()
        context.moveTo(x - length, y)
        context.lineTo(x + length, y)
        context.moveTo(x, y - length * 1.35)
        context.lineTo(x, y + length * 1.35)
        context.stroke()
      }
    }
    context.restore()
  }

  drawContourStreams(
    context: CanvasRenderingContext2D,
    sprites: HTMLCanvasElement[],
    options: FrameOptions,
  ) {
    const {
      centerX,
      centerY,
      scale,
      time,
      motion,
      assembly,
      heartbeat,
      rotationX,
      rotationY,
      isMobile,
      burst,
    } = options
    const cosY = Math.cos(rotationY)
    const sinY = Math.sin(rotationY)
    const cosX = Math.cos(rotationX)
    const sinX = Math.sin(rotationX)
    const animatedTime = time * motion
    const count = isMobile ? 8 : this.contourStreams.length
    const visibility = clamp(assembly * 1.5) * (1 - burst * 0.88)

    const project = (angle: number, radius: number, depth: number) => {
      const point = heartPoint(angle, radius)
      const rotatedX = point.x * cosY + depth * sinY
      const rotatedZ = -point.x * sinY + depth * cosY
      const rotatedY = point.y * cosX - rotatedZ * sinX
      const z = point.y * sinX + rotatedZ * cosX
      const perspective = 3.8 / (3.8 - z * 0.7)
      return {
        x: centerX + rotatedX * scale * heartbeat * perspective,
        y: centerY + rotatedY * scale * heartbeat * perspective,
      }
    }

    context.save()
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (let index = 0; index < count; index += 1) {
      const stream = this.contourStreams[index]
      const radius =
        stream.radius + Math.sin(animatedTime * 0.8 + stream.offset * TAU) * 0.008 * motion
      const headAngle =
        stream.offset * TAU + animatedTime * stream.speed * TAU * stream.direction
      const tailAngle = headAngle - stream.trail * stream.direction
      const head = project(headAngle, radius, stream.depth)
      const tail = project(tailAngle, radius, stream.depth)
      const color = FILAMENT_COLORS[stream.color]
      const trail = context.createLinearGradient(tail.x, tail.y, head.x, head.y)
      trail.addColorStop(0, rgba(color, 0))
      trail.addColorStop(0.45, rgba(color, 0.35))
      trail.addColorStop(0.82, rgba(color, 0.82))
      trail.addColorStop(1, 'rgba(255,253,255,1)')

      context.beginPath()
      for (let step = 0; step <= 18; step += 1) {
        const angle = tailAngle + (headAngle - tailAngle) * (step / 18)
        const point = project(angle, radius, stream.depth)
        if (step === 0) context.moveTo(point.x, point.y)
        else context.lineTo(point.x, point.y)
      }
      context.globalAlpha = 0.16 * visibility
      context.strokeStyle = rgba(color, 0.42)
      context.lineWidth = stream.width * 3.2
      context.stroke()
      context.globalAlpha = 0.82 * visibility
      context.strokeStyle = trail
      context.lineWidth = stream.width
      context.stroke()

      const glowSize = 10 + stream.width * 5
      context.globalAlpha = 0.92 * visibility
      context.drawImage(
        sprites[0],
        head.x - glowSize / 2,
        head.y - glowSize / 2,
        glowSize,
        glowSize,
      )
      context.fillStyle = '#fffdff'
      context.beginPath()
      context.arc(head.x, head.y, 0.75 + stream.width * 0.25, 0, TAU)
      context.fill()
    }
    context.restore()
  }
}
