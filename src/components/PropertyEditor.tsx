import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, FileImage, FileText, FileVideo, GripVertical, Image, Map, Play, Plus, Save, Sparkles, Star, Trash2, Upload, Video, X } from 'lucide-react'
import type { MediaAsset, MediaKind, PropertyListing } from '../lib/propertyStore'
import { removeMediaFile, resolveMediaUrl, saveMediaFile } from '../lib/propertyStore'

function formatBytes(size: number) {
  if (!size) return 'Seed media'
  if (size > 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1000))} KB`
}

function MediaPreview({ media, className = '' }: { media: MediaAsset, className?: string }) {
  const [url, setUrl] = useState(media.url || '')
  useEffect(() => {
    let active = true
    let created = ''
    resolveMediaUrl(media).then(next => { if (active) { created = next; setUrl(next) } })
    return () => { active = false; if (created.startsWith('blob:')) URL.revokeObjectURL(created) }
  }, [media])
  if (!url) return <div className={`editor-media-placeholder ${className}`}><Image size={22} /></div>
  if (media.kind === 'video') return <video className={className} src={url} controls muted playsInline />
  if (media.mime === 'application/pdf') return <div className={`editor-pdf-preview ${className}`}><FileText size={28} /><span>PDF floor plan</span></div>
  return <img className={className} src={url} alt={media.name} />
}

const amenityOptions = ['Power Backup', 'Swimming Pool', 'Garden Court', 'Clubhouse', 'Gymnasium', 'Children’s Park', 'EV Charging', 'Security', 'Lift', 'Pet Friendly']
const pipeline = ['Media uploaded', 'Frame extraction', 'Spatial analysis', 'Room detection', '3D reconstruction', 'Twin ready']

export default function PropertyEditor({ initial, onSave, onCancel, onPreview }: { initial: PropertyListing, onSave: (listing: PropertyListing) => void, onCancel: () => void, onPreview: (listing: PropertyListing) => void }) {
  const [draft, setDraft] = useState<PropertyListing>(() => JSON.parse(JSON.stringify(initial)))
  const [tab, setTab] = useState<'details' | 'media' | 'twin'>('details')
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(initial.status === 'processing')
  const videoInput = useRef<HTMLInputElement>(null)
  const photosInput = useRef<HTMLInputElement>(null)
  const floorInput = useRef<HTMLInputElement>(null)

  const update = <K extends keyof PropertyListing>(key: K, value: PropertyListing[K]) => setDraft(old => ({ ...old, [key]: value, updatedAt: new Date().toISOString() }))
  const isValid = Boolean(draft.name && draft.price && draft.area && draft.address && draft.locality && draft.city && draft.photos.length)

  useEffect(() => {
    if (!processing) return
    const timer = window.setInterval(() => setDraft(old => {
      const nextProgress = Math.min(100, old.processingProgress + (old.processingProgress < 52 ? 4 : 2))
      const nextStage = Math.min(5, Math.floor(nextProgress / 19))
      const next = { ...old, status: (nextProgress === 100 ? 'ready' : 'processing') as PropertyListing['status'], processingProgress: nextProgress, processingStage: nextStage, updatedAt: new Date().toISOString() }
      onSave(next)
      if (nextProgress === 100) setProcessing(false)
      return next
    }), 420)
    return () => window.clearInterval(timer)
  }, [processing, onSave])

  const addFiles = async (files: FileList | null, kind: MediaKind) => {
    if (!files?.length) return
    const assets = await Promise.all(Array.from(files).map(file => saveMediaFile(file, kind)))
    if (kind === 'photo') setDraft(old => ({ ...old, photos: [...old.photos, ...assets], coverId: old.coverId || assets[0].id, updatedAt: new Date().toISOString() }))
    if (kind === 'video') setDraft(old => ({ ...old, video: assets[0], processingProgress: 0, processingStage: 0, status: 'draft', updatedAt: new Date().toISOString() }))
    if (kind === 'floorplan') setDraft(old => ({ ...old, floorPlan: assets[0], updatedAt: new Date().toISOString() }))
  }

  const deleteAsset = async (media: MediaAsset) => {
    await removeMediaFile(media)
    if (media.kind === 'photo') setDraft(old => {
      const photos = old.photos.filter(item => item.id !== media.id)
      return { ...old, photos, coverId: old.coverId === media.id ? photos[0]?.id : old.coverId }
    })
    if (media.kind === 'video') update('video', undefined)
    if (media.kind === 'floorplan') update('floorPlan', undefined)
  }

  const movePhoto = (index: number, direction: number) => setDraft(old => {
    const next = [...old.photos]
    const target = index + direction
    if (target < 0 || target >= next.length) return old
    ;[next[index], next[target]] = [next[target], next[index]]
    return { ...old, photos: next, updatedAt: new Date().toISOString() }
  })

  const save = () => {
    if (!isValid) { setTab(draft.photos.length ? 'details' : 'media'); return }
    setSaving(true)
    onSave(draft)
    window.setTimeout(() => setSaving(false), 650)
  }

  const startTwin = () => {
    if (!isValid) { setTab(draft.photos.length ? 'details' : 'media'); return }
    const next = { ...draft, status: 'processing' as const, processingProgress: Math.max(2, draft.processingProgress === 100 ? 2 : draft.processingProgress), processingStage: 0, updatedAt: new Date().toISOString() }
    setDraft(next)
    onSave(next)
    setTab('twin')
    setProcessing(true)
  }

  const completionLabel = useMemo(() => {
    const required = [draft.name, draft.price, draft.area, draft.address, draft.locality, draft.city, draft.photos.length]
    return Math.round((required.filter(Boolean).length / required.length) * 100)
  }, [draft])

  return <main className="property-editor-main">
    <div className="editor-titlebar">
      <div><button onClick={onCancel}><ArrowLeft size={17} /></button><span><small>{initial.name ? 'EDIT LISTING' : 'NEW PROPERTY'}</small><h1>{draft.name || 'Untitled property'}</h1><p>Property ID: <b>{draft.propertyId}</b></p></span></div>
      <div><span className={`editor-status ${draft.status}`}><i />{draft.status === 'ready' ? 'Digital twin live' : draft.status === 'processing' ? `Processing ${draft.processingProgress}%` : 'Draft'}</span><button className="editor-preview" onClick={() => { save(); onPreview(draft) }}>Buyer preview</button><button className="editor-save" onClick={save}><Save size={15} />{saving ? 'Saved' : 'Save changes'}</button></div>
    </div>

    <div className="editor-layout">
      <aside className="editor-sections">
        <div className="completion-ring"><span>{completionLabel}%</span><div><strong>Listing completion</strong><small>Add details and media to publish</small></div></div>
        <nav><button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}><span>01</span><div><strong>Property details</strong><small>Pricing, area and location</small></div><Check size={14} /></button><button className={tab === 'media' ? 'active' : ''} onClick={() => setTab('media')}><span>02</span><div><strong>Media library</strong><small>Video, photos and floor plan</small></div><i>{draft.photos.length + Number(Boolean(draft.video)) + Number(Boolean(draft.floorPlan))}</i></button><button className={tab === 'twin' ? 'active' : ''} onClick={() => setTab('twin')}><span>03</span><div><strong>Digital twin</strong><small>Generate and publish</small></div>{draft.status === 'ready' && <Check size={14} />}</button></nav>
        <div className="editor-tip"><Sparkles size={17} /><div><strong>Property-specific workspace</strong><p>Every update is stored only against <b>{draft.propertyId}</b> and appears instantly in buyer preview.</p></div></div>
      </aside>

      <section className="editor-workspace">
        {tab === 'details' && <>
          <div className="editor-section-head"><div><span>01</span><div><h2>Property information</h2><p>These details appear on the buyer listing and inside the digital twin.</p></div></div><span>Fields marked * are required</span></div>
          <div className="editor-form">
            <label className="span-2"><span>PROPERTY NAME *</span><input value={draft.name} onChange={event => update('name', event.target.value)} placeholder="e.g. Serene Heights · A804" /></label>
            <label><span>PROPERTY TYPE</span><select value={draft.type} onChange={event => update('type', event.target.value)}><option>Apartment</option><option>Villa</option><option>Independent House</option><option>Studio</option></select><ChevronDown size={14} /></label>
            <label><span>BHK *</span><select value={draft.bhk} onChange={event => update('bhk', event.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option><option>5+</option></select><ChevronDown size={14} /></label>
            <label><span>ASKING PRICE *</span><input value={draft.price} onChange={event => update('price', event.target.value)} placeholder="₹2.85 Cr" /></label>
            <label><span>CARPET AREA (SQ.FT) *</span><input value={draft.area} onChange={event => update('area', event.target.value)} placeholder="1,842" /></label>
            <label><span>FLOOR</span><input value={draft.floor} onChange={event => update('floor', event.target.value)} placeholder="8" /></label>
            <label><span>TOTAL FLOORS</span><input value={draft.totalFloors} onChange={event => update('totalFloors', event.target.value)} placeholder="14" /></label>
            <label><span>FACING</span><select value={draft.facing} onChange={event => update('facing', event.target.value)}><option>North</option><option>Northeast</option><option>East</option><option>Southeast</option><option>South</option><option>West</option><option>Northwest</option></select><ChevronDown size={14} /></label>
            <label><span>PARKING</span><input value={draft.parking} onChange={event => update('parking', event.target.value)} placeholder="2 covered bays" /></label>
            <label className="span-2"><span>STREET ADDRESS *</span><input value={draft.address} onChange={event => update('address', event.target.value)} placeholder="Building, street and neighbourhood" /></label>
            <label><span>LOCALITY *</span><input value={draft.locality} onChange={event => update('locality', event.target.value)} placeholder="Indiranagar" /></label>
            <label><span>CITY *</span><input value={draft.city} onChange={event => update('city', event.target.value)} placeholder="Bengaluru" /></label>
            <label><span>PINCODE</span><input value={draft.pincode} onChange={event => update('pincode', event.target.value)} placeholder="560038" /></label>
            <label><span>MAINTENANCE</span><input value={draft.maintenance} onChange={event => update('maintenance', event.target.value)} placeholder="₹8,500 / month" /></label>
          </div>
          <div className="amenity-editor"><h3>Amenities</h3><p>Select all that apply. Buyers see these exact values.</p><div>{amenityOptions.map(item => <button key={item} className={draft.amenities.includes(item) ? 'selected' : ''} onClick={() => update('amenities', draft.amenities.includes(item) ? draft.amenities.filter(value => value !== item) : [...draft.amenities, item])}><span>{draft.amenities.includes(item) && <Check size={11} />}</span>{item}</button>)}</div></div>
          <div className="editor-next"><span><Check size={14} /> Changes persist automatically when saved.</span><button onClick={() => { save(); setTab('media') }}>Save & continue to media <ArrowRight size={15} /></button></div>
        </>}

        {tab === 'media' && <>
          <div className="editor-section-head"><div><span>02</span><div><h2>Property media library</h2><p>Uploaded files are stored against this property and are used in buyer pages and the twin.</p></div></div><span>Actual uploaded media</span></div>
          <input ref={videoInput} hidden type="file" accept="video/mp4,video/quicktime,video/webm" onChange={event => addFiles(event.target.files, 'video')} />
          <input ref={photosInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={event => addFiles(event.target.files, 'photo')} />
          <input ref={floorInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,.pdf" onChange={event => addFiles(event.target.files, 'floorplan')} />
          <div className="media-block"><div className="media-block-head"><div><Video size={18} /><span><strong>Walkthrough video</strong><small>MP4, MOV or WebM · up to 2 GB</small></span></div><button onClick={() => videoInput.current?.click()}>{draft.video ? 'Replace video' : <><Plus size={13} /> Add video</>}</button></div>{draft.video ? <div className="video-manager"><MediaPreview media={draft.video} /><div><FileVideo size={18} /><span><strong>{draft.video.name}</strong><small>{formatBytes(draft.video.size)} · Source walkthrough</small></span><i><Check size={12} /> USED BY TWIN</i><button onClick={() => deleteAsset(draft.video!)}><Trash2 size={15} /></button></div></div> : <button className="media-empty" onClick={() => videoInput.current?.click()}><Upload size={23} /><strong>Upload the actual property walkthrough</strong><span>This video is retained and available inside the buyer experience.</span></button>}</div>
          <div className="media-block"><div className="media-block-head"><div><Image size={18} /><span><strong>Property photos</strong><small>JPG, PNG, WebP or HEIC · first image is cover by default</small></span></div><button onClick={() => photosInput.current?.click()}><Plus size={13} /> Add photos</button></div>{draft.photos.length ? <div className="photo-manager">{draft.photos.map((media, index) => <article key={media.id} className={draft.coverId === media.id ? 'cover' : ''}><div className="photo-drag"><GripVertical size={14} /><span>{index + 1}</span></div><MediaPreview media={media} /><div className="photo-meta"><span><strong>{media.name}</strong><small>{formatBytes(media.size)}</small></span>{draft.coverId === media.id ? <i><Star size={11} fill="currentColor" /> COVER</i> : <button onClick={() => update('coverId', media.id)}>Set as cover</button>}</div><div className="photo-actions"><button disabled={index === 0} onClick={() => movePhoto(index, -1)}><ChevronLeft size={14} /></button><button disabled={index === draft.photos.length - 1} onClick={() => movePhoto(index, 1)}><ChevronRight size={14} /></button><button onClick={() => deleteAsset(media)}><Trash2 size={14} /></button></div></article>)}</div> : <button className="media-empty" onClick={() => photosInput.current?.click()}><FileImage size={23} /><strong>Add room-by-room property photos</strong><span>These become navigable scene positions in the digital twin.</span></button>}</div>
          <div className="media-block"><div className="media-block-head"><div><Map size={18} /><span><strong>Floor plan / sketch</strong><small>JPG, PNG, WebP, SVG or PDF</small></span></div><button onClick={() => floorInput.current?.click()}>{draft.floorPlan ? 'Replace plan' : <><Plus size={13} /> Add plan</>}</button></div>{draft.floorPlan ? <div className="floorplan-manager"><MediaPreview media={draft.floorPlan} /><span><FileText size={18} /><span><strong>{draft.floorPlan.name}</strong><small>{formatBytes(draft.floorPlan.size)} · Visible to buyers</small></span></span><button onClick={() => deleteAsset(draft.floorPlan!)}><Trash2 size={15} /></button></div> : <button className="media-empty compact" onClick={() => floorInput.current?.click()}><Upload size={20} /><strong>Upload floor plan or hand-drawn sketch</strong></button>}</div>
          <div className="editor-next"><span><Check size={14} /> {draft.photos.length} photos · {draft.video ? 'video ready' : 'no video'} · {draft.floorPlan ? 'plan ready' : 'no plan'}</span><button onClick={() => { save(); setTab('twin') }}>Continue to generation <ArrowRight size={15} /></button></div>
        </>}

        {tab === 'twin' && <>
          <div className="editor-section-head"><div><span>03</span><div><h2>Generate property digital twin</h2><p>PropertyLens uses only the media attached to {draft.propertyId}.</p></div></div><span>Property-specific pipeline</span></div>
          <div className="generation-source"><div><Sparkles size={21} /><span><small>AI INPUT SET</small><strong>{draft.name || 'Untitled listing'}</strong><p>{draft.video ? `Walkthrough: ${draft.video.name}` : 'Photos-only reconstruction'} · {draft.photos.length} property photos · {draft.floorPlan ? 'floor plan included' : 'no floor plan'}</p></span></div><button onClick={() => setTab('media')}>Manage source media</button></div>
          <div className="full-pipeline">{pipeline.map((label, index) => <div className={draft.processingStage > index || draft.status === 'ready' ? 'complete' : draft.processingStage === index && processing ? 'current' : ''} key={label}><span>{draft.processingStage > index || draft.status === 'ready' ? <Check size={16} /> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? 'Files validated and linked' : index === 1 ? 'Extracting spatial keyframes' : index === 2 ? 'Understanding depth and surfaces' : index === 3 ? 'Connecting rooms and navigation points' : index === 4 ? 'Building walkable scene graph' : 'Ready for buyer preview'}</small></div>{draft.processingStage === index && processing && <i>PROCESSING</i>}</div>)}</div>
          <div className="generation-progress"><div><span>{draft.status === 'ready' ? 'Digital twin ready' : processing ? 'AI reconstruction in progress' : 'Ready to generate'}</span><strong>{draft.processingProgress}%</strong></div><div><span style={{ width: `${draft.processingProgress}%` }} /></div><p>{draft.status === 'ready' ? 'The buyer experience is live and uses this listing’s uploaded media.' : 'You can leave this page. Progress and media remain saved to this listing.'}</p></div>
          <div className="generate-actions">{draft.status === 'ready' && <button className="open-preview" onClick={() => onPreview(draft)}><Play size={15} fill="currentColor" /> Open generated twin</button>}<button className="generate-twin" disabled={processing || !isValid} onClick={startTwin}>{processing ? <><span className="small-spinner" /> Generating {draft.processingProgress}%</> : <><Sparkles size={15} /> {draft.status === 'ready' ? 'Regenerate Digital Twin' : 'Generate Digital Twin'}</>}</button></div>
          {!isValid && <div className="editor-validation"><X size={15} /><span>Add all required property details and at least one property photo before generating.</span></div>}
        </>}
      </section>
    </div>
  </main>
}
