# SculptNG

SculptNG is a continuation of SculptGL created by Stephane Ginier.

Currently focused around bugfixes and modernizing the software build system, JS features, etc.

Contributors are welcome.

## Roadmap

- [ ] Remove little used features
- [ ] Clean up index pages
- [ ] Reorganize resources
- [ ] Convert to ES6 style classes
- [ ] Document modules, classes, methods, functions
- [ ] Add some tests around important invariants

## Developing

you will need to have `node` and `yarn` installed

SculptNG uses parcel for bundling and developer experience.

## Testing/Running

`yarn parcel` will bundle up the necessary resources and launch a dev server with hot reloading. It
uses the value of `source` in package.json as the entry point.

If things seem to get stuck, updated assets not being seen, or errors from parcel, you can delete
the `.parcel-cache` directory

`rm -rf .parcel-cache`

If you want to serve the built `dist/` directory after `yarn parcel build` you can use `python3 -m
http.server -d dist/`.

## Updating docs

Right now, `rm -rf docs` and `yarn parcel build --dist-dir docs --public-url="/sculpt_ng/"`

## Credits

Original Author: Stephane Ginier (<https://stephaneginier.com/>)

### Environments

The raw environments are from <https://hdrihaven.com/hdris>
