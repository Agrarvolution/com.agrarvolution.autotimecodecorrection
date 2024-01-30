declare class ThumbnailMetadata {
    thumb: Thumbnail
    filename: string
    mimeType: string
    xmp: XMPMetaInstance

    audioMetadata: {
      audioencoding: string
      sampleFrequency: number
      bitRate: number
      samples: number
    }
    timecodeMetadata: {
      framerate: number
      startTime: Timecode
      prevStartTime: Timecode
      isDropFrame: boolean
    }

    constructor (thumb: Thumbnail)
}

declare class Timecode {
  framerate: number
  hours: number
  minutes: number
  seconds: number
  frames: number
}

declare class CacheThumbnails {
  mediaCache: array<ThumbnailMetadata>
  
}