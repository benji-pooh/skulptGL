# skulptGL
skulptGL is a continuation of SculptGL created by Stéphane Ginier.

Contributors are welcome.

## Developing

you will need to have `node` and `yarn` installed

skulptGL uses parcel for bundling and developer experience.

### Folders
- The `app` folder contains the app data.
- The `docs` folder contains the documentation.
- The `lib` folder contains the libraries.
- The `src` folder contains the skulptGL sources.
- The `app` folder contains the app data.
## Testing/Running

`yarn parcel` will bundle up the necessary resources and launch a dev server with hot reloading. It
uses the value of `source` in package.json as the entry point.

If things seem to get stuck, updated assets not being seen, or errors from parcel, you can delete
the `.parcel-cache` directory

`rm -rf .parcel-cache`

If you want to serve the built `dist/` directory after `yarn parcel build` you can use `python3 -m
http.server -d dist/`.


## Credits

Original Author: Stéphane Ginier (<https://stephaneginier.com/>)

### Environments

The raw environments are from <https://hdrihaven.com/hdris>
