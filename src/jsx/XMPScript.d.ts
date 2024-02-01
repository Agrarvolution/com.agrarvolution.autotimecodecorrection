// @see https://github.com/adobe/XMP-Toolkit-SDK/blob/main/docs/XMPSpecificationPart1.pdf 
//A commonly used construct for loading XMPScript into
// ExtendScript contexts.
interface ExternalObjectConstructor {
    AdobeXMPScript: ExternalObject | undefined;
}

interface XMPMetaConstructor {
	/** Creates an empty object. */
	new (): XMPMetaInstance;
	/**
	 * @param packet A string containing an XML file or an XMP packet.
	 */
	new (packet: string): XMPMetaInstance;
	/**
	 * @param buffer The UTF-8 or UTF-16 encoded bytes of an XML file
	 * or an XMP packet. This array is the result of a call to `serializeToArray`
	 * on an `XMPMeta` instance.
	 */
	new (buffer: number[]): XMPMetaInstance;

	// Class stuff.
}

interface XMPMetaInstance {
    setStructField(NS_DM: string, structName: string, NS_DM1: string, property: string, value: string): void;
	getStructField(NS_DM: string, timecodeStruct: string, NS_DM1: string, arg3: string): XMPProperty
	doesPropertyExist(namespace:string, value:string): boolean
	doesStructFieldExist(NS_DM: string, timecodeStruct: string, NS_DM1: string, TIME_FORMAT: string): boolean;
	getProperty(namespace:string, property:string): XMPProperty
	setProperty(namespace:string, property:string, value:string): boolean
	setProperty(namespace:string, property:string, value:string, flags: number): boolean
	countArrayItems(namespace:string, property:string): Number
	getArrayItem(namespace:string, property:string, itemIndex:Number): XMPProperty
	deleteProperty(namespace:string, property:string): boolean
	appendArrayItem(namespace:string, property:string, arrayOptions:string, valueToAppend:string, valueOptions:string): boolean
	dumpObject():string
	serialize(flags: any): string
    // Instance stuff.
}

declare const XMPMeta: XMPMetaConstructor | undefined;

interface XMPConstConstructor {
    STRING: number;
    readonly SERIALIZE_USE_COMPACT_FORMAT: number;
    readonly SERIALIZE_OMIT_PACKET_WRAPPER: number;

    NS_BWF: string;
    new (): XMPConstInstance;
    NS_DM: string;
    NS_DC: string;
    ARRAY_IS_ORDERED: string;
    // Class stuff.
}

interface XMPConstInstance {
    // Instance stuff.
}

declare const XMPConst: XMPConstConstructor | undefined;
