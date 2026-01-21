import {
	drawText,
	getTextHeight,
	splitText,
} from "https://cdn.jsdelivr.net/npm/canvas-txt@4.1.1/+esm";

const PRINT_PACKET_BYTES = 128;
const PRINT_START_COMMAND = [0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00];
const PRINT_END_COMMAND = new Uint8Array([0x1b, 0x64, 0x00]);

const buildPrintHeader = (mmWidth, bytesPerRow) => {
	return new Uint8Array([
		...PRINT_START_COMMAND,
		mmWidth % 256,
		Math.floor(mmWidth / 256),
		bytesPerRow % 256,
		Math.floor(bytesPerRow / 256),
	]);
};

const pixelIsWhite = (imageData, offset) => {
	const red = imageData[offset];
	const green = imageData[offset + 1];
	const blue = imageData[offset + 2];
	return red + green + blue > 0;
};

const canvasToPrintData = (canvas) => {
	const ctx = canvas.getContext("2d");
	const { width, height } = canvas;
	const imageData = ctx.getImageData(0, 0, width, height).data;
	const rowBytes = width / 8;
	const output = new Uint8Array(rowBytes * height + 8);
	let offset = 0;

	for (let y = 0; y < height; y += 1) {
		for (let xByte = 0; xByte < rowBytes; xByte += 1) {
			const startX = xByte * 8;
			let byte = 0;
			for (let bit = 0; bit < 8; bit += 1) {
				const pixelOffset = (width * y + startX + bit) * 4;
				const bitValue = pixelIsWhite(imageData, pixelOffset) ? 1 : 0;
				byte |= bitValue << (7 - bit);
			}
			output[offset++] = byte;
		}
	}

	return output;
};

const writePrintChunks = async (characteristic, data) => {
	for (let offset = 0; offset < data.length; offset += PRINT_PACKET_BYTES) {
		const chunk = data.slice(offset, offset + PRINT_PACKET_BYTES);
		await characteristic.writeValueWithResponse(chunk);
	}
};

