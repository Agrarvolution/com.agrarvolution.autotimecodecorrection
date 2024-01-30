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
      prevFramerate: number
      prevStartTime: Timecode
      isDropFrame: boolean
      timecodeStruct: string
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