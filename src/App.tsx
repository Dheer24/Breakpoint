import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BedDouble,
  Bell,
  Box,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleParking,
  Clock3,
  Code2,
  Compass,
  Eye,
  FileVideo,
  Footprints,
  Home,
  Image,
  Lightbulb,
  LocateFixed,
  Map,
  MapPin,
  Maximize2,
  Menu,
  MoreHorizontal,
  MousePointer2,
  Move3D,
  Navigation,
  Play,
  Plus,
  Ruler,
  Search,
  Share2,
  Sparkles,
  SquareStack,
  TrainFront,
  Trees,
  Video,
  Waves,
  X,
  Zap,
} from 'lucide-react'
import PropertyEditor from './components/PropertyEditor'
import {
  coverAsset,
  createEmptyListing,
  displayPrice,
  loadListings,
  persistListings,
  resolveMediaUrl,
  type MediaAsset,
  type PropertyListing,
} from './lib/propertyStore'

type Page = 'discover' | 'property' | 'twin' | 'upload' | 'dashboard' | 'listings' | 'analytics'
type Navigate = (page: Page, propertyId?: string) => void

function useMediaUrl(media?: MediaAsset) {
  const [url, setUrl] = useState(media?.url || '')
  useEffect(() => {
    let active = true
    let created = ''
    if (!media) {
      queueMicrotask(() => { if (active) setUrl('') })
      return () => { active = false }
    }
    resolveMediaUrl(media).then(next => { if (active) { created = next; setUrl(next) } })
    return () => { active = false; if (created.startsWith('blob:')) URL.revokeObjectURL(created) }
  }, [media])
  return url
}

function useResolvedPropertyMedia(property: PropertyListing) {
  const [media, setMedia] = useState({ photos: [] as string[], video: '', floorPlan: '' })
  useEffect(() => {
    let active = true
    const created: string[] = []
    Promise.all([
      Promise.all(property.photos.map(resolveMediaUrl)),
      resolveMediaUrl(property.video),
      resolveMediaUrl(property.floorPlan),
    ]).then(([photos, video, floorPlan]) => {
      if (!active) return
      created.push(...photos, video, floorPlan)
      setMedia({ photos: photos.filter(Boolean), video, floorPlan })
    })
    return () => { active = false; created.filter(url => url.startsWith('blob:')).forEach(url => URL.revokeObjectURL(url)) }
  }, [property])
  return media
}

function AssetImage({ media, alt, fallback = '/images/living-room.jpg' }: { media?: MediaAsset, alt: string, fallback?: string }) {
  const url = useMediaUrl(media)
  return <img src={url || fallback} alt={alt} />
}

function FloorPlanMedia({ media }: { media?: MediaAsset }) {
  const url = useMediaUrl(media)
  if (!media || !url) return <FloorPlan />
  if (media.mime === 'application/pdf') return <object className="uploaded-floorplan" data={url} type="application/pdf"><a href={url} target="_blank">Open uploaded floor plan</a></object>
  return <div className="uploaded-floorplan-image"><img src={url} alt={`Uploaded floor plan: ${media.name}`} /><span><Check size={13} /> Broker uploaded floor plan</span></div>
}

const rooms = [
  { name: 'Living Room', image: '/images/living-room.jpg', dimensions: '18′ 6″ × 12′ 4″' },
  { name: 'Kitchen', image: '/images/kitchen.jpg', dimensions: '11′ 2″ × 9′ 8″' },
  { name: 'Master Bedroom', image: '/images/bedroom.jpg', dimensions: '14′ 8″ × 12′ 2″' },
  { name: 'Balcony', image: '/images/living-room.jpg', dimensions: '10′ 4″ × 5′ 6″' },
]

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`logo-lockup ${inverse ? 'inverse' : ''}`}>
      <div className="logo-mark"><Box size={19} strokeWidth={1.8} /></div>
      <span>Property<span>Lens</span></span>
    </div>
  )
}

function Header({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <header className="main-header">
      <button className="plain-button" onClick={() => onNavigate('discover')} aria-label="PropertyLens home"><Logo /></button>
      <nav className="main-nav">
        <button onClick={() => onNavigate('discover')}>Explore Properties</button>
        <button onClick={() => { onNavigate('discover'); setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 50) }}>How It Works</button>
        <button onClick={() => onNavigate('dashboard')}>For Brokers</button>
      </nav>
      <div className="header-actions">
        <button className="sign-in" onClick={() => onNavigate('dashboard')}>Sign In</button>
        <button className="header-cta" onClick={() => onNavigate('upload')}><Video size={16} /> Create a digital twin</button>
        <button className="mobile-menu" aria-label="Open menu"><Menu size={22} /></button>
      </div>
    </header>
  )
}

function AiBadge() {
  return <div className="ai-badge"><span className="ai-pulse" /><Sparkles size={13} /> AI Digital Twin Available</div>
}

function PropertyCard({ property, onOpen, index }: { property: PropertyListing, onOpen: () => void, index: number }) {
  const coverUrl = useMediaUrl(coverAsset(property))
  return (
    <motion.article
      className="property-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * .08 }}
    >
      <div className="property-image" onClick={onOpen} role="button" tabIndex={0} aria-label={`Open ${property.name}`} onKeyDown={event => event.key === 'Enter' && onOpen()}>
        <img src={coverUrl || '/images/living-room.jpg'} alt={`${property.name} property`} />
        <div className="image-topline"><AiBadge /><button className="save-property" aria-label="Save property" onClick={event => event.stopPropagation()}>♡</button></div>
        <div className="tour-chip"><Move3D size={14} /> Interactive 3D tour</div>
      </div>
      <div className="property-copy">
        <div className="property-title-row">
          <div><p>{property.status === 'ready' ? 'Digital twin ready' : property.status}</p><h3>{property.name}</h3></div>
          <strong>{displayPrice(property.price)}</strong>
        </div>
        <div className="property-location"><MapPin size={14} />{property.locality}, {property.city}</div>
        <div className="property-meta">
          <span><BedDouble size={15} /> {property.bhk} BHK</span>
          <span><SquareStack size={15} /> {property.area} sq.ft</span>
          <span><Compass size={15} /> {property.facing}</span>
        </div>
        <button className="explore-button" onClick={onOpen}><span>Explore in 3D</span><ArrowRight size={17} /></button>
      </div>
    </motion.article>
  )
}

