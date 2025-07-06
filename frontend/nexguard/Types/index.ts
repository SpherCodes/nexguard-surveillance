 declare interface Camera {
  id: string
  name: string
  location: string
  status: 'online' | 'offline' | 'recording'
  videoUrl?: string
  lastSeen?: string
  resolution?: string
  fps?: number
}