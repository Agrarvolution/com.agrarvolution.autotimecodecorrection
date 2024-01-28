XMPConst.NS_BWF = "http://ns.adobe.com/bwf/bext/1.0/";
function TimecodeThumbnail (thumbnail) {
    this.thumb = thumbnail;

    this.filename = thumbnail.name;

    this.xmp = new XMPMeta(thumbnail.synchronousMetadata.serialize());



}
TimecodeThumbnail.extractAudioMetadata = function (xmp) {

}