const printCanvas = async (characteristic, canvas) => {
	const data = canvasToPrintData(canvas);
	const bytesPerRow = canvas.width / 8;
	const header = buildPrintHeader(bytesPerRow, data.length / bytesPerRow);

	await characteristic.writeValueWithResponse(header);
	await writePrintChunks(characteristic, data);
	await characteristic.writeValueWithResponse(PRINT_END_COMMAND);
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const labelSize = { width: 40, height: 12 };
const labelMargin = { x: 2, y: 0 };

const updatePreviewFrame = (canvas) => {
	const frame = $(".preview-frame");
	if (!frame) return;
	const rotatedWidth = canvas.height;
	const rotatedHeight = canvas.width;
	frame.style.width = `${rotatedWidth}px`;
	frame.style.height = `${rotatedHeight}px`;
};

const updateLabelSize = (canvas) => {
	const width = $("#labelWidth").valueAsNumber;
	const height = $("#labelHeight").valueAsNumber;
	const marginX = $("#labelMarginX").valueAsNumber;
	const marginY = $("#labelMarginY").valueAsNumber;
	if (isNaN(width) || isNaN(height)) return;

	labelSize.width = width;
	labelSize.height = height;
	labelMargin.x = isNaN(marginX) ? 0 : Math.max(0, marginX);
	labelMargin.y = isNaN(marginY) ? 0 : Math.max(0, marginY);

	// Printer orientation uses rotated canvas.
	canvas.width = labelSize.height * 8;
	canvas.height = labelSize.width * 8;
	updatePreviewFrame(canvas);
};

const getLabelBounds = (canvas) => {
	const labelWidth = canvas.height;
	const labelHeight = canvas.width;
	const marginX = labelMargin.x * 8;
	const marginY = labelMargin.y * 8;

	return {
		labelWidth,
		labelHeight,
		marginX,
		marginY,
		left: -labelWidth / 2 + marginX,
		right: labelWidth / 2 - marginX,
		top: -labelHeight / 2 + marginY,
		bottom: labelHeight / 2 - marginY,
	};
};

const clearCanvas = (canvas) => {
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const buildFontStyle = ({ fontStyle, fontVariant, fontWeight, fontSize, font }) =>
	`${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}px ${font}`.trim();

const underlineText = (ctx, text, options) => {
	const { x, y, width, height, align, vAlign, fontSize, font } = options;
	const fontStyle = options.fontStyle || "";
	const fontVariant = options.fontVariant || "";
	const fontWeight = options.fontWeight || "";
	const fontString = buildFontStyle({
		fontStyle,
		fontVariant,
		fontWeight,
		fontSize,
		font,
	});
	const lineHeight =
		options.lineHeight || getTextHeight({ ctx, text: "M", style: fontString });

	ctx.font = fontString;
	ctx.textAlign = align;
	ctx.textBaseline = vAlign === "top" ? "top" : "bottom";

	const lines = splitText({ ctx, text, justify: false, width });
	const drawHeight = lineHeight * (lines.length - 1);
	const bottom = y + height;
	let cursorY;
	if (vAlign === "top") {
		cursorY = y;
	} else if (vAlign === "bottom") {
		cursorY = bottom - drawHeight;
	} else {
		cursorY = y + height / 2 + fontSize / 2 - drawHeight / 2;
	}

	const lineOffset = Math.max(1, Math.floor(fontSize / 12));
	ctx.lineWidth = Math.max(1, Math.floor(fontSize / 16));
	ctx.strokeStyle = ctx.fillStyle;

	lines.forEach((line) => {
		const trimmed = line.trim();
		if (!trimmed) {
			cursorY += lineHeight;
			return;
		}
		const lineWidth = ctx.measureText(trimmed).width;
		let startX = x;
		if (align === "center") {
			startX = x + width / 2 - lineWidth / 2;
		} else if (align === "right") {
			startX = x + width - lineWidth;
		}
		const underlineY = cursorY + lineOffset;
		ctx.beginPath();
		ctx.moveTo(startX, underlineY);
		ctx.lineTo(startX + lineWidth, underlineY);
		ctx.stroke();
		cursorY += lineHeight;
	});
};

const renderTextBlock = (ctx, text, options) => {
	drawText(ctx, text, options);
	if (options.underline) {
		underlineText(ctx, text, options);
	}
};

const updateCanvasText = (canvas) => {
	const text = $("#textInput").value;
	const fontSize = $("#textSize").valueAsNumber;
	const font = $("#textFont").value;
	const align = $("#textAlign").value;
	const fontStyle = $("#textItalic").checked ? "italic" : "";
	const fontWeight = $("#textBold").checked ? "bold" : "";
	const underline = $("#textUnderline").checked;
	if (isNaN(fontSize)) return;

	const ctx = canvas.getContext("2d");
	clearCanvas(canvas);
	const bounds = getLabelBounds(canvas);

	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate(Math.PI / 2);

	ctx.fillStyle = "#000";
	renderTextBlock(ctx, text, {
		x: bounds.left,
		y: bounds.top,
		width: Math.max(0, bounds.right - bounds.left),
		height: Math.max(0, bounds.bottom - bounds.top),
		font,
		fontSize,
		fontStyle,
		fontWeight,
		underline,
		align,
	});

	ctx.rotate(-Math.PI / 2);
	ctx.translate(-canvas.width / 2, -canvas.height / 2);
};

const updateCanvasBarcode = (canvas) => {
	const barcodeData = $("#barcodeInput").value;
	const image = document.createElement("img");
	image.addEventListener("load", () => {
		const ctx = canvas.getContext("2d");
		clearCanvas(canvas);
		const bounds = getLabelBounds(canvas);
		const availableWidth = Math.max(0, bounds.right - bounds.left);
		const availableHeight = Math.max(0, bounds.bottom - bounds.top);

		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		const scale = Math.min(
			availableWidth / image.width,
			availableHeight / image.height,
			1
		);
		const drawWidth = image.width * scale;
		const drawHeight = image.height * scale;
		const drawX = bounds.left + (availableWidth - drawWidth) / 2;
		const drawY = bounds.top + (availableHeight - drawHeight) / 2;
		ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});

	JsBarcode(image, barcodeData, {
		format: "CODE128",
		width: 2,
		height: labelSize.height * 7,
		displayValue: false,
	});
};

const drawImageToCanvas = (ctx, url, options = {}) => {
	const {
		doScale = true,
		availableWidth = ctx.canvas.height,
		availableHeight = ctx.canvas.width,
		offsetX = -ctx.canvas.height / 2,
		offsetY = -ctx.canvas.width / 2,
		binarize = false,
	} = options;
	const img = new Image();
	img.addEventListener("load", () => {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		const scale = doScale ? Math.min(availableWidth / img.width, availableHeight / img.height) : 1;
		const drawWidth = Math.max(1, Math.round(img.width * scale));
		const drawHeight = Math.max(1, Math.round(img.height * scale));
		const drawX = offsetX + (availableWidth - drawWidth) / 2;
		const drawY = offsetY + (availableHeight - drawHeight) / 2;

		if (binarize) {
			const offscreen = document.createElement("canvas");
			offscreen.width = drawWidth;
			offscreen.height = drawHeight;
			const offCtx = offscreen.getContext("2d");
			offCtx.drawImage(img, 0, 0, drawWidth, drawHeight);
			const imageData = offCtx.getImageData(0, 0, drawWidth, drawHeight);
			const data = imageData.data;
			for (let i = 0; i < data.length; i += 4) {
				const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
				const value = luminance < 128 ? 0 : 255;
				data[i] = value;
				data[i + 1] = value;
				data[i + 2] = value;
			}
			offCtx.putImageData(imageData, 0, 0);
			ctx.drawImage(offscreen, drawX, drawY, drawWidth, drawHeight);
		} else {
			ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
		}

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2);
	});

	img.src = url;
};

const updateCanvasImage = (canvas) => {
	const ctx = canvas.getContext("2d");
	const file = $("#imageInput").files[0];
	if (!file) {
		clearCanvas(canvas);
		return;
	}
	const bounds = getLabelBounds(canvas);

	const reader = new FileReader();
	reader.addEventListener("load", (event) => {
		drawImageToCanvas(ctx, event.target.result, {
			doScale: true,
			availableWidth: Math.max(0, bounds.right - bounds.left),
			availableHeight: Math.max(0, bounds.bottom - bounds.top),
			offsetX: bounds.left,
			offsetY: bounds.top,
			binarize: true,
		});
	});

	reader.readAsDataURL(file);
};

const updateCanvasQR = async (canvas) => {
	const data = $("#qrInput").value;
	const ctx = canvas.getContext("2d");
	const bounds = getLabelBounds(canvas);
	const availableWidth = Math.max(0, bounds.right - bounds.left);
	const availableHeight = Math.max(0, bounds.bottom - bounds.top);
	const qrSize = Math.max(16, Math.floor(Math.min(availableWidth, availableHeight)));
	const qrImg = await QRCode.toDataURL(data, { width: qrSize, margin: 2 });
	drawImageToCanvas(ctx, qrImg, {
		doScale: false,
		availableWidth,
		availableHeight,
		offsetX: bounds.left,
		offsetY: bounds.top,
	});
};

const updateCanvasQRText = async (canvas) => {
	const data = $("#qrTextData").value;
	const text = $("#qrTextInput").value;
	const fontSize = $("#qrTextSize").valueAsNumber;
	const font = $("#qrTextFont").value;
	const align = $("#qrTextAlign").value;
	const fontStyle = $("#qrTextItalic").checked ? "italic" : "";
	const fontWeight = $("#qrTextBold").checked ? "bold" : "";
	const underline = $("#qrTextUnderline").checked;
	const ctx = canvas.getContext("2d");
	const { labelWidth, labelHeight, marginX, marginY } = getLabelBounds(canvas);
	const padding = 4;
	const gap = 6;
	const left = -labelWidth / 2 + marginX + padding;
	const top = -labelHeight / 2 + marginY + padding;
	const right = labelWidth / 2 - marginX - padding;
	const bottom = labelHeight / 2 - marginY - padding;
	const fallbackFontSize = Math.floor(labelHeight * 0.4);
	const resolvedFontSize = isNaN(fontSize)
		? Math.max(10, Math.min(48, fallbackFontSize))
		: Math.max(1, fontSize);

	clearCanvas(canvas);

	const maxQrSize = Math.max(16, Math.min(labelHeight - padding * 2, labelWidth - padding * 2));
	let qrSize = maxQrSize;
	if (text.trim()) {
		const minTextWidth = 32;
		const availableForQr = right - left - gap - minTextWidth;
		qrSize = Math.max(16, Math.min(maxQrSize, availableForQr));
	}

	const qrImg = await QRCode.toDataURL(data, { width: qrSize, margin: 1 });
	const image = new Image();
	image.addEventListener("load", () => {
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.rotate(Math.PI / 2);

		ctx.imageSmoothingEnabled = false;
		if (!text.trim()) {
			const drawX = -labelWidth / 2 + (labelWidth - qrSize) / 2;
			const drawY = -labelHeight / 2 + (labelHeight - qrSize) / 2;
			ctx.drawImage(image, drawX, drawY, qrSize, qrSize);
		} else {
			const qrX = left;
			const qrY = top;
			ctx.drawImage(image, qrX, qrY, qrSize, qrSize);

			ctx.fillStyle = "#000";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			const textX = qrX + qrSize + gap;
			const textY = top;
			const textWidth = Math.max(0, right - textX);
			const textHeight = Math.max(0, bottom - top);
			if (textWidth > 0 && textHeight > 0) {
				renderTextBlock(ctx, text, {
					x: textX,
					y: textY,
					width: textWidth,
					height: textHeight,
					font,
					fontSize: resolvedFontSize,
					fontStyle,
					fontWeight,
					underline,
					align,
				});
			}
		}

		ctx.rotate(-Math.PI / 2);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);
	});

	image.src = qrImg;
};

