
/** A simple image loader class */
class ImageLoader {

    /** Loads an image from the given url returning a ImageBitmap */
    static async loadImage(url_or_blob: string | Blob): Promise<ImageBitmap> {
        let blob
        if (typeof url_or_blob == "string") {
            blob = await fetch(url_or_blob).then((response) => response.blob());
        } else {
            blob = url_or_blob;
        }
        return await createImageBitmap(blob);
    }
}

export default ImageLoader;