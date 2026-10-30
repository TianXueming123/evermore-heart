import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Heart,
  Maximize2,
  Minimize2,
  PenLine,
  Sparkles,
  X,
} from 'lucide-react'
import HeartScene, {
  type HeartSceneHandle,
} from '../components/HeartScene'
import '../App.css'

type LoveLetter = {
  recipient: string
  message: string
  signature: string
}

const DEFAULT_LETTER: LoveLetter = {
  recipient: '',
  message: '穷极一生，只为找到一双为我流泪的眼睛，和永不放开的手。',
  signature: '',
}

export default function Home() {
  const sceneRef = useRef<HeartSceneHandle>(null)
  const [letter, setLetter] = useState<LoveLetter>(DEFAULT_LETTER)
  const [draft, setDraft] = useState<LoveLetter>(DEFAULT_LETTER)
  const [isEditing, setIsEditing] = useState(false)
  const [hasBloomed, setHasBloomed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleBurst = useCallback(() => {
    setHasBloomed(true)
  }, [])

  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreen)
    return () => document.removeEventListener('fullscreenchange', handleFullscreen)
  }, [])

  useEffect(() => {
    if (!isEditing) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsEditing(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isEditing])

  const openEditor = () => {
    setDraft(letter)
    setIsEditing(true)
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen can be unavailable inside an embedded preview.
    }
  }

  return (
    <div className="experience">
      <div className="nebula nebula-left" />
      <div className="nebula nebula-right" />
      <HeartScene ref={sceneRef} onBurst={handleBurst} />
      <div className="vignette" />
      <div className="grain" />

      <header className="topbar">
        <div className="brand" aria-label="心动宇宙 Evermore">
          <span className="brand-mark">
            <Heart size={16} strokeWidth={1.5} />
            <i />
          </span>
          <span className="brand-copy">
            <strong>心动宇宙</strong>
            <small>EVERMORE</small>
          </span>
        </div>
        <div className="topbar-actions">
          <button className="glass-button edit-button" onClick={openEditor}>
            <PenLine size={15} />
            <span>写下心意</span>
          </button>
          <button
            className="glass-button icon-button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </header>

      <main className="love-content">
        <section className="hero-heading" aria-labelledby="page-title">
          <div className="eyebrow">
            <span />
            A LOVE LETTER WRITTEN IN STARLIGHT
            <span />
          </div>
          <h1 id="page-title">
            以星河为墨，写一颗<em>爱你的心</em>
          </h1>
          <p>每一粒星光，都在替我诉说爱意</p>
        </section>

        <section className="love-letter" aria-label="告白情书">
          <div className={`bloom-message ${hasBloomed ? 'is-visible' : ''}`} aria-live="polite">
            <Sparkles size={13} />
            遇见你，是我宇宙里最温柔的幸运
            <Sparkles size={13} />
          </div>
          <p className="recipient">
            TO：{letter.recipient.trim() || '轩宝宝~'}
          </p>
          <blockquote>“{letter.message}”</blockquote>
          {letter.signature.trim() && (
            <p className="signature">—— {letter.signature}</p>
          )}
          <button className="bloom-button" onClick={() => sceneRef.current?.bloom()}>
            <Heart size={14} fill="currentColor" />
            <span>{hasBloomed ? '再一次，为你心动' : '轻触爱心，让浪漫绽放'}</span>
            <span className="button-shine" />
          </button>
        </section>
      </main>

      <div className="corner-note corner-note-left">EVERY HEARTBEAT IS A LOVE LETTER</div>
      <div className="corner-note corner-note-right">FOREVER · AND ALWAYS</div>

      {isEditing && (
        <div
          className="editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsEditing(false)
          }}
        >
          <section
            className="letter-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <button
              className="editor-close"
              onClick={() => setIsEditing(false)}
              aria-label="关闭编辑"
            >
              <X size={18} />
            </button>
            <div className="editor-icon"><PenLine size={19} /></div>
            <p className="editor-kicker">MAKE IT YOURS</p>
            <h2 id="editor-title">把心意，写成专属浪漫</h2>
            <p className="editor-description">每一句未说出口的喜欢，都值得被认真收藏。</p>

            <label className="field-label">
              <span>想送给谁</span>
              <input
                autoFocus
                value={draft.recipient}
                maxLength={16}
                placeholder="对方的名字或昵称"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, recipient: event.target.value }))
                }
              />
            </label>
            <label className="field-label">
              <span>浪漫告白</span>
              <textarea
                value={draft.message}
                maxLength={90}
                rows={3}
                placeholder="写下你想说的话"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, message: event.target.value }))
                }
              />
              <small>{draft.message.length} / 90</small>
            </label>
            <label className="field-label">
              <span>你的署名</span>
              <input
                value={draft.signature}
                maxLength={16}
                placeholder="爱你的人"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, signature: event.target.value }))
                }
              />
            </label>

            <button
              className="save-letter"
              disabled={!draft.message.trim()}
              onClick={() => {
                setLetter({ ...draft, message: draft.message.trim() })
                setIsEditing(false)
              }}
            >
              <Check size={16} />
              保存这份心意
            </button>
            <button
              className="reset-letter"
              onClick={() => setDraft(DEFAULT_LETTER)}
            >
              恢复原文
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
