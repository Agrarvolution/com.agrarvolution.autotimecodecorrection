//relates to Bridge Thumbnail objects
declare class Application {
    document: Document
}

declare class Document {
    
}
declare class Thumbnail {
    type: string
    name: string
    mimeType: string
    hasMetadata: boolean
    synchronousMetadata: any
    children: array<Thumbnail>

}
