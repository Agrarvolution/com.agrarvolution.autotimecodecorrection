//relates to Bridge Thumbnail objects
declare class Application {
    readonly document: Document
    synchronousMode: boolean
}

declare class Document {
    selections: array<Thumbnail>
    deselectAll() : void
    selectAll() : void
    readonly selectionLength: number
    
}
declare class Thumbnail {
    type: string
    name: string
    mimeType: string
    hasMetadata: boolean
    synchronousMetadata: any
    children: array<Thumbnail>
    bestCreationDate: Date
    lastModifiedDate: Date

    metadata: Metadata
    synchronousMetadata: Metadata
    locked: boolean


}

declare class Metadata extends XMPMeta {
    namespace: string

    constructor (metadata: string)

    serialize(flags: number): string
}