const layoutHandlers = {
	text: updateCanvasText,
	barcode: updateCanvasBarcode,
	image: updateCanvasImage,
	qr: updateCanvasQR,
	"qr-text": updateCanvasQRText,
};

const setActiveLayout = (layout, canvas) => {
	$$(".layout-fields").forEach((section) => {
		section.hidden = section.dataset.layout !== layout;
	});
	refreshPreview(layout, canvas);
};

const refreshPreview = (layout, canvas) => {
	const handler = layoutHandlers[layout];
	if (handler) handler(canvas);
};

const initialize = () => {
	const canvas = $("#previewCanvas");
	const printButton = $("#printButton");
	const printStatus = $("#printStatus");
	const printCopies = $("#printCopies");
	let printerDevice = null;
	let printerCharacteristic = null;
	updateLabelSize(canvas);
	setActiveLayout($("#layoutSelect").value, canvas);

	$("#layoutSelect").addEventListener("change", (event) => {
		setActiveLayout(event.target.value, canvas);
	});

	$$("#labelWidth, #labelHeight, #labelMarginX, #labelMarginY").forEach((input) =>
		input.addEventListener("input", () => {
			updateLabelSize(canvas);
			refreshPreview($("#layoutSelect").value, canvas);
		})
	);

	$$("#textInput, #textSize, #textFont, #textAlign, #textBold, #textItalic, #textUnderline").forEach(
		(input) => input.addEventListener("input", () => refreshPreview("text", canvas))
	);

	$("#barcodeInput").addEventListener("input", () => refreshPreview("barcode", canvas));
	$("#imageInput").addEventListener("change", () => refreshPreview("image", canvas));
	$("#qrInput").addEventListener("input", () => refreshPreview("qr", canvas));

	$$("#qrTextData, #qrTextInput, #qrTextSize, #qrTextFont, #qrTextAlign, #qrTextBold, #qrTextItalic, #qrTextUnderline").forEach(
		(input) => input.addEventListener("input", () => refreshPreview("qr-text", canvas))
	);

	const getPrinterCharacteristic = () => {
		if (printerDevice?.gatt?.connected && printerCharacteristic) {
			return Promise.resolve(printerCharacteristic);
		}

		const connectDevice = () => {
			return printerDevice.gatt
				.connect()
				.then((server) => server.getPrimaryService("0000ff00-0000-1000-8000-00805f9b34fb"))
				.then((service) => service.getCharacteristic("0000ff02-0000-1000-8000-00805f9b34fb"))
				.then((characteristic) => {
					printerCharacteristic = characteristic;
					printButton.textContent = "Print";
					printStatus.textContent = "Connected.";
					return characteristic;
				});
		};

		if (printerDevice) {
			return connectDevice();
		}

		return navigator.bluetooth
			.requestDevice({
				acceptAllDevices: true,
				optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"],
			})
			.then((device) => {
				printerDevice = device;
				device.addEventListener("gattserverdisconnected", () => {
					printButton.textContent = "Connect & print";
					printStatus.textContent = "Disconnected.";
				});
				return connectDevice();
			});
	};

	printButton.addEventListener("click", () => {
		printButton.disabled = true;
		const copies = Math.max(1, Math.floor(printCopies.valueAsNumber || 1));
		printStatus.textContent = printerDevice ? "Connecting..." : "Connecting to printer...";
		getPrinterCharacteristic()
			.then((characteristic) => {
				const jobs = Array.from({ length: copies }, () => () =>
					printCanvas(characteristic, canvas)
				);
				return jobs.reduce((promise, job) => promise.then(job), Promise.resolve());
			})
			.then(() => {
				printStatus.textContent = copies > 1 ? `Sent ${copies} copies.` : "Sent to printer.";
			})
			.catch((error) => {
				console.error(error);
				printStatus.textContent = "Failed to print. Check console.";
			})
			.finally(() => {
				printButton.disabled = false;
			});
	});
};

document.addEventListener("DOMContentLoaded", initialize);