function Landing({ onNavigate, listings }: { onNavigate: Navigate, listings: PropertyListing[] }) {
  const [query, setQuery] = useState('')
  const featured = listings[0]
  const visibleListings = listings.filter(item => `${item.name} ${item.locality} ${item.city}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="page landing-page">
      <Header onNavigate={onNavigate} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span /> AI-powered property exploration</div>
            <h1>Don’t just see the property.<br /><em>Experience it.</em></h1>
            <p>Step inside verified homes from anywhere. Walk every room, measure any space, and uncover intelligent insights—before you plan a visit.</p>
            <div className="hero-trust">
              <div className="avatar-stack"><span>MK</span><span>AN</span><span>RS</span></div>
              <div><strong>4.9</strong> <span className="stars">★★★★★</span><small>Trusted by 2,400+ home seekers</small></div>
            </div>
          </div>
          <div className="hero-visual">
            <AssetImage media={featured ? coverAsset(featured) : undefined} alt="Immersive property digital twin" />
            <div className="hero-visual-shade" />
            <div className="hero-visual-top"><AiBadge /><span>Live twin · {featured?.name || 'PropertyLens'}</span></div>
            <button className="play-tour" onClick={() => featured && onNavigate('twin', featured.propertyId)}><span><Play size={18} fill="currentColor" /></span><div><small>STEP INSIDE</small><strong>Launch 3D Experience</strong></div></button>
            <div className="hero-room-pill"><LocateFixed size={14} /> Living Room <span>1 / 7</span></div>
            <div className="hero-info-tag"><Lightbulb size={15} /><span><small>LIGHT ANALYSIS</small>Excellent natural light</span></div>
          </div>
          <div className="search-panel">
            <div className="search-field wide"><MapPin size={20} /><div><label>LOCATION / SOCIETY / AREA</label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Indiranagar, Whitefield..." /></div></div>
            <div className="search-field"><Building2 size={20} /><div><label>PROPERTY TYPE</label><button>Apartment <ChevronDown size={15} /></button></div></div>
            <div className="search-field"><span className="bhk-icon">3</span><div><label>CONFIGURATION</label><button>2–4 BHK <ChevronDown size={15} /></button></div></div>
            <button className="search-button" onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}><Search size={19} /> Explore homes</button>
          </div>
        </section>

        <section className="properties-section content-width" id="properties">
          <div className="section-heading">
            <div><div className="eyebrow"><span /> Immersive listings</div><h2>Homes you can step into, <em>right now.</em></h2></div>
            <button className="text-link" onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}>View all properties <ArrowRight size={16} /></button>
          </div>
          <div className="property-grid">
            {visibleListings.map((property, index) => <PropertyCard property={property} index={index} key={property.propertyId} onOpen={() => onNavigate('property', property.propertyId)} />)}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="content-width how-grid">
            <div className="how-copy">
              <div className="eyebrow light"><span /> Beyond photographs</div>
              <h2>A true sense of space,<br />before the first visit.</h2>
              <p>PropertyLens uses computer vision to turn a simple property walkthrough video into an intelligent, navigable spatial experience.</p>
              <button className="cream-button" onClick={() => featured && onNavigate('twin', featured.propertyId)}>Experience a digital twin <ArrowRight size={17} /></button>
            </div>
            <div className="steps-list">
              {[
                ['01', 'Walk through naturally', 'A broker records a simple smartphone video—no specialist camera or equipment required.', Video],
                ['02', 'AI reconstructs every room', 'Our spatial AI understands surfaces, depth, dimensions, light, and room relationships.', Sparkles],
                ['03', 'You step inside from anywhere', 'Navigate, measure, compare, and make a more confident property decision.', Footprints],
              ].map(([number, title, copy, Icon]) => (
                <div className="how-step" key={String(number)}>
                  <span className="step-num">{String(number)}</span>
                  <div className="step-icon"><Icon size={19} /></div>
                  <div><h3>{String(title)}</h3><p>{String(copy)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="broker-cta content-width">
          <div><div className="eyebrow"><span /> Built for modern real estate</div><h2>Turn every listing into an<br />always-open property visit.</h2></div>
          <div><p>Upload a walkthrough. Get a digital twin. Share it with every serious buyer.</p><button onClick={() => onNavigate('upload')}>Create your first digital twin <ArrowRight size={17} /></button></div>
        </section>
      </main>
      <footer><Logo inverse /><span>Spatial intelligence for better property decisions.</span><span>© 2026 PropertyLens</span></footer>
    </div>
  )
}

function FloorPlan() {
  return (
    <div className="floor-plan-large">
      <div className="fp-room fp-living"><span>Living Room</span><small>18′ 6″ × 12′ 4″</small></div>
      <div className="fp-room fp-kitchen"><span>Kitchen</span><small>11′ 2″ × 9′ 8″</small></div>
      <div className="fp-room fp-bed1"><span>Master Bedroom</span><small>14′ 8″ × 12′ 2″</small></div>
      <div className="fp-room fp-bed2"><span>Bedroom 2</span><small>12′ 6″ × 11′ 2″</small></div>
      <div className="fp-room fp-balcony"><span>Balcony</span><small>10′ 4″ × 5′ 6″</small></div>
    </div>
  )
}

function PropertyDetails({ onNavigate, property }: { onNavigate: Navigate, property: PropertyListing }) {
  const [view, setView] = useState<'3D View' | 'Floor Plan' | 'Photos'>('3D View')
  const [room, setRoom] = useState(0)
  const propertyRooms = property.photos.length ? property.photos.map((media, index) => ({ name: media.name.replace(/\.[^.]+$/, '') || `Room ${index + 1}`, media, dimensions: rooms[index % rooms.length].dimensions })) : rooms.map(item => ({ ...item, media: undefined }))
  const activeRoom = propertyRooms[Math.min(room, propertyRooms.length - 1)]
  return (
    <div className="page details-page">
      <Header onNavigate={onNavigate} />
      <main className="detail-main content-width">
        <div className="breadcrumb"><button onClick={() => onNavigate('discover')}>Properties</button><ChevronRight size={14} /><span>{property.name}</span></div>
        <div className="detail-title-row">
          <div><div className="detail-badges"><span>FOR SALE</span>{property.status === 'ready' && <AiBadge />}</div><h1>{property.name}</h1><p><MapPin size={15} /> {property.address}, {property.locality}, {property.city}</p></div>
          <div className="detail-top-actions"><button><Share2 size={17} /> Share</button><button>♡ Save</button></div>
        </div>
        <div className="property-detail-grid">
          <section className="main-viewer-card">
            <div className="viewer-tabs">
              {(['3D View', 'Floor Plan', 'Photos'] as const).map((label) => <button key={label} className={view === label ? 'active' : ''} onClick={() => setView(label)}>{label === '3D View' ? <Move3D size={16} /> : label === 'Floor Plan' ? <Map size={16} /> : <Image size={16} />}{label}</button>)}
            </div>
            <div className="detail-viewer">
              {view === '3D View' && <>
                <AssetImage media={activeRoom.media} fallback={'image' in activeRoom ? activeRoom.image : '/images/living-room.jpg'} alt={activeRoom.name} />
                <div className="viewer-vignette" />
                <div className="viewer-status"><span /> DIGITAL TWIN · LIVE</div>
                <button className="fullscreen-button" onClick={() => onNavigate('twin', property.propertyId)}><Maximize2 size={18} /></button>
                <div className="detail-hotspot detail-hotspot-1"><span><ChevronRight size={15} /></span><label>Kitchen</label></div>
                <div className="detail-hotspot detail-hotspot-2"><span><ChevronRight size={15} /></span><label>Balcony</label></div>
                <button className="enter-twin-button" onClick={() => onNavigate('twin', property.propertyId)}><span><Footprints size={19} /></span><div><small>IMMERSIVE MODE</small>Enter 3D Digital Twin</div><ArrowRight size={18} /></button>
                <div className="viewer-bottom"><span>{activeRoom.name}</span><small>{room + 1} of {propertyRooms.length} uploaded scenes</small></div>
              </>}
              {view === 'Floor Plan' && <FloorPlanMedia media={property.floorPlan} />}
              {view === 'Photos' && <div className="photos-grid">{propertyRooms.map((item, index) => <button onClick={() => { setRoom(index); setView('3D View') }} key={`${item.name}-${index}`}><AssetImage media={item.media} fallback={'image' in item ? item.image : '/images/living-room.jpg'} alt={item.name} /><span>{item.name}</span></button>)}</div>}
            </div>
            <div className="room-strip">
              {propertyRooms.map((item, index) => <button key={`${item.name}-${index}`} onClick={() => { setRoom(index); setView('3D View') }} className={index === room && view === '3D View' ? 'active' : ''}><span className="room-thumb"><AssetImage media={item.media} fallback={'image' in item ? item.image : '/images/living-room.jpg'} alt="" />{index === room && <Play size={12} fill="currentColor" />}</span><span><strong>{item.name}</strong><small>{item.dimensions}</small></span></button>)}
            </div>
          </section>
          <aside className="property-info-card">
            <div className="price-label">ASKING PRICE</div><div className="property-price">{displayPrice(property.price)}</div><div className="price-sub">Property ID · {property.propertyId}</div>
            <div className="facts-grid">
              <div><BedDouble size={18} /><span><small>CONFIGURATION</small><strong>{property.bhk} BHK</strong></span></div>
              <div><SquareStack size={18} /><span><small>CARPET AREA</small><strong>{property.area} sq.ft</strong></span></div>
              <div><Compass size={18} /><span><small>FACING</small><strong>{property.facing}</strong></span></div>
              <div><Building2 size={18} /><span><small>FLOOR</small><strong>{property.floor} of {property.totalFloors}</strong></span></div>
            </div>
            <div className="amenities"><h3>Amenities</h3><div><span><CircleParking size={16} /> {property.parking || 'Parking'}</span>{property.amenities.slice(0, 3).map((item, index) => <span key={item}>{index === 0 ? <Zap size={16} /> : index === 1 ? <Waves size={16} /> : <Trees size={16} />}{item}</span>)}</div></div>
            <div className="info-actions">
              <button className="primary-action" onClick={() => onNavigate('twin', property.propertyId)}><Ruler size={18} /> Explore & Measure in 3D</button>
              <button className="secondary-action" onClick={() => setView('Floor Plan')}><Map size={18} /> View Floor Plan</button>
              <button className="book-action" onClick={() => alert('Visit request sent. A property advisor will contact you shortly.')}><Clock3 size={18} /> Book a Visit</button>
            </div>
            <p className="verified-note"><Check size={14} /> Property details verified 2 days ago</p>
          </aside>
        </div>
        <InsightsSection property={property} />
      </main>
    </div>
  )
}

function InsightsSection({ property }: { property: PropertyListing }) {
  return (
    <section className="insights-section">
      <div className="section-heading compact"><div><div className="eyebrow"><span /> PropertyLens Intelligence</div><h2>See what the space <em>tells you.</em></h2></div><div className="ai-generated"><Sparkles size={15} /> AI-generated from this digital twin</div></div>
      <div className="insight-grid">
        <article className="insight-card highlight"><div className="insight-icon"><Lightbulb size={21} /></div><small>NATURAL LIGHT</small><h3>Excellent throughout</h3><p>Large northeast windows deliver soft morning light across the living area and both primary bedrooms.</p><div className="light-scale"><span /><span /><span /><span /><i>92</i></div></article>
        <article className="insight-card"><div className="insight-icon"><Compass size={21} /></div><small>ORIENTATION</small><h3>{property.facing} facing</h3><p>Main entrance and window orientation are analysed from this property’s digital twin.</p><div className="compass-mini"><Navigation size={28} /><span>{property.facing.slice(0, 2).toUpperCase()}</span></div></article>
        <article className="insight-card room-dimensions"><div className="insight-icon"><Ruler size={21} /></div><small>ROOM DIMENSIONS</small><h3>{property.area} sq.ft measured</h3>{rooms.slice(0, 3).map(item => <div key={item.name}><span>{item.name}</span><strong>{item.dimensions}</strong></div>)}</article>
        <article className="insight-card nearby"><div className="insight-icon"><MapPin size={21} /></div><small>NEARBY CONTEXT</small><h3>{property.locality}, {property.city}</h3><div><span><TrainFront size={16} /> Nearest transit</span><strong>6 min</strong></div><div><span><Trees size={16} /> Neighbourhood park</span><strong>4 min</strong></div><div><span><Building2 size={16} /> Daily essentials</span><strong>5 min</strong></div></article>
      </div>
      <div className="faq-row">
        {[['Water supply', '24/7 building supply', Waves], ['Parking', property.parking || 'Contact broker', CircleParking], ['Maintenance', property.maintenance || 'Contact broker', Building2], ['Property type', property.type, Home]].map(([title, copy, Icon]) => <article key={String(title)}><div><Icon size={18} /></div><span><small>{String(title)}</small><strong>{String(copy)}</strong></span><ChevronRight size={16} /></article>)}
      </div>
    </section>
  )
}

const tourStops = [
  { name: 'Hall Entrance', room: 'Living Room', image: '/images/living-room.jpg', map: [43, 73], angle: 42, dimensions: '18′ 6″ × 12′ 4″', links: [{ target: 1, label: 'Hall Center', distance: '2.8 m', x: 50, y: 68 }, { target: 4, label: 'Bedroom Passage', distance: '4.6 m', x: 77, y: 61 }] },
  { name: 'Hall Center', room: 'Living Room', image: '/images/living-room.jpg', map: [43, 54], angle: 48, dimensions: '18′ 6″ × 12′ 4″', links: [{ target: 2, label: 'Window Side', distance: '3.2 m', x: 48, y: 70 }, { target: 3, label: 'Kitchen', distance: '4.1 m', x: 18, y: 61 }, { target: 4, label: 'Master Bedroom', distance: '5.8 m', x: 79, y: 60 }, { target: 0, label: 'Entrance', distance: '2.8 m', x: 36, y: 77 }] },
  { name: 'Window Side', room: 'Living Room', image: '/images/living-room.jpg', map: [43, 35], angle: 36, dimensions: '18′ 6″ × 12′ 4″', links: [{ target: 5, label: 'Balcony', distance: '1.6 m', x: 72, y: 62 }, { target: 1, label: 'Hall Center', distance: '3.2 m', x: 38, y: 75 }] },
  { name: 'Kitchen Doorway', room: 'Kitchen', image: '/images/kitchen.jpg', map: [76, 55], angle: 118, dimensions: '11′ 2″ × 9′ 8″', links: [{ target: 6, label: 'Kitchen Island', distance: '2.4 m', x: 50, y: 70 }, { target: 1, label: 'Living Room', distance: '4.1 m', x: 22, y: 66 }] },
  { name: 'Bedroom Passage', room: 'Passage', image: '/images/hallway.jpg', map: [25, 55], angle: 294, dimensions: '12′ 8″ × 3′ 10″', links: [{ target: 7, label: 'Master Bedroom', distance: '2.1 m', x: 50, y: 66 }, { target: 1, label: 'Living Room', distance: '3.7 m', x: 20, y: 72 }] },
  { name: 'Balcony View', room: 'Balcony', image: '/images/balcony-view.jpg', map: [43, 13], angle: 18, dimensions: '10′ 4″ × 5′ 6″', links: [{ target: 2, label: 'Back to Living Room', distance: '1.6 m', x: 49, y: 75 }] },
  { name: 'Kitchen Island', room: 'Kitchen', image: '/images/kitchen.jpg', map: [83, 55], angle: 136, dimensions: '11′ 2″ × 9′ 8″', links: [{ target: 3, label: 'Kitchen Doorway', distance: '2.4 m', x: 39, y: 74 }] },
  { name: 'Master Bedroom', room: 'Master Bedroom', image: '/images/bedroom.jpg', map: [18, 36], angle: 312, dimensions: '14′ 8″ × 12′ 2″', links: [{ target: 4, label: 'Bedroom Passage', distance: '2.1 m', x: 44, y: 74 }, { target: 8, label: 'Bedroom Window', distance: '3.4 m', x: 73, y: 65 }] },
  { name: 'Bedroom Window', room: 'Master Bedroom', image: '/images/bedroom.jpg', map: [18, 20], angle: 338, dimensions: '14′ 8″ × 12′ 2″', links: [{ target: 7, label: 'Bedside', distance: '3.4 m', x: 38, y: 74 }] },
]

function MiniFloorMap({ stop, floor, expanded, panelOpen, onToggle, onMove }: { stop: number, floor: string, expanded: boolean, panelOpen: boolean, onToggle: () => void, onMove: (index: number) => void }) {
  return (
    <div className={`navigation-map ${expanded ? 'expanded' : ''}`} style={{ right: panelOpen ? 400 : 20 }}>
      <div className="navigation-map-head"><span><Map size={16} /><strong>House map</strong><small>{floor || '—'} floor · live position</small></span><button onClick={onToggle}>{expanded ? <X size={15} /> : <Maximize2 size={15} />}</button></div>
      <div className="house-map-canvas">
        <div className="map-room map-balcony"><span>Balcony</span></div>
        <div className="map-room map-bedroom"><span>Master<br />Bedroom</span></div>
        <div className="map-room map-living"><span>Living Room</span></div>
        <div className="map-room map-kitchen"><span>Kitchen</span></div>
        <div className="map-passage" />
        {tourStops.map((item, index) => <button key={item.name} aria-label={`Move to ${item.name}`} className={`map-node ${stop === index ? 'active' : ''}`} style={{ left: `${item.map[0]}%`, top: `${item.map[1]}%` }} onClick={() => onMove(index)}><span>{stop === index ? <Navigation size={10} /> : ''}</span>{expanded && stop !== index && <small>{index + 1}</small>}</button>)}
      </div>
      <div className="map-location"><span className="map-live-dot" /><div><small>YOU ARE HERE</small><strong>{tourStops[stop].name}</strong></div><span>0{stop + 1}</span></div>
    </div>
  )
}

function TwinExperience({ onNavigate, property }: { onNavigate: Navigate, property: PropertyListing }) {
  const propertyMedia = useResolvedPropertyMedia(property)
  const activeTourStops = useMemo(() => tourStops.map((item, index) => ({ ...item, image: propertyMedia.photos[index % Math.max(1, propertyMedia.photos.length)] || item.image })), [propertyMedia.photos])
  const [stop, setStop] = useState(0)
  const [measure, setMeasure] = useState(false)
  const [points, setPoints] = useState<{ x: number, y: number }[]>([])
  const [panel, setPanel] = useState<'none' | 'insights' | 'property'>('none')
  const [mapExpanded, setMapExpanded] = useState(false)
  const [heading, setHeading] = useState(tourStops[0].angle)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [traveling, setTraveling] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [showWalkthrough, setShowWalkthrough] = useState(Boolean(property.video))
  const dragStart = useRef<{ x: number, y: number } | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const current = activeTourStops[stop]

  const moveTo = (target: number) => {
    if (traveling || target === stop) return
    setTraveling(true)
    setPoints([])
    setMeasure(false)
    setHistory(old => [...old.slice(-5), stop])
    window.setTimeout(() => {
      setStop(target)
      setOffset({ x: 0, y: 0 })
      setHeading(activeTourStops[target].angle)
    }, 230)
    window.setTimeout(() => setTraveling(false), 780)
  }

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') moveTo(current.links[0].target)
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setHeading(value => (value - 12 + 360) % 360)
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setHeading(value => (value + 12) % 360)
      if ((event.key === 'ArrowDown' || event.key.toLowerCase() === 's') && history.length) moveTo(history[history.length - 1])
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  })

  const handleMeasure = (event: MouseEvent<HTMLDivElement>) => {
    if (!measure || !viewerRef.current || (event.target as HTMLElement).closest('button')) return
    const rect = viewerRef.current.getBoundingClientRect()
    const point = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }
    setPoints(old => old.length >= 2 ? [point] : [...old, point])
  }
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (measure || (event.target as HTMLElement).closest('button')) return
    dragStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || measure) return
    const deltaX = event.clientX - dragStart.current.x
    const deltaY = event.clientY - dragStart.current.y
    setOffset(old => ({ x: Math.max(-58, Math.min(58, old.x + deltaX * .18)), y: Math.max(-18, Math.min(18, old.y + deltaY * .08)) }))
    setHeading(value => (value - deltaX * .12 + 360) % 360)
    dragStart.current = { x: event.clientX, y: event.clientY }
  }
  const handlePointerUp = () => { dragStart.current = null }
  const distance = points.length === 2 ? (Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 3.12).toFixed(1) : ''
  const roomIndex = current.room === 'Kitchen' ? 1 : current.room === 'Master Bedroom' ? 2 : current.room === 'Balcony' ? 3 : 0

  return (
    <div className="twin-experience reworked-twin">
      <div className="twin-topbar new-twin-topbar">
        <div className="twin-brand"><button onClick={() => onNavigate('property', property.propertyId)}><ArrowLeft size={18} /></button><Logo inverse /><span className="topbar-divider" /><div><strong>{property.name}</strong><span><span className="verified-space"><Check size={10} /> {property.status === 'ready' ? 'VERIFIED TWIN' : 'BROKER PREVIEW'}</span> {property.bhk} BHK · {property.area} sq.ft</span></div></div>
        <div className="current-location-hud"><LocateFixed size={16} /><span><small>CURRENT LOCATION</small><strong>{current.name}</strong></span><i>0{stop + 1} / 09</i></div>
        <div className="twin-actions"><button className={showWalkthrough ? 'active source-video-toggle' : 'source-video-toggle'} disabled={!propertyMedia.video} onClick={() => setShowWalkthrough(!showWalkthrough)}><Video size={17} /> {propertyMedia.video ? 'Source video' : 'Photos only'}</button><button className={panel === 'property' ? 'active' : ''} onClick={() => setPanel(panel === 'property' ? 'none' : 'property')}><Home size={17} /> Property</button><button className={panel === 'insights' ? 'active' : ''} onClick={() => setPanel(panel === 'insights' ? 'none' : 'insights')}><Sparkles size={17} /> AI Insights</button><button><Share2 size={17} /></button><button onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 size={17} /></button></div>
      </div>
      <div
        ref={viewerRef}
        className={`twin-viewer navigable-viewer ${measure ? 'measuring' : ''} ${traveling ? 'camera-traveling' : ''}`}
        onClick={handleMeasure}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <AnimatePresence mode="wait">
          {showWalkthrough && propertyMedia.video ? <motion.div className="uploaded-scene-video" key={`video-${property.propertyId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><video src={propertyMedia.video} autoPlay muted loop playsInline /><span><FileVideo size={13} /> Actual broker walkthrough · {property.video?.name}</span></motion.div> : <motion.img key={`${current.image}-${stop}`} src={current.image} alt={`First-person view from ${current.name}`} initial={{ opacity: .2, scale: 1.16, filter: 'blur(5px)' }} animate={{ opacity: 1, scale: 1.075, x: offset.x, y: offset.y, filter: 'blur(0px)' }} exit={{ opacity: .18, scale: 1.24, filter: 'blur(6px)' }} transition={{ duration: .62, ease: [0.22, 1, 0.36, 1] }} />}
        </AnimatePresence>
        <div className="twin-vignette" />
        <div className="spatial-grid" />

        <div className="fixed-compass">
          <div className="compass-dial" style={{ transform: `rotate(${-heading}deg)` }}><b>N</b><span>E</span><i>S</i><em>W</em><Navigation size={24} fill="currentColor" /></div>
          <div className="compass-readout"><strong>{Math.round(heading)}° NE</strong><span>Facing</span></div>
        </div>

        <div className="navigation-onboarding"><MousePointer2 size={15} /><span><strong>Drag to look around</strong><small>Click a floor arrow to walk</small></span><div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div>

        {!measure && current.links.map((link, index) => <button
          className={`floor-destination destination-${index + 1}`}
          style={{ left: `${link.x}%`, top: `${link.y}%` }}
          key={`${stop}-${link.target}`}
          onClick={() => moveTo(link.target)}
          disabled={traveling}
        >
          <span className="floor-chevron"><i /><i /><i /><Navigation size={20} fill="currentColor" /></span>
          <span className="destination-label"><small>{link.distance} AHEAD</small><strong>{link.label}</strong><em>Walk here <ArrowRight size={11} /></em></span>
        </button>)}

        {!measure && <>
          <button className="smart-tag tag-facing" onClick={() => setPanel('insights')}><Compass size={15} /><span><small>SPATIAL ORIENTATION</small>{property.facing} Facing</span></button>
          {current.room !== 'Passage' && <button className="smart-tag tag-window" onClick={() => setPanel('insights')}><SquareStack size={15} /><span><small>AI DETECTED</small>{current.room === 'Balcony' ? 'Open city view' : 'Window · 8 ft'}</span></button>}
          {(current.room === 'Living Room' || current.room === 'Balcony' || current.room === 'Master Bedroom') && <button className="smart-tag tag-light" onClick={() => setPanel('insights')}><Lightbulb size={15} /><span><small>LIGHT ANALYSIS</small>Excellent Natural Light</span></button>}
        </>}

        {current.room === 'Balcony' && <div className="outside-view-badge"><Trees size={16} /><span><small>OUTSIDE VIEW</small><strong>{property.locality} · {property.facing} skyline</strong></span><i>Live orientation</i></div>}

        {points.map((point, index) => <span className="measure-point" key={`${point.x}-${point.y}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}><i />{index === 0 && points.length === 1 && <label>Select endpoint</label>}</span>)}
        {points.length === 2 && <><svg className="measure-line" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} vectorEffect="non-scaling-stroke" /></svg><div className="distance-label" style={{ left: `${(points[0].x + points[1].x) / 2}%`, top: `${(points[0].y + points[1].y) / 2}%` }}><Ruler size={15} /><strong>{distance} ft</strong><span>Point to point</span></div></>}

        <div className="left-tool-rail">
          <button className={measure ? 'active' : ''} onClick={() => { setMeasure(!measure); setPoints([]) }}><Ruler size={19} /><span>{measure ? 'Exit measure' : 'Measure'}</span></button>
          <button onClick={() => { setOffset({ x: 0, y: 0 }); setHeading(current.angle) }}><LocateFixed size={19} /><span>Recenter</span></button>
          <button onClick={() => setMapExpanded(!mapExpanded)}><Map size={19} /><span>Floor map</span></button>
        </div>

        {measure && <div className="measure-instruction"><div><Ruler size={18} /></div><span><strong>{points.length === 0 ? 'Select your starting point' : points.length === 1 ? 'Now select the endpoint' : 'Measurement complete'}</strong><small>Click any two surfaces in this room to measure</small></span>{points.length > 0 && <button onClick={() => setPoints([])}>Clear</button>}<button className="close-measure" onClick={() => { setMeasure(false); setPoints([]) }}><X size={16} /></button></div>}

        <MiniFloorMap stop={stop} floor={property.floor} expanded={mapExpanded} panelOpen={panel !== 'none'} onToggle={() => setMapExpanded(!mapExpanded)} onMove={moveTo} />

        <div className="room-caption new-room-caption"><div><span className="room-index">0{roomIndex + 1}</span><span><small>YOU ARE INSIDE</small><strong>{current.room}</strong></span></div><div><Ruler size={14} /> {current.dimensions}</div></div>

        <div className="movement-pad">
          <button className="move-up" onClick={() => moveTo(current.links[0].target)} aria-label="Move forward"><ChevronUp size={19} /></button>
          <button className="move-left" onClick={() => setHeading(value => (value - 15 + 360) % 360)} aria-label="Look left"><ChevronLeft size={19} /></button>
          <span><Navigation size={13} fill="currentColor" /></span>
          <button className="move-right" onClick={() => setHeading(value => (value + 15) % 360)} aria-label="Look right"><ChevronRight size={19} /></button>
          <button className="move-down" disabled={!history.length} onClick={() => history.length && moveTo(history[history.length - 1])} aria-label="Move back"><ChevronDown size={19} /></button>
        </div>

        <div className="tour-progress"><span>{showWalkthrough ? 'SOURCE WALKTHROUGH' : 'PROPERTY WALKTHROUGH'}</span><div>{activeTourStops.map((_, index) => <i className={index === stop ? 'active' : history.includes(index) ? 'visited' : ''} key={index} />)}</div><strong>{new Set([...history, stop]).size} / {activeTourStops.length} locations explored</strong></div>

        {traveling && <div className="moving-status"><span className="spinner" /><div><small>MOVING THROUGH SPACE</small><strong>{current.links.find(link => link.target !== stop)?.label || 'Next position'}</strong></div></div>}

        <AnimatePresence>
          {panel !== 'none' && <motion.aside className="twin-insights property-drawer" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', damping: 27, stiffness: 250 }}>
            <div className="drawer-tabs"><button className={panel === 'property' ? 'active' : ''} onClick={() => setPanel('property')}><Home size={15} /> Property</button><button className={panel === 'insights' ? 'active' : ''} onClick={() => setPanel('insights')}><Sparkles size={15} /> AI Insights</button><button onClick={() => setPanel('none')}><X size={18} /></button></div>
            {panel === 'insights' ? <>
              <div className="twin-insights-head"><div><span><Sparkles size={16} /> PROPERTYLENS AI</span><h2>Understand this space</h2><p>Live spatial analysis at {current.name}</p></div></div>
              <div className="twin-insights-body">
                <div className="insight-summary"><div><Lightbulb size={20} /><span>Natural light score</span><strong>{current.room === 'Passage' ? '71' : '92'}<small>/100</small></strong></div><p>{current.room === 'Balcony' ? 'Unobstructed northeast city exposure with excellent airflow and low afternoon heat.' : 'This position receives soft, diffused daylight with minimal afternoon heat gain.'}</p><div className="sun-track"><span /><span /><i /></div><div className="sun-labels"><span>7 AM</span><span>12 PM</span><span>5 PM</span></div></div>
                <h3>Position intelligence</h3>
                <div className="twin-intelligence-row"><Ruler size={18} /><span><small>Room dimensions</small><strong>{current.dimensions}</strong></span><Check size={15} /></div>
                <div className="twin-intelligence-row"><Compass size={18} /><span><small>Viewing orientation</small><strong>{Math.round(heading)}° · {property.facing}</strong></span><Check size={15} /></div>
                <div className="twin-intelligence-row"><SquareStack size={18} /><span><small>Usable floor area</small><strong>{roomIndex === 0 ? '228 sq.ft' : roomIndex === 1 ? '108 sq.ft' : roomIndex === 2 ? '176 sq.ft' : '57 sq.ft'}</strong></span><Check size={15} /></div>
                <h3>Nearby context</h3><div className="nearby-mini"><div><span><TrainFront size={16} /> Metro station</span><strong>600 m · 6 min</strong></div><div><span><Trees size={16} /> Neighbourhood park</span><strong>350 m · 4 min</strong></div><div><span><Building2 size={16} /> Supermarket</span><strong>450 m · 5 min</strong></div></div>
              </div>
            </> : <>
              <div className="property-panel-hero"><div><small>FOR SALE · {property.status === 'ready' ? 'VERIFIED' : 'PREVIEW'}</small><h2>{property.name}</h2><p><MapPin size={13} /> {property.locality}, {property.city}</p></div><strong>{displayPrice(property.price)}</strong></div>
              <div className="property-panel-body"><div className="panel-facts"><div><BedDouble size={17} /><span><small>CONFIGURATION</small><strong>{property.bhk} BHK</strong></span></div><div><SquareStack size={17} /><span><small>CARPET AREA</small><strong>{property.area} sq.ft</strong></span></div><div><Compass size={17} /><span><small>FACING</small><strong>{property.facing}</strong></span></div><div><Building2 size={17} /><span><small>FLOOR</small><strong>{property.floor} of {property.totalFloors}</strong></span></div></div><h3>What you’re exploring</h3><div className="current-space-card"><img src={current.image} alt="" /><span><small>CURRENT SPACE</small><strong>{current.room}</strong><em>{current.dimensions}</em></span><span className="live-ring" /></div>{property.floorPlan && <button className="drawer-floorplan" onClick={() => onNavigate('property', property.propertyId)}><Map size={16} /><span><small>BROKER UPLOAD</small><strong>View actual floor plan</strong></span><ArrowRight size={14} /></button>}<h3>Amenities</h3><div className="panel-amenities"><span><CircleParking size={15} /> {property.parking || 'Parking'}</span>{property.amenities.slice(0, 3).map((item, index) => <span key={item}>{index === 0 ? <Zap size={15} /> : index === 1 ? <Waves size={15} /> : <Trees size={15} />}{item}</span>)}</div><button className="panel-book" onClick={() => alert('Visit request sent. A property advisor will contact you shortly.')}>Book an in-person visit <ArrowRight size={15} /></button><button className="panel-details" onClick={() => onNavigate('property', property.propertyId)}>View complete property details</button></div>
            </>}
          </motion.aside>}
        </AnimatePresence>
      </div>
    </div>
  )
}

function DashboardShell({ children, active, onNavigate }: { children: React.ReactNode, active: 'dashboard' | 'upload' | 'listings' | 'analytics', onNavigate: Navigate }) {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <button onClick={() => onNavigate('discover')} className="plain-button"><Logo inverse /></button>
        <nav>
          <span>WORKSPACE</span>
          <button className={active === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}><BarChart3 size={18} /> Overview</button>
          <button className={active === 'listings' ? 'active' : ''} onClick={() => onNavigate('listings')}><Building2 size={18} /> Listings</button>
          <button className={active === 'upload' ? 'active' : ''} onClick={() => onNavigate('upload')}><Box size={18} /> Digital Twins</button>
          <button className={active === 'analytics' ? 'active' : ''} onClick={() => onNavigate('analytics')}><BarChart3 size={18} /> Analytics</button>
          <span>DEVELOPER</span>
          <button><Code2 size={18} /> API & Integrations</button>
        </nav>
        <div className="sidebar-usage"><div><span>PLAN USAGE</span><strong>18 / 25 twins</strong></div><div className="usage-track"><span /></div><button>Manage plan <ArrowRight size={14} /></button></div>
        <div className="sidebar-profile"><span>AM</span><div><strong>Arjun Mehta</strong><small>Urban Nest Realty</small></div><MoreHorizontal size={17} /></div>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-header"><div><span>Urban Nest Realty</span><strong>{active === 'dashboard' ? 'Overview' : active === 'listings' ? 'Listings' : active === 'analytics' ? 'Analytics' : 'Property Editor'}</strong></div><div><button className="icon-button"><Search size={18} /></button><button className="icon-button notification"><Bell size={18} /><span /></button><button className="new-twin" onClick={() => onNavigate('upload')}><Plus size={17} /> Create New Digital Twin</button></div></header>
        {children}
      </div>
    </div>
  )
}

function DashboardListingRow({ listing, onNavigate }: { listing: PropertyListing, onNavigate: Navigate }) {
  const cover = useMediaUrl(coverAsset(listing))
  return <div className="listing-row"><div><img src={cover || '/images/living-room.jpg'} alt="" /><span><strong>{listing.name || 'Untitled property'}</strong><small><MapPin size={11} /> {listing.locality || 'No locality'}, {listing.city}</small></span></div><span><i className={listing.status === 'processing' ? 'processing' : listing.status === 'draft' ? 'draft' : ''} /> {listing.status === 'ready' ? 'Live' : listing.status === 'processing' ? `Processing ${listing.processingProgress}%` : 'Draft'}</span><strong>{listing.views.toLocaleString()}</strong><strong>{listing.leads}</strong><span>{new Date(listing.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><div className="listing-actions"><button onClick={() => onNavigate('property', listing.propertyId)}>Preview</button><button onClick={() => onNavigate('upload', listing.propertyId)}>Edit</button></div></div>
}

function Dashboard({ onNavigate, listings, mode = 'dashboard' }: { onNavigate: Navigate, listings: PropertyListing[], mode?: 'dashboard' | 'listings' | 'analytics' }) {
  const readyCount = listings.filter(item => item.status === 'ready').length
  const processingCount = listings.filter(item => item.status === 'processing').length
  const totalViews = listings.reduce((sum, item) => sum + item.views, 0)
  const totalLeads = listings.reduce((sum, item) => sum + item.leads, 0)
  return (
    <DashboardShell active={mode} onNavigate={onNavigate}>
      <main className="dashboard-main">
        <div className="dash-welcome"><div><h1>{mode === 'listings' ? 'Property listings' : mode === 'analytics' ? 'Portfolio analytics' : 'Good morning, Arjun.'}</h1><p>{mode === 'listings' ? 'Every listing has isolated details, media and digital twin state.' : mode === 'analytics' ? 'Engagement across your property-specific buyer experiences.' : 'Here’s how your immersive listings are performing.'}</p></div>{mode === 'listings' ? <button className="new-twin" onClick={() => onNavigate('upload')}><Plus size={15} /> New property</button> : <button className="date-filter">Last 30 days <ChevronDown size={15} /></button>}</div>
        <div className="stat-grid">
          <article><div className="stat-icon green"><Box size={20} /></div><span>Digital twins</span><strong>{readyCount}</strong><small>Across <b>{listings.length} property records</b></small></article>
          <article><div className="stat-icon gold"><Clock3 size={20} /></div><span>Processing</span><strong>{processingCount}</strong><small>Property-specific pipeline state</small></article>
          <article><div className="stat-icon blue"><Eye size={20} /></div><span>Total 3D views</span><strong>{totalViews.toLocaleString()}</strong><small><b>↑ 18.4%</b> vs last month</small></article>
          <article><div className="stat-icon purple"><MousePointer2 size={20} /></div><span>Qualified leads</span><strong>{totalLeads}</strong><small><b>{totalViews ? ((totalLeads / totalViews) * 100).toFixed(1) : 0}%</b> conversion rate</small></article>
        </div>
        {mode !== 'listings' && <div className="dashboard-middle">
          <section className="views-chart"><div className="panel-heading"><div><h2>Digital twin engagement</h2><p>Views across all active properties</p></div><button><span /> 3D views <ChevronDown size={14} /></button></div><div className="chart-area"><div className="chart-y"><span>1.2k</span><span>900</span><span>600</span><span>300</span><span>0</span></div><div className="chart-plot"><i /><i /><i /><i /><svg viewBox="0 0 620 180" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#286f5d" stopOpacity=".24"/><stop offset="100%" stopColor="#286f5d" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0,150 C50,135 80,145 120,116 C170,80 190,110 240,91 C290,72 315,97 360,66 C405,37 430,65 475,41 C530,13 560,43 620,18 L620,180 L0,180Z"/><path className="line" d="M0,150 C50,135 80,145 120,116 C170,80 190,110 240,91 C290,72 315,97 360,66 C405,37 430,65 475,41 C530,13 560,43 620,18"/></svg><div className="chart-x"><span>Aug 5</span><span>Aug 11</span><span>Aug 17</span><span>Aug 23</span><span>Sep 2</span></div></div></div></section>
          <section className="integration-card"><div className="integration-icon"><Code2 size={23} /></div><span>B2B INTEGRATIONS</span><h2>Bring digital twins into your workflow.</h2><p>Use our API, webhooks, and embeddable viewer on any listing portal.</p><div><span><Check size={14} /> REST API</span><span><Check size={14} /> Webhooks</span><span><Check size={14} /> Embeddable SDK</span></div><button>View developer docs <ArrowRight size={15} /></button></section>
        </div>}
        <section className="listings-panel"><div className="panel-heading"><div><h2>{mode === 'listings' ? 'All property records' : 'Recent listings'}</h2><p>Buyer data and broker media remain isolated by property ID</p></div><button onClick={() => onNavigate('listings')}>Manage listings <ArrowRight size={15} /></button></div><div className="listing-table"><div className="listing-head"><span>PROPERTY</span><span>STATUS</span><span>3D VIEWS</span><span>LEADS</span><span>UPDATED</span><span>ACTIONS</span></div>{listings.map(listing => <DashboardListingRow listing={listing} key={listing.propertyId} onNavigate={onNavigate} />)}</div></section>
      </main>
    </DashboardShell>
  )
}

function UploadScreen({ onNavigate, listing, onSave }: { onNavigate: Navigate, listing: PropertyListing, onSave: (listing: PropertyListing) => void }) {
  return <DashboardShell active="upload" onNavigate={onNavigate}>
    <PropertyEditor
      initial={listing}
      onSave={onSave}
      onCancel={() => onNavigate('listings')}
      onPreview={next => { onSave(next); onNavigate(next.status === 'ready' ? 'twin' : 'property', next.propertyId) }}
    />
  </DashboardShell>
}

function App() {
  const [listings, setListings] = useState<PropertyListing[]>(() => loadListings())
  const [path, setPath] = useState(window.location.pathname)
  const [newListing, setNewListing] = useState<PropertyListing>(() => createEmptyListing())

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const saveListing = useCallback((listing: PropertyListing) => {
    setListings(current => {
      const exists = current.some(item => item.propertyId === listing.propertyId)
      const next = exists ? current.map(item => item.propertyId === listing.propertyId ? listing : item) : [listing, ...current]
      persistListings(next)
      return next
    })
  }, [])

  const navigate: Navigate = useCallback((page, propertyId) => {
    const fallbackId = propertyId || listings[0]?.propertyId
    let nextPath = '/'
    if (page === 'property') nextPath = `/properties/${fallbackId}`
    if (page === 'twin') nextPath = `/properties/${fallbackId}/twin`
    if (page === 'dashboard') nextPath = '/broker'
    if (page === 'listings') nextPath = '/broker/listings'
    if (page === 'analytics') nextPath = '/broker/analytics'
    if (page === 'upload') {
      if (propertyId) nextPath = `/broker/properties/${propertyId}/edit`
      else { setNewListing(createEmptyListing()); nextPath = '/broker/properties/new' }
    }
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }, [listings])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const activeName = listings.find(item => path.includes(item.propertyId))?.name
    document.title = activeName ? `${activeName} — PropertyLens` : path.startsWith('/broker') ? 'Broker Workspace — PropertyLens' : 'PropertyLens — Experience Property in 3D'
  }, [path, listings])

  const buyerMatch = path.match(/^\/properties\/([^/]+)(\/twin)?$/)
  const editMatch = path.match(/^\/broker\/properties\/([^/]+)\/edit$/)
  const propertyId = buyerMatch?.[1]
  const buyerProperty = listings.find(item => item.propertyId === propertyId) || listings[0]
  const editListing = editMatch ? listings.find(item => item.propertyId === editMatch[1]) : undefined
  const page: Page = buyerMatch?.[2] ? 'twin' : buyerMatch ? 'property' : path === '/broker/listings' ? 'listings' : path === '/broker/analytics' ? 'analytics' : path.startsWith('/broker/properties/') ? 'upload' : path === '/broker' ? 'dashboard' : 'discover'

  return (
    <AnimatePresence mode="wait">
      <motion.div key={path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
        {page === 'discover' && <Landing onNavigate={navigate} listings={listings} />}
        {page === 'property' && buyerProperty && <PropertyDetails onNavigate={navigate} property={buyerProperty} />}
        {page === 'twin' && buyerProperty && <TwinExperience onNavigate={navigate} property={buyerProperty} />}
        {page === 'dashboard' && <Dashboard onNavigate={navigate} listings={listings} />}
        {page === 'listings' && <Dashboard onNavigate={navigate} listings={listings} mode="listings" />}
        {page === 'analytics' && <Dashboard onNavigate={navigate} listings={listings} mode="analytics" />}
        {page === 'upload' && <UploadScreen onNavigate={navigate} listing={editListing || newListing} onSave={saveListing} />}
      </motion.div>
    </AnimatePresence>
  )
}

export default App
