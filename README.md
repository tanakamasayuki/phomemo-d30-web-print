# Phomemo D30 Web Print

Browser-based label designer and Web Bluetooth printer workflow for the Phomemo D30.

## Features

- Text layouts with font, size, alignment, bold/italic/underline controls
- CODE128 barcode layout
- Image layout with auto-binarization for print clarity
- QR code layout and QR + text layout
- Adjustable label size and margins with live canvas preview
- Multiple-copy printing over Web Bluetooth

## Requirements

- A Phomemo D30 printer
- A browser that supports Web Bluetooth (Chrome or Edge recommended)
- A secure context (HTTPS or `localhost`)

## Quick start

Open the GitHub Pages site in Chrome or Edge:

https://tanakamasayuki.github.io/phomemo-d30-web-print/

## How to use

1. Choose a layout (text, barcode, image, QR, or QR + text).
2. Enter your data and adjust font, size, and alignment.
3. Set label size and margins to match your roll.
4. Click "Connect & print" and select the Phomemo D30 in the browser dialog.

The preview canvas is rotated to match the printer's orientation.

## Notes

- Barcodes are generated with CODE128.
- Images are converted to black/white before printing.
- The page loads fonts and libraries via CDN.

## Acknowledgments

Inspired by https://github.com/odensc/phomemo-d30-web-bluetooth.

## License

MIT. See `LICENSE`.
