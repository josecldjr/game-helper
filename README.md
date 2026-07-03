# Model Sheet Cutter

A small static tool for slicing a horizontal model sheet into three PNG images.

## Features

- Load an image by drag and drop or file picker.
- Move two horizontal cut markers over the image.
- Generate three PNG slices into horizontally scrollable cards.
- Download each slice as a PNG.
- Non-blocking side notification after slicing.

## Local Run

Serve the folder with any static HTTP server:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Container

```sh
docker build -t ghcr.io/josecldjr/game-helper:latest .
docker run --rm -p 8080:80 ghcr.io/josecldjr/game-helper:latest
```
