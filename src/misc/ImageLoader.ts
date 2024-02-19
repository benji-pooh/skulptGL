
/** A simple image loader class */
class ImageLoader {

    /** Loads an image from the given url returning a ImageBitmap */
    static async loadImageUrl(url: string): Promise<ImageBitmap> {
        let blob = await fetch(url).then((response) => response.blob());
        return await createImageBitmap(blob,);
    }
}

export default ImageLoader;