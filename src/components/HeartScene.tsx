import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
} from 'react'

export type HeartSceneHandle = {
  bloom: () => void
}

type HeartSceneProps = {
  onBurst?: () => void
}

type Color = [number, number, number]

type HeartParticle = {
  x: number
  y: number
  z: number
  startX: number
  startY: number
  startZ: number
  size: number
  phase: number
  delay: number
  color: number
  burst: number
}

type Star = {
  x: number
  y: number
  size: number
  phase: number
  speed: number
  drift: number
}

type WaveParticle = {
  x: number
  offset: number
  phase: number
  speed: number
  size: number
  color: number
  alpha: number
}

type Meteor = {
  x: number
  y: number
  speed: number
  born: number
  duration: number
}

type Fragment = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  rotation: number
  spin: number
  color: number
  isHeart: boolean
  ambient: boolean
}

const PALETTE: Color[] = [
  [255, 228, 235],
  [255, 166, 194],
  [255, 100, 153],
  [255, 193, 178],
  [218, 185, 255],
  [255, 225, 190],
]

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

function createGlowSprite(color: Color) {
  const sprite = document.createElement('canvas')
  sprite.width = 64
  sprite.height = 64
  const context = sprite.getContext('2d')!
  const [r, g, b] = color
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.1, `rgba(${r},${g},${b},0.98)`)
  gradient.addColorStop(0.32, `rgba(${r},${g},${b},0.52)`)
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  return sprite
}

function drawMiniHeart(
  context: CanvasRenderingContext2D,
  fragment: Fragment,
  alpha: number,
) {
  const [r, g, b] = PALETTE[fragment.color]
  const size = fragment.size
  context.save()
  context.translate(fragment.x, fragment.y)
  context.rotate(fragment.rotation)
  context.globalAlpha = alpha
  context.fillStyle = `rgb(${r},${g},${b})`
  context.shadowColor = `rgba(${r},${g},${b},0.85)`
  context.shadowBlur = 12
  context.beginPath()
  context.moveTo(0, size * 0.8)
  context.bezierCurveTo(
    -size * 1.2,
    0,
    -size * 0.8,
    -size * 0.9,
    0,
    -size * 0.25,
  )
  context.bezierCurveTo(
    size * 0.8,
    -size * 0.9,
    size * 1.2,
    0,
    0,
    size * 0.8,
  )
  context.fill()
  context.restore()
}

