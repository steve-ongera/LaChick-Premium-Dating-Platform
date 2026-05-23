/**
 * components/PhotoUpload.jsx
 * Full photo gallery manager for a user's profile.
 *
 * Features:
 * - Drag-and-drop + click-to-upload
 * - Preview before upload
 * - Set primary photo
 * - Delete photos
 * - Upload progress indicator
 * - Package-gate warning (requires active paid package for men)
 *
 * Usage:
 *   <PhotoUpload />
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { uploadPhoto, deletePhoto, getMe } from '../utils/api'
import { useAuth } from '../App'

const MAX_FILE_SIZE_MB = 5
const ACCEPTED_TYPES   = ['image/jpeg', 'image/png', 'image/webp']

export default function PhotoUpload() {
  const { user }                       = useAuth()
  const [photos, setPhotos]            = useState([])
  const [previews, setPreviews]        = useState([])   // files staged for upload
  const [uploading, setUploading]      = useState(false)
  const [progress, setProgress]        = useState(0)
  const [error, setError]              = useState('')
  const [success, setSuccess]          = useState('')
  const [dragging, setDragging]        = useState(false)
  const fileInputRef                   = useRef()

  // Load existing photos from profile
  useEffect(() => {
    getMe()
      .then(data => setPhotos(data.photos || []))
      .catch(() => {})
  }, [])

  // ── Drag & Drop handlers ───────────────────────────────────

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    stageFiles(files)
  }, [])

  const onFileChange = (e) => {
    const files = Array.from(e.target.files)
    stageFiles(files)
    e.target.value = ''   // reset so same file can be re-selected
  }

  // ── File validation & staging ──────────────────────────────

  const stageFiles = (files) => {
    setError('')
    const valid = []

    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported format. Use JPG, PNG, or WebP.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB.`)
        continue
      }
      valid.push({
        file,
        id      : crypto.randomUUID(),
        preview : URL.createObjectURL(file),
        caption : '',
      })
    }

    setPreviews(prev => [...prev, ...valid])
  }

  const removePreview = (id) => {
    setPreviews(prev => {
      const item = prev.find(p => p.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(p => p.id !== id)
    })
  }

  const updateCaption = (id, caption) => {
    setPreviews(prev => prev.map(p => p.id === id ? { ...p, caption } : p))
  }

  // ── Upload ─────────────────────────────────────────────────

  const handleUpload = async () => {
    if (previews.length === 0) return
    setUploading(true)
    setError('')
    setSuccess('')
    setProgress(0)

    const uploaded = []
    const failed   = []

    for (let i = 0; i < previews.length; i++) {
      const { file, caption } = previews[i]
      const fd = new FormData()
      fd.append('image', file)
      if (caption) fd.append('caption', caption)

      try {
        const photo = await uploadPhoto(fd)
        uploaded.push(photo)
      } catch (err) {
        failed.push(file.name)
      }

      setProgress(Math.round(((i + 1) / previews.length) * 100))
    }

    // Clear staged previews
    previews.forEach(p => URL.revokeObjectURL(p.preview))
    setPreviews([])
    setUploading(false)
    setProgress(0)

    if (uploaded.length > 0) {
      setPhotos(prev => [...prev, ...uploaded])
      setSuccess(`${uploaded.length} photo${uploaded.length > 1 ? 's' : ''} uploaded successfully!`)
    }
    if (failed.length > 0) {
      setError(`Failed to upload: ${failed.join(', ')}`)
    }
  }

  // ── Delete ─────────────────────────────────────────────────

  const handleDelete = async (photoId) => {
    if (!window.confirm('Remove this photo?')) return
    try {
      await deletePhoto(photoId)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      setSuccess('Photo removed.')
    } catch (_) {
      setError('Could not delete photo. Try again.')
    }
  }

  // ── Check can upload ───────────────────────────────────────

  const canUpload = user?.gender === 'female' || (
    user?.profile?.package_tier !== 'free' && user?.profile?.is_package_active
  )

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.sectionTitle}>
        <i className="bi bi-images" /> Photo Gallery
      </h3>

      {/* Package gate warning */}
      {!canUpload && (
        <div className="lc-alert lc-alert-info" style={{ marginBottom: '1.2rem' }}>
          <i className="bi bi-lock" />
          {' '}Upgrade to a paid package to upload photos and be visible to women.
          <a href="/packages" style={{ marginLeft: '.4rem', fontWeight: 500 }}>View packages →</a>
        </div>
      )}

      {/* Feedback */}
      {error   && <div className="lc-alert lc-alert-error"  style={{ marginBottom: '1rem' }}><i className="bi bi-exclamation-circle" /> {error}</div>}
      {success && <div className="lc-alert lc-alert-success" style={{ marginBottom: '1rem' }}><i className="bi bi-check-circle" /> {success}</div>}

      {/* Drop zone */}
      <div
        style={{
          ...styles.dropzone,
          ...(dragging ? styles.dropzoneActive : {}),
          ...(canUpload ? {} : styles.dropzoneDisabled),
        }}
        onDragOver={canUpload ? onDragOver : undefined}
        onDragLeave={canUpload ? onDragLeave : undefined}
        onDrop={canUpload ? onDrop : undefined}
        onClick={canUpload ? () => fileInputRef.current?.click() : undefined}
        role={canUpload ? 'button' : undefined}
        tabIndex={canUpload ? 0 : undefined}
        onKeyDown={canUpload ? (e) => { if (e.key === 'Enter') fileInputRef.current?.click() } : undefined}
        aria-label="Upload photos"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          style={{ display: 'none' }}
          onChange={onFileChange}
          disabled={!canUpload}
        />

        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <i
            className={`bi ${dragging ? 'bi-cloud-arrow-down-fill' : 'bi-camera-fill'}`}
            style={{ fontSize: '2.2rem', color: dragging ? '#C4516A' : '#C4B8C0', display: 'block', marginBottom: '.6rem', transition: 'color .2s' }}
          />
          <p style={{ fontWeight: 500, color: '#3B3540', margin: 0 }}>
            {dragging ? 'Drop your photos here' : 'Drag & drop photos here'}
          </p>
          <p style={{ fontSize: '.78rem', color: '#887F8A', marginTop: '.2rem' }}>
            or <span style={{ color: '#C4516A', fontWeight: 500 }}>click to browse</span>
            {' '}— JPG, PNG, WebP up to {MAX_FILE_SIZE_MB}MB each
          </p>
        </div>
      </div>

      {/* Staged previews */}
      {previews.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={styles.sectionLabel}>
            Ready to upload ({previews.length})
          </div>
          <div style={styles.previewGrid}>
            {previews.map(p => (
              <div key={p.id} style={styles.previewCard}>
                <div style={styles.previewImgWrap}>
                  <img src={p.preview} alt="preview" style={styles.previewImg} />
                  <button
                    onClick={() => removePreview(p.id)}
                    style={styles.removeBtn}
                    title="Remove"
                  >
                    <i className="bi bi-x" />
                  </button>
                </div>
                <input
                  className="lc-input"
                  style={{ fontSize: '.78rem', padding: '.4rem .6rem', marginTop: '.4rem' }}
                  placeholder="Caption (optional)"
                  value={p.caption}
                  onChange={e => updateCaption(p.id, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div style={styles.progressWrap}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
              <span style={styles.progressLabel}>{progress}%</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
            <button
              className="lc-btn lc-btn-primary"
              onClick={handleUpload}
              disabled={uploading}
              style={{ minWidth: 130 }}
            >
              {uploading
                ? <><span className="lc-spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Uploading…</>
                : <><i className="bi bi-cloud-upload" /> Upload {previews.length} Photo{previews.length > 1 ? 's' : ''}</>
              }
            </button>
            <button
              className="lc-btn lc-btn-ghost"
              onClick={() => { previews.forEach(p => URL.revokeObjectURL(p.preview)); setPreviews([]) }}
              disabled={uploading}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Existing gallery */}
      {photos.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div style={styles.sectionLabel}>
            Your Photos ({photos.length})
          </div>
          <div style={styles.galleryGrid}>
            {photos.map((photo, idx) => (
              <div key={photo.id} style={styles.galleryCard}>
                <img
                  src={photo.image_url || photo.image}
                  alt={photo.caption || `Photo ${idx + 1}`}
                  style={styles.galleryImg}
                  loading="lazy"
                />

                {/* Primary badge */}
                {photo.is_primary && (
                  <div style={styles.primaryBadge}>
                    <i className="bi bi-star-fill" /> Primary
                  </div>
                )}

                {/* Caption overlay */}
                {photo.caption && (
                  <div style={styles.captionOverlay}>{photo.caption}</div>
                )}

                {/* Actions */}
                <div style={styles.galleryActions}>
                  <button
                    style={{ ...styles.actionBtn, color: '#C4516A' }}
                    title="Delete photo"
                    onClick={() => handleDelete(photo.id)}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && previews.length === 0 && (
        <div style={styles.emptyState}>
          <i className="bi bi-image" style={{ fontSize: '2.5rem', color: '#C4B8C0', display: 'block', marginBottom: '.75rem' }} />
          <p style={{ color: '#887F8A', margin: 0 }}>No photos yet. Upload some to attract more attention!</p>
        </div>
      )}
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────

const styles = {
  wrapper: {
    width: '100%',
  },
  sectionTitle: {
    fontFamily  : "'Cormorant Garamond', serif",
    fontSize    : '1.3rem',
    fontWeight  : 400,
    marginBottom: '1rem',
    display     : 'flex',
    alignItems  : 'center',
    gap         : '.4rem',
    color       : '#1C1A1E',
  },
  sectionLabel: {
    fontSize      : '.72rem',
    fontWeight    : 600,
    color         : '#887F8A',
    textTransform : 'uppercase',
    letterSpacing : '.06em',
    marginBottom  : '.75rem',
  },
  dropzone: {
    border      : '2px dashed #E5DDD8',
    borderRadius: 16,
    padding     : '2.5rem 1.5rem',
    cursor      : 'pointer',
    transition  : 'all .2s ease',
    background  : '#FDFAF8',
    userSelect  : 'none',
  },
  dropzoneActive: {
    borderColor : '#C4516A',
    background  : '#FFF5F7',
    transform   : 'scale(1.01)',
  },
  dropzoneDisabled: {
    opacity : .5,
    cursor  : 'not-allowed',
  },
  previewGrid: {
    display              : 'grid',
    gridTemplateColumns  : 'repeat(auto-fill, minmax(130px, 1fr))',
    gap                  : '.75rem',
  },
  previewCard: {
    display       : 'flex',
    flexDirection : 'column',
  },
  previewImgWrap: {
    position     : 'relative',
    borderRadius : 10,
    overflow     : 'hidden',
    aspectRatio  : '1',
    background   : '#F0E8DE',
  },
  previewImg: {
    width     : '100%',
    height    : '100%',
    objectFit : 'cover',
    display   : 'block',
  },
  removeBtn: {
    position  : 'absolute',
    top       : 4,
    right     : 4,
    background: 'rgba(28,26,30,.65)',
    border    : 'none',
    color     : 'white',
    width     : 24,
    height    : 24,
    borderRadius: '50%',
    cursor    : 'pointer',
    display   : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize  : '.9rem',
    lineHeight: 1,
    padding   : 0,
  },
  progressWrap: {
    position    : 'relative',
    background  : '#F0E8DE',
    borderRadius: 8,
    height      : 8,
    marginTop   : '1rem',
    overflow    : 'hidden',
  },
  progressBar: {
    position      : 'absolute',
    inset         : 0,
    right         : 'auto',
    background    : 'linear-gradient(90deg, #C4516A, #E8899A)',
    borderRadius  : 8,
    transition    : 'width .3s ease',
  },
  progressLabel: {
    position  : 'absolute',
    right     : 0,
    top       : -20,
    fontSize  : '.72rem',
    color     : '#887F8A',
  },
  galleryGrid: {
    display             : 'grid',
    gridTemplateColumns : 'repeat(auto-fill, minmax(140px, 1fr))',
    gap                 : '.75rem',
  },
  galleryCard: {
    position    : 'relative',
    borderRadius: 12,
    overflow    : 'hidden',
    aspectRatio : '1',
    background  : '#F0E8DE',
  },
  galleryImg: {
    width     : '100%',
    height    : '100%',
    objectFit : 'cover',
    display   : 'block',
    transition: 'transform .25s',
  },
  primaryBadge: {
    position   : 'absolute',
    top        : 6,
    left       : 6,
    background : 'rgba(201,168,76,.9)',
    color      : '#1C1A1E',
    fontSize   : '.65rem',
    fontWeight : 700,
    padding    : '.15rem .5rem',
    borderRadius: 20,
    display    : 'flex',
    alignItems : 'center',
    gap        : '.25rem',
    letterSpacing: '.04em',
  },
  captionOverlay: {
    position   : 'absolute',
    bottom     : 0,
    left       : 0,
    right      : 0,
    background : 'linear-gradient(transparent, rgba(28,26,30,.7))',
    color      : 'white',
    fontSize   : '.72rem',
    padding    : '1rem .6rem .5rem',
    whiteSpace : 'nowrap',
    overflow   : 'hidden',
    textOverflow: 'ellipsis',
  },
  galleryActions: {
    position       : 'absolute',
    top            : 6,
    right          : 6,
    display        : 'flex',
    gap            : '.3rem',
    opacity        : 0,
    transition     : 'opacity .2s',
    // Show on parent hover via CSS in main.css would be cleaner;
    // here we use onMouseEnter/Leave on the card instead (see below)
  },
  actionBtn: {
    background   : 'rgba(255,255,255,.88)',
    border       : 'none',
    borderRadius : '50%',
    width        : 28,
    height       : 28,
    cursor       : 'pointer',
    display      : 'flex',
    alignItems   : 'center',
    justifyContent: 'center',
    fontSize     : '.85rem',
    transition   : 'background .15s',
    backdropFilter: 'blur(4px)',
  },
  emptyState: {
    textAlign : 'center',
    padding   : '2.5rem 1rem',
    marginTop : '1rem',
  },
}