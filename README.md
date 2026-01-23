# Phomemo D30 Web Print

Browser-based label designer and Web Bluetooth printer workflow for the Phomemo D30.

## Features

- Text layout with font, size, alignment, bold/italic/underline controls
- Barcode + text layout (CODE128/CODE39/EAN-13/EAN-8/UPC) with optional value display
- Image + text layout with binarized image rendering
- QR Code + Text layout
- Adjustable label size, margins, and presets (6x22, 12x40, 14x30, 14x40)
- Multi-language UI (Japanese, Chinese, French, Spanish, German, English)
- Print history with previews, JSON import/export, and restore
- Multiple-copy printing over Web Bluetooth with connect/disconnect controls

## Requirements

- A Phomemo D30 printer
- A browser that supports Web Bluetooth (Chrome or Edge recommended)
- A secure context (HTTPS or `localhost`)

## Quick start

Open the GitHub Pages site in Chrome or Edge:

https://tanakamasayuki.github.io/phomemo-d30-web-print/

## How to use

1. Choose a layout (text, barcode + text, image + text, or QR code + text).
2. Enter your data and adjust font, size, and alignment.
3. Set label size and margins to match your roll.
4. Click "Connect & print" and select the Phomemo D30 in the browser dialog.
5. Use "History" to save previews or restore previous prints.

The preview canvas is rotated to match the printer's orientation.

## Notes

- Barcodes support CODE128, CODE39, EAN-13, EAN-8, and UPC.
- Images are converted to black/white before printing.
- The page loads fonts and libraries via CDN.

## Acknowledgments

Inspired by https://github.com/odensc/phomemo-d30-web-bluetooth.

## License

MIT. See `LICENSE`.