const HeartScene = forwardRef<HeartSceneHandle, HeartSceneProps>(
  function HeartScene({ onBurst }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bloomRef = useRef<() => void>(() => undefined)
    const onBurstRef = useRef(onBurst)

    useEffect(() => {
      onBurstRef.current = onBurst
    }, [onBurst])

    useImperativeHandle(
      ref,
      () => ({
        bloom: () => bloomRef.current(),
      }),
      [],
    )

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d')
      if (!context) return

      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const sprites = PALETTE.map(createGlowSprite)
      const pointer = { x: 0, y: 0 }
      const smoothedPointer = { x: 0, y: 0 }
      const fragments: Fragment[] = []
      const meteors: Meteor[] = []
      let width = 0
      let height = 0
      let pixelRatio = 1
      let animationFrame = 0
      const startedAt = performance.now()
      let previousFrame = startedAt
      let burstStarted = -10000
      let nextMeteorAt = 2.8
      let nextAmbientHeartAt = 1.2
      let isMobile = false

      const heartParticles: HeartParticle[] = []
      const stars: Star[] = []
      const waveParticles: WaveParticle[] = []

      const createParticles = () => {
        heartParticles.length = 0
        stars.length = 0
        waveParticles.length = 0
        isMobile = width < 640
        const heartCount = reducedMotion ? 1800 : isMobile ? 2400 : 3900
        const starCount = isMobile ? 75 : 140
        const waveCount = isMobile ? 500 : 900

        for (let index = 0; index < heartCount; index += 1) {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.sqrt(Math.random())
          const x = (16 * Math.sin(angle) ** 3 * radius) / 17
          const y =
            ((13 * Math.cos(angle) -
              5 * Math.cos(2 * angle) -
              2 * Math.cos(3 * angle) -
              Math.cos(4 * angle)) *
              radius) /
            17
          const z =
            ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) *
            0.72 *
            (1 - radius * 0.42)
          const colorRoll = Math.random()
          const color =
            colorRoll < 0.2
              ? 0
              : colorRoll < 0.48
                ? 1
                : colorRoll < 0.7
                  ? 2
                  : colorRoll < 0.84
                    ? 3
                    : colorRoll < 0.94
                      ? 4
                      : 5
          const scatterAngle = angle + randomBetween(-1.2, 1.2)
          const scatterRadius = randomBetween(2.1, 4.2)

          heartParticles.push({
            x,
            y,
            z,
            startX: Math.cos(scatterAngle) * scatterRadius,
            startY: Math.sin(scatterAngle) * scatterRadius * 0.75,
            startZ: z + randomBetween(-2.5, 2.5),
            size: randomBetween(2.2, 5.8) * (Math.random() < 0.06 ? 1.7 : 1),
            phase: Math.random() * Math.PI * 2,
            delay: Math.random() * 0.85,
            color,
            burst: randomBetween(0.65, 1.35),
          })
        }

        for (let index = 0; index < starCount; index += 1) {
          stars.push({
            x: Math.random(),
            y: Math.random(),
            size: randomBetween(0.35, 1.45),
            phase: Math.random() * Math.PI * 2,
            speed: randomBetween(0.35, 1.2),
            drift: randomBetween(-1, 1),
          })
        }

        for (let index = 0; index < waveCount; index += 1) {
          waveParticles.push({
            x: Math.random(),
            offset: randomBetween(-34, 40),
            phase: Math.random() * Math.PI * 2,
            speed: randomBetween(0.0008, 0.0028),
            size: randomBetween(1.8, 5.2),
            color: Math.floor(randomBetween(0, PALETTE.length)),
            alpha: randomBetween(0.18, 0.72),
          })
        }
      }

      const resize = () => {
        const bounds = canvas.getBoundingClientRect()
        width = bounds.width
        height = bounds.height
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75)
        canvas.width = Math.round(width * pixelRatio)
        canvas.height = Math.round(height * pixelRatio)
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        createParticles()
      }

      const spawnFragments = () => {
        const centerX = width / 2
        const centerY = height * (isMobile ? 0.43 : 0.45)
        const count = isMobile ? 28 : 44
        for (let index = 0; index < count; index += 1) {
          const angle = Math.random() * Math.PI * 2
          const speed = randomBetween(45, 155)
          const maxLife = randomBetween(1.5, 2.7)
          fragments.push({
            x: centerX + randomBetween(-45, 45),
            y: centerY + randomBetween(-30, 30),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 55,
            size: randomBetween(2.5, 6.5),
            life: maxLife,
            maxLife,
            rotation: Math.random() * Math.PI * 2,
            spin: randomBetween(-2, 2),
            color: Math.floor(randomBetween(0, PALETTE.length)),
            isHeart: Math.random() < 0.42,
            ambient: false,
          })
        }
      }

      bloomRef.current = () => {
        const now = performance.now()
        if (now - burstStarted < 900) return
        burstStarted = now
        spawnFragments()
        onBurstRef.current?.()
      }

      const handlePointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
        pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
      }

      const render = (now: number) => {
        const elapsed = (now - previousFrame) / 1000
        const delta = Math.min(elapsed, 0.04)
        previousFrame = now
        const time = (now - startedAt) / 1000
        const motion = reducedMotion ? 0 : 1
        const centerX = width / 2
        const centerY = height * (isMobile ? 0.43 : 0.45)
        const heartScale = Math.min(
          width * (isMobile ? 0.39 : 0.28),
          height * 0.31,
        )
        const phase = (time * 1.05) % 1
        const beatGlow = Math.exp(-phase * 8)
        const heartbeat =
          1 +
          motion *
            (Math.exp(-phase * 13) * 0.055 +
              Math.exp(-Math.abs(phase - 0.2) * 36) * 0.028)
        const burstProgress = clamp((now - burstStarted) / 2300)
        const burstAmount = Math.sin(burstProgress * Math.PI)

        context.clearRect(0, 0, width, height)
        context.globalCompositeOperation = 'source-over'

        const aura = context.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          heartScale * 1.6,
        )
        aura.addColorStop(0, `rgba(255,70,137,${0.09 + beatGlow * 0.075 * motion})`)
        aura.addColorStop(0.45, `rgba(170,72,160,${0.035 + beatGlow * 0.035 * motion})`)
        aura.addColorStop(1, 'rgba(30,5,35,0)')
        context.fillStyle = aura
        context.fillRect(0, 0, width, height)

        context.globalCompositeOperation = 'lighter'
        for (const star of stars) {
          const twinkle = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase))
          const x = (star.x * width + time * star.drift * motion + width) % width
          const y = star.y * height
          context.globalAlpha = twinkle
          context.fillStyle = star.size > 1.1 ? '#ffdbe8' : '#cbbde5'
          context.beginPath()
          context.arc(x, y, star.size, 0, Math.PI * 2)
          context.fill()
        }

        smoothedPointer.x += (pointer.x - smoothedPointer.x) * 0.025
        smoothedPointer.y += (pointer.y - smoothedPointer.y) * 0.025
        const rotationY = Math.sin(time * 0.3) * 0.32 * motion + smoothedPointer.x * 0.22
        const rotationX = -0.08 + Math.sin(time * 0.23) * 0.045 * motion + smoothedPointer.y * 0.07
        const cosY = Math.cos(rotationY)
        const sinY = Math.sin(rotationY)
        const cosX = Math.cos(rotationX)
        const sinX = Math.sin(rotationX)

        const orbitRadius = heartScale * 1.32
        const orbitGradient = context.createLinearGradient(
          centerX - orbitRadius,
          centerY,
          centerX + orbitRadius,
          centerY,
        )
        orbitGradient.addColorStop(0, 'rgba(206,160,255,0)')
        orbitGradient.addColorStop(0.35, 'rgba(255,181,206,0.24)')
        orbitGradient.addColorStop(0.7, 'rgba(255,221,189,0.3)')
        orbitGradient.addColorStop(1, 'rgba(255,181,206,0)')
        context.save()
        context.translate(centerX, centerY + heartScale * 0.02)
        context.rotate(-0.17)
        context.scale(1, 0.29)
        context.globalAlpha = 0.75
        context.strokeStyle = orbitGradient
        context.lineWidth = 0.7
        context.beginPath()
        context.arc(0, 0, orbitRadius, 0, Math.PI * 2)
        context.stroke()
        context.restore()

        const satelliteAngle = time * 0.34 * motion + 0.8
        const satelliteX = Math.cos(satelliteAngle) * orbitRadius
        const satelliteY = Math.sin(satelliteAngle) * orbitRadius * 0.29
        const orbitTilt = -0.17
        const satelliteRotatedX =
          satelliteX * Math.cos(orbitTilt) - satelliteY * Math.sin(orbitTilt)
        const satelliteRotatedY =
          satelliteX * Math.sin(orbitTilt) + satelliteY * Math.cos(orbitTilt)
        context.globalAlpha = 0.85
        context.drawImage(
          sprites[5],
          centerX + satelliteRotatedX - 7,
          centerY + heartScale * 0.02 + satelliteRotatedY - 7,
          14,
          14,
        )

        const coreAssembly = reducedMotion ? 1 : clamp((time - 0.45) / 1.9)
        context.save()
        context.translate(centerX, centerY)
        context.scale(heartScale * heartbeat, heartScale * heartbeat)
        const coreGradient = context.createRadialGradient(0, -0.08, 0, 0, -0.08, 1.2)
        coreGradient.addColorStop(0, 'rgba(255,112,164,0.24)')
        coreGradient.addColorStop(0.48, 'rgba(255,94,155,0.12)')
        coreGradient.addColorStop(1, 'rgba(202,113,255,0.015)')
        context.globalAlpha = coreAssembly * (1 - burstAmount * 0.82)
        context.filter = 'blur(9px)'
        context.fillStyle = coreGradient
        context.beginPath()
        for (let index = 0; index <= 120; index += 1) {
          const angle = (index / 120) * Math.PI * 2
          const x = (16 * Math.sin(angle) ** 3) / 17
          const y =
            -((13 * Math.cos(angle) -
              5 * Math.cos(2 * angle) -
              2 * Math.cos(3 * angle) -
              Math.cos(4 * angle)) /
              17 +
              0.12)
          if (index === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.closePath()
        context.fill()
        context.restore()

        for (const particle of heartParticles) {
          const assembly = reducedMotion
            ? 1
            : clamp((time - particle.delay) / 2.25)
          const easedAssembly = 1 - (1 - assembly) ** 3
          const burst = burstAmount * particle.burst
          const energyWave =
            (0.5 + 0.5 * Math.sin(particle.y * 10 - time * 3.2 + particle.phase * 0.12)) ** 5 * motion
          const driftX =
            Math.sin(time * 0.72 + particle.phase) * 0.006 * motion + energyWave * 0.008
          const driftY = Math.cos(time * 0.64 + particle.phase) * 0.005 * motion
          const targetX =
            particle.x + driftX +
            (particle.x * 1.25 + Math.cos(particle.phase) * 0.7) * burst
          const targetY =
            particle.y + driftY +
            (particle.y * 0.75 + Math.sin(particle.phase) * 0.75) * burst
          const targetZ = particle.z + Math.sin(particle.phase * 2) * 1.7 * burst
          const baseX = particle.startX + (targetX - particle.startX) * easedAssembly
          const baseY = particle.startY + (targetY - particle.startY) * easedAssembly
          const swirl = (1 - easedAssembly) * 2.6 * motion
          let x = baseX * Math.cos(swirl) - baseY * Math.sin(swirl)
          let y = baseX * Math.sin(swirl) + baseY * Math.cos(swirl)
          let z = particle.startZ + (targetZ - particle.startZ) * easedAssembly

          const rotatedX = x * cosY + z * sinY
          const rotatedZ = -x * sinY + z * cosY
          const rotatedY = y * cosX - rotatedZ * sinX
          z = y * sinX + rotatedZ * cosX
          x = rotatedX
          y = rotatedY

          const perspective = 3.8 / (3.8 - z * 0.7)
          const projectedX = centerX + x * heartScale * heartbeat * perspective
          const projectedY =
            centerY - (y + 0.12) * heartScale * heartbeat * perspective
          const twinkle = 0.84 + Math.sin(time * 1.4 + particle.phase) * 0.14 * motion
          const size = particle.size * perspective * (0.95 + twinkle * 0.28) * (1 + energyWave * 0.65)
          context.globalAlpha = clamp(
            easedAssembly * (twinkle * (0.88 + z * 0.16) + energyWave * 0.28),
            0.08,
            1,
          )
          context.drawImage(
            sprites[particle.color],
            projectedX - size / 2,
            projectedY - size / 2,
            size,
            size,
          )
        }

        const burstAge = (now - burstStarted) / 1000
        if (burstAge >= 0 && burstAge < 1.8) {
          context.save()
          context.shadowColor = '#ff9fc2'
          context.shadowBlur = 12
          for (let ring = 0; ring < 3; ring += 1) {
            const ringProgress = clamp((burstAge - ring * 0.13) / 1.35)
            if (ringProgress <= 0) continue
            const radius = heartScale * (0.35 + ringProgress * 1.55)
            context.globalAlpha = (1 - ringProgress) ** 2 * 0.68
            context.strokeStyle = ring % 2 === 0 ? '#ffb1cc' : '#d8b4ff'
            context.lineWidth = 1.8 * (1 - ringProgress) + 0.35
            context.beginPath()
            context.ellipse(centerX, centerY, radius, radius * 0.86, 0, 0, Math.PI * 2)
            context.stroke()
          }
          context.restore()
        }

        const waveBase = height * (isMobile ? 0.685 : 0.715)
        if (!reducedMotion && time > nextAmbientHeartAt) {
          const maxLife = randomBetween(3.8, 5.8)
          fragments.push({
            x: centerX + randomBetween(-heartScale * 0.95, heartScale * 0.95),
            y: waveBase + randomBetween(-5, 22),
            vx: randomBetween(-11, 11),
            vy: randomBetween(-44, -25),
            size: randomBetween(2.2, 4.8),
            life: maxLife,
            maxLife,
            rotation: randomBetween(-0.35, 0.35),
            spin: randomBetween(-0.35, 0.35),
            color: Math.floor(randomBetween(0, 4)),
            isHeart: true,
            ambient: true,
          })
          nextAmbientHeartAt = time + randomBetween(0.45, 0.9)
        }

        for (const particle of waveParticles) {
          const normalizedX = (particle.x + time * particle.speed * motion) % 1
          const x = normalizedX * width
          const wave =
            Math.sin(normalizedX * 9 + time * 0.62 * motion + particle.phase * 0.25) * 14 +
            Math.sin(normalizedX * 19 - time * 0.35 * motion) * 6
          const y = waveBase + wave + particle.offset
          const edgeFade = Math.sin(normalizedX * Math.PI) ** 0.55
          const shimmer = 0.65 + Math.sin(time * 1.2 + particle.phase) * 0.3 * motion
          const size = particle.size * (0.8 + shimmer * 0.3)
          context.globalAlpha = particle.alpha * edgeFade * shimmer
          context.drawImage(
            sprites[particle.color],
            x - size / 2,
            y - size / 2,
            size,
            size,
          )
        }

        if (!reducedMotion && time > nextMeteorAt) {
          meteors.push({
            x: randomBetween(width * 0.35, width * 0.95),
            y: randomBetween(height * 0.06, height * 0.28),
            speed: randomBetween(230, 340),
            born: time,
            duration: randomBetween(0.85, 1.25),
          })
          nextMeteorAt = time + randomBetween(4.5, 8)
        }

        for (let index = meteors.length - 1; index >= 0; index -= 1) {
          const meteor = meteors[index]
          const progress = (time - meteor.born) / meteor.duration
          if (progress >= 1) {
            meteors.splice(index, 1)
            continue
          }
          const distance = (time - meteor.born) * meteor.speed
          const x = meteor.x - distance * 0.82
          const y = meteor.y + distance * 0.48
          const tailX = x + 105
          const tailY = y - 61
          const gradient = context.createLinearGradient(x, y, tailX, tailY)
          gradient.addColorStop(0, 'rgba(255,244,248,0.95)')
          gradient.addColorStop(0.2, 'rgba(255,174,206,0.55)')
          gradient.addColorStop(1, 'rgba(255,174,206,0)')
          context.globalAlpha = Math.sin(progress * Math.PI) * 0.8
          context.strokeStyle = gradient
          context.lineWidth = 1.2
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(tailX, tailY)
          context.stroke()
        }

        for (let index = fragments.length - 1; index >= 0; index -= 1) {
          const fragment = fragments[index]
          fragment.life -= delta
          if (fragment.life <= 0) {
            fragments.splice(index, 1)
            continue
          }
          const ambientSway = fragment.ambient ? Math.sin(time * 1.8 + fragment.rotation) * 8 : 0
          fragment.x += (fragment.vx + ambientSway) * delta
          fragment.y += fragment.vy * delta
          fragment.vy += (fragment.ambient ? -3 : 24) * delta
          fragment.vx *= fragment.ambient ? 0.999 : 0.994
          fragment.rotation += fragment.spin * delta
          const lifeRatio = clamp(fragment.life / fragment.maxLife)
          const alpha = fragment.ambient
            ? lifeRatio * clamp((fragment.maxLife - fragment.life) / 0.6)
            : lifeRatio
          if (fragment.isHeart) {
            drawMiniHeart(context, fragment, alpha)
          } else {
            context.globalAlpha = alpha
            context.drawImage(
              sprites[fragment.color],
              fragment.x - fragment.size,
              fragment.y - fragment.size,
              fragment.size * 2,
              fragment.size * 2,
            )
          }
        }

        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'
        animationFrame = requestAnimationFrame(render)
      }

      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(canvas)
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
      resize()
      previousFrame = performance.now()
      animationFrame = requestAnimationFrame(render)

      return () => {
        cancelAnimationFrame(animationFrame)
        resizeObserver.disconnect()
        window.removeEventListener('pointermove', handlePointerMove)
        bloomRef.current = () => undefined
      }
    }, [])

    const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        bloomRef.current()
      }
    }

    return (
      <canvas
        ref={canvasRef}
        className="heart-canvas"
        role="button"
        tabIndex={0}
        aria-label="轻触爱心，让爱意绽放"
        onClick={() => bloomRef.current()}
        onKeyDown={handleKeyDown}
      />
    )
  },
)

export default HeartScene
