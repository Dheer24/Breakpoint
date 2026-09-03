export type TwinStatus = 'draft' | 'processing' | 'ready'
export type MediaKind = 'photo' | 'video' | 'floorplan'

export interface MediaAsset {
  id: string
  kind: MediaKind
  name: string
  mime: string
  size: number
  url?: string
  blobKey?: string
  createdAt: string
}

export interface PropertyListing {
  propertyId: string
  name: string
  type: string
  bhk: string
  price: string
  area: string
  floor: string
  totalFloors: string
  facing: string
  address: string
  locality: string
  city: string
  pincode: string
  amenities: string[]
  parking: string
  maintenance: string
  status: TwinStatus
  processingProgress: number
  processingStage: number
  coverId?: string
  photos: MediaAsset[]
  video?: MediaAsset
  floorPlan?: MediaAsset
  views: number
  leads: number
  updatedAt: string
}

const STORAGE_KEY = 'propertylens:listings:v3'
const DB_NAME = 'propertylens-media'
const STORE_NAME = 'files'

const asset = (id: string, kind: MediaKind, name: string, url: string, mime = 'image/jpeg'): MediaAsset => ({
  id, kind, name, url, mime, size: 0, createdAt: '2026-09-01T10:00:00.000Z',
})

export const DEFAULT_LISTINGS: PropertyListing[] = [
  {
    propertyId: 'serene-heights-a804',
    name: 'Serene Heights · A804',
    type: 'Apartment',
    bhk: '3',
    price: '₹2.85 Cr',
    area: '1,842',
    floor: '8',
    totalFloors: '14',
    facing: 'Northeast',
    address: '12th Main Road, Defence Colony',
    locality: 'Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
    amenities: ['Power Backup', 'Swimming Pool', 'Garden Court', 'Clubhouse'],
    parking: '2 covered bays',
    maintenance: '₹8,500 / month',
    status: 'ready',
    processingProgress: 100,
    processingStage: 5,
    coverId: 'sh-living',
    photos: [
      asset('sh-living', 'photo', 'Living room.jpg', '/images/living-room.jpg'),
      asset('sh-kitchen', 'photo', 'Open kitchen.jpg', '/images/kitchen.jpg'),
      asset('sh-balcony', 'photo', 'Balcony view.jpg', '/images/balcony-view.jpg'),
    ],
    floorPlan: asset('sh-plan', 'floorplan', 'Serene Heights floor plan.svg', '/floorplans/serene.svg', 'image/svg+xml'),
    views: 1284,
    leads: 28,
    updatedAt: '2026-09-03T08:20:00.000Z',
  },
  {
    propertyId: 'oak-vista-b1203',
    name: 'Oak Vista Residences · B1203',
    type: 'Apartment',
    bhk: '4',
    price: '₹3.40 Cr',
    area: '2,216',
    floor: '12',
    totalFloors: '22',
    facing: 'West',
    address: 'ITPL Main Road, Pattandur Agrahara',
    locality: 'Whitefield',
    city: 'Bengaluru',
    pincode: '560066',
    amenities: ['Sky Lounge', 'Gymnasium', 'Children’s Park', 'EV Charging'],
    parking: '3 covered bays',
    maintenance: '₹11,200 / month',
    status: 'ready',
    processingProgress: 100,
    processingStage: 5,
    coverId: 'ov-exterior',
    photos: [
      asset('ov-exterior', 'photo', 'Tower exterior.jpg', '/images/exterior.jpg'),
      asset('ov-bedroom', 'photo', 'Primary bedroom.jpg', '/images/bedroom.jpg'),
      asset('ov-hallway', 'photo', 'Private hallway.jpg', '/images/hallway.jpg'),
    ],
    floorPlan: asset('ov-plan', 'floorplan', 'Oak Vista floor plan.svg', '/floorplans/oak-vista.svg', 'image/svg+xml'),
    views: 886,
    leads: 19,
    updatedAt: '2026-09-02T12:10:00.000Z',
  },
]

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_LISTINGS)) as PropertyListing[]
}

export function loadListings(): PropertyListing[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as PropertyListing[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    // The seeded listings keep the app usable if storage is unavailable.
  }
  const defaults = cloneDefaults()
  persistListings(defaults)
  return defaults
}

export function persistListings(listings: PropertyListing[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(listings)) } catch { /* storage quota is handled by IndexedDB media storage */ }
}

export function createEmptyListing(): PropertyListing {
  const propertyId = `pl-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 5)}`
  return {
    propertyId,
    name: '',
    type: 'Apartment',
    bhk: '3',
    price: '',
    area: '',
    floor: '',
    totalFloors: '',
    facing: 'Northeast',
    address: '',
    locality: '',
    city: 'Bengaluru',
    pincode: '',
    amenities: [],
    parking: '',
    maintenance: '',
    status: 'draft',
    processingProgress: 0,
    processingStage: 0,
    photos: [],
    views: 0,
    leads: 0,
    updatedAt: new Date().toISOString(),
  }
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveMediaFile(file: File, kind: MediaKind): Promise<MediaAsset> {
  const id = `media-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
  const db = await openMediaDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
  return { id, kind, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, blobKey: id, createdAt: new Date().toISOString() }
}

export async function resolveMediaUrl(media?: MediaAsset): Promise<string> {
  if (!media) return ''
  if (media.url) return media.url
  if (!media.blobKey) return ''
  const blobKey = media.blobKey
  const db = await openMediaDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(blobKey)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return blob ? URL.createObjectURL(blob) : ''
}

export async function removeMediaFile(media?: MediaAsset) {
  if (!media?.blobKey) return
  const db = await openMediaDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(media.blobKey!)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export function coverAsset(listing: PropertyListing) {
  return listing.photos.find(item => item.id === listing.coverId) || listing.photos[0]
}

export function displayPrice(price: string) {
  if (!price) return 'Price on request'
  return price.trim().startsWith('₹') ? price : `₹${price}`
}
