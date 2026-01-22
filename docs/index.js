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
	const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
	return luminance > 200;
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
				const bitValue = pixelIsWhite(imageData, pixelOffset) ? 0 : 1;
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

const STORAGE_KEY = "phomemo-d30-web-print-state";
let currentLanguage = "en";

const I18N = {
	en: {
		"app.title": "Label Layout Builder",
		"hero.title": "Web Bluetooth Print",
		"language.title": "Language",
		"language.auto": "Auto (Browser)",
		"language.english": "English",
		"language.japanese": "Japanese",
		"language.chinese": "Chinese",
		"language.french": "French",
		"language.spanish": "Spanish",
		"layout.title": "Layout",
		"layout.choose": "Choose layout",
		"layout.text": "Text",
		"layout.imageText": "Image + Text",
		"layout.barcodeText": "Barcode + Text",
		"layout.qrText": "QR Code + Text",
		"text.title": "Text settings",
		"text.label": "Text",
		"barcode.title": "Barcode + Text settings",
		"barcode.type": "Barcode type",
		"barcode.type.code128": "CODE128",
		"barcode.type.code39": "CODE39",
		"barcode.type.ean13": "EAN-13(JAN-13)",
		"barcode.type.ean8": "EAN-8(JAN-8)",
		"barcode.type.upc": "UPC",
		"barcode.value": "Barcode value",
		"barcode.showValue": "Show barcode value",
		"image.title": "Image + Text settings",
		"image.file": "Image file",
		"qr.title": "QR Code + Text settings",
		"qr.data": "QR code data",
		"preview.title": "Preview",
		"preview.subtitle": "Canvas is rotated to match printer orientation.",
		"print.title": "Print",
		"print.helper": "Connect to the printer and send the current preview.",
		"print.copies": "Copies",
		"print.connect": "Connect & print",
		"label.title": "Label size",
		"label.preset": "Preset (Height x Width)",
		"label.choosePreset": "Choose a preset",
		"label.height": "Height (mm)",
		"label.width": "Width (mm)",
		"label.marginY": "Margin Y (mm)",
		"label.marginX": "Margin X (mm)",
		"common.font": "Font",
		"common.fontSize": "Font size (px)",
		"common.alignment": "Alignment",
		"common.alignCenter": "Center",
		"common.alignLeft": "Left",
		"common.alignRight": "Right",
		"common.bold": "Bold",
		"common.italic": "Italic",
		"common.underline": "Underline",
		"common.textOptional": "Text (optional)",
		"common.reset": "Reset",
		"print.status.connected": "Connected.",
		"print.status.disconnected": "Disconnected.",
		"print.status.connecting": "Connecting...",
		"print.status.connectingPrinter": "Connecting to printer...",
		"print.status.sent": "Sent to printer.",
		"print.status.sentCopies": "Sent {count} copies.",
		"print.status.failed": "Failed to print. Check console.",
		"print.button.print": "Print",
		"print.button.connect": "Connect & print",
		"error.barcode.required": "Barcode value is required.",
		"error.barcode.ean13": "EAN-13 accepts 12 or 13 digits only.",
		"error.barcode.ean8": "EAN-8 accepts 7 or 8 digits only.",
		"error.barcode.upc": "UPC accepts 11 or 12 digits only.",
		"error.barcode.code39":
			"CODE39 accepts A-Z, 0-9, space, and - . $ / + % only.",
		"error.barcode.code128": "CODE128 accepts ASCII printable characters only.",
		"error.barcode.invalid": "Invalid barcode value.",
	},
	ja: {
		"app.title": "ラベルレイアウトビルダー",
		"hero.title": "Web Bluetooth Print",
		"language.title": "言語",
		"language.auto": "自動（ブラウザ）",
		"language.english": "英語",
		"language.japanese": "日本語",
		"language.chinese": "中国語",
		"language.french": "フランス語",
		"language.spanish": "スペイン語",
		"layout.title": "レイアウト",
		"layout.choose": "レイアウトを選択",
		"layout.text": "テキスト",
		"layout.imageText": "画像＋テキスト",
		"layout.barcodeText": "バーコード＋テキスト",
		"layout.qrText": "QRコード＋テキスト",
		"text.title": "テキスト設定",
		"text.label": "テキスト",
		"barcode.title": "バーコード＋テキスト設定",
		"barcode.type": "バーコード種類",
		"barcode.type.code128": "CODE128",
		"barcode.type.code39": "CODE39",
		"barcode.type.ean13": "EAN-13(JAN-13)",
		"barcode.type.ean8": "EAN-8(JAN-8)",
		"barcode.type.upc": "UPC",
		"barcode.value": "バーコード値",
		"barcode.showValue": "バーコード値を表示",
		"image.title": "画像＋テキスト設定",
		"image.file": "画像ファイル",
		"qr.title": "QRコード＋テキスト設定",
		"qr.data": "QRコードデータ",
		"preview.title": "プレビュー",
		"preview.subtitle": "キャンバスはプリンターの向きに合わせて回転しています。",
		"print.title": "印刷",
		"print.helper": "プリンターに接続して現在のプレビューを送信します。",
		"print.copies": "部数",
		"print.connect": "接続して印刷",
		"label.title": "ラベルサイズ",
		"label.preset": "プリセット（縦×横）",
		"label.choosePreset": "プリセットを選択",
		"label.height": "高さ (mm)",
		"label.width": "幅 (mm)",
		"label.marginY": "余白Y (mm)",
		"label.marginX": "余白X (mm)",
		"common.font": "フォント",
		"common.fontSize": "フォントサイズ (px)",
		"common.alignment": "配置",
		"common.alignCenter": "中央",
		"common.alignLeft": "左寄せ",
		"common.alignRight": "右寄せ",
		"common.bold": "太字",
		"common.italic": "斜体",
		"common.underline": "下線",
		"common.textOptional": "テキスト（任意）",
		"common.reset": "初期化",
		"print.status.connected": "接続済み。",
		"print.status.disconnected": "切断しました。",
		"print.status.connecting": "接続中...",
		"print.status.connectingPrinter": "プリンターに接続中...",
		"print.status.sent": "送信しました。",
		"print.status.sentCopies": "{count}部送信しました。",
		"print.status.failed": "印刷に失敗しました。コンソールを確認してください。",
		"print.button.print": "印刷",
		"print.button.connect": "接続して印刷",
		"error.barcode.required": "バーコード値を入力してください。",
		"error.barcode.ean13": "EAN-13は12桁または13桁の数字のみです。",
		"error.barcode.ean8": "EAN-8は7桁または8桁の数字のみです。",
		"error.barcode.upc": "UPCは11桁または12桁の数字のみです。",
		"error.barcode.code39": "CODE39はA-Z、0-9、スペース、- . $ / + %のみです。",
		"error.barcode.code128": "CODE128は表示可能なASCII文字のみです。",
		"error.barcode.invalid": "バーコード値が無効です。",
	},
	zh: {
		"app.title": "标签版式生成器",
		"hero.title": "Web Bluetooth Print",
		"language.title": "语言",
		"language.auto": "自动（浏览器）",
		"language.english": "英语",
		"language.japanese": "日语",
		"language.chinese": "中文",
		"language.french": "法语",
		"language.spanish": "西班牙语",
		"layout.title": "布局",
		"layout.choose": "选择布局",
		"layout.text": "文本",
		"layout.imageText": "图片 + 文本",
		"layout.barcodeText": "条码 + 文本",
		"layout.qrText": "二维码 + 文本",
		"text.title": "文本设置",
		"text.label": "文本",
		"barcode.title": "条码 + 文本设置",
		"barcode.type": "条码类型",
		"barcode.type.code128": "CODE128",
		"barcode.type.code39": "CODE39",
		"barcode.type.ean13": "EAN-13(JAN-13)",
		"barcode.type.ean8": "EAN-8(JAN-8)",
		"barcode.type.upc": "UPC",
		"barcode.value": "条码值",
		"barcode.showValue": "显示条码值",
		"image.title": "图片 + 文本设置",
		"image.file": "图片文件",
		"qr.title": "二维码 + 文本设置",
		"qr.data": "二维码数据",
		"preview.title": "预览",
		"preview.subtitle": "画布已旋转以匹配打印机方向。",
		"print.title": "打印",
		"print.helper": "连接打印机并发送当前预览。",
		"print.copies": "份数",
		"print.connect": "连接并打印",
		"label.title": "标签尺寸",
		"label.preset": "预设（高 × 宽）",
		"label.choosePreset": "选择预设",
		"label.height": "高度 (mm)",
		"label.width": "宽度 (mm)",
		"label.marginY": "垂直边距 (mm)",
		"label.marginX": "水平边距 (mm)",
		"common.font": "字体",
		"common.fontSize": "字号 (px)",
		"common.alignment": "对齐",
		"common.alignCenter": "居中",
		"common.alignLeft": "左对齐",
		"common.alignRight": "右对齐",
		"common.bold": "加粗",
		"common.italic": "斜体",
		"common.underline": "下划线",
		"common.textOptional": "文本（可选）",
		"common.reset": "重置",
		"print.status.connected": "已连接。",
		"print.status.disconnected": "已断开。",
		"print.status.connecting": "连接中...",
		"print.status.connectingPrinter": "正在连接打印机...",
		"print.status.sent": "已发送到打印机。",
		"print.status.sentCopies": "已发送 {count} 份。",
		"print.status.failed": "打印失败。请检查控制台。",
		"print.button.print": "打印",
		"print.button.connect": "连接并打印",
		"error.barcode.required": "请输入条码值。",
		"error.barcode.ean13": "EAN-13 仅支持12或13位数字。",
		"error.barcode.ean8": "EAN-8 仅支持7或8位数字。",
		"error.barcode.upc": "UPC 仅支持11或12位数字。",
		"error.barcode.code39": "CODE39 仅支持 A-Z、0-9、空格以及 - . $ / + %。",
		"error.barcode.code128": "CODE128 仅支持可打印的 ASCII 字符。",
		"error.barcode.invalid": "条码值无效。",
	},
	fr: {
		"app.title": "Générateur de mise en page",
		"hero.title": "Web Bluetooth Print",
		"language.title": "Langue",
		"language.auto": "Auto (navigateur)",
		"language.english": "Anglais",
		"language.japanese": "Japonais",
		"language.chinese": "Chinois",
		"language.french": "Français",
		"language.spanish": "Espagnol",
		"layout.title": "Disposition",
		"layout.choose": "Choisir la disposition",
		"layout.text": "Texte",
		"layout.imageText": "Image + texte",
		"layout.barcodeText": "Code-barres + texte",
		"layout.qrText": "QR code + texte",
		"text.title": "Paramètres du texte",
		"text.label": "Texte",
		"barcode.title": "Paramètres code-barres + texte",
		"barcode.type": "Type de code-barres",
		"barcode.type.code128": "CODE128",
		"barcode.type.code39": "CODE39",
		"barcode.type.ean13": "EAN-13(JAN-13)",
		"barcode.type.ean8": "EAN-8(JAN-8)",
		"barcode.type.upc": "UPC",
		"barcode.value": "Valeur du code-barres",
		"barcode.showValue": "Afficher la valeur du code-barres",
		"image.title": "Paramètres image + texte",
		"image.file": "Fichier image",
		"qr.title": "Paramètres QR code + texte",
		"qr.data": "Données du QR code",
		"preview.title": "Aperçu",
		"preview.subtitle": "Le canevas est tourné pour correspondre à l'orientation de l'imprimante.",
		"print.title": "Imprimer",
		"print.helper": "Connectez l'imprimante et envoyez l'aperçu actuel.",
		"print.copies": "Copies",
		"print.connect": "Connecter et imprimer",
		"label.title": "Format d'étiquette",
		"label.preset": "Préréglage (hauteur × largeur)",
		"label.choosePreset": "Choisir un préréglage",
		"label.height": "Hauteur (mm)",
		"label.width": "Largeur (mm)",
		"label.marginY": "Marge Y (mm)",
		"label.marginX": "Marge X (mm)",
		"common.font": "Police",
		"common.fontSize": "Taille de police (px)",
		"common.alignment": "Alignement",
		"common.alignCenter": "Centré",
		"common.alignLeft": "Gauche",
		"common.alignRight": "Droite",
		"common.bold": "Gras",
		"common.italic": "Italique",
		"common.underline": "Souligné",
		"common.textOptional": "Texte (optionnel)",
		"common.reset": "Réinitialiser",
		"print.status.connected": "Connecté.",
		"print.status.disconnected": "Déconnecté.",
		"print.status.connecting": "Connexion...",
		"print.status.connectingPrinter": "Connexion à l'imprimante...",
		"print.status.sent": "Envoyé à l'imprimante.",
		"print.status.sentCopies": "{count} copies envoyées.",
		"print.status.failed": "Échec de l'impression. Vérifiez la console.",
		"print.button.print": "Imprimer",
		"print.button.connect": "Connecter et imprimer",
		"error.barcode.required": "La valeur du code-barres est requise.",
		"error.barcode.ean13": "EAN-13 accepte uniquement 12 ou 13 chiffres.",
		"error.barcode.ean8": "EAN-8 accepte uniquement 7 ou 8 chiffres.",
		"error.barcode.upc": "UPC accepte uniquement 11 ou 12 chiffres.",
		"error.barcode.code39": "CODE39 accepte uniquement A-Z, 0-9, espace et - . $ / + %.",
		"error.barcode.code128": "CODE128 accepte uniquement les caractères ASCII imprimables.",
		"error.barcode.invalid": "Valeur de code-barres invalide.",
	},
	es: {
		"app.title": "Generador de diseño",
		"hero.title": "Web Bluetooth Print",
		"language.title": "Idioma",
		"language.auto": "Auto (navegador)",
		"language.english": "Inglés",
		"language.japanese": "Japonés",
		"language.chinese": "Chino",
		"language.french": "Francés",
		"language.spanish": "Español",
		"layout.title": "Diseño",
		"layout.choose": "Elegir diseño",
		"layout.text": "Texto",
		"layout.imageText": "Imagen + texto",
		"layout.barcodeText": "Código de barras + texto",
		"layout.qrText": "QR + texto",
		"text.title": "Configuración de texto",
		"text.label": "Texto",
		"barcode.title": "Configuración de código de barras + texto",
		"barcode.type": "Tipo de código de barras",
		"barcode.type.code128": "CODE128",
		"barcode.type.code39": "CODE39",
		"barcode.type.ean13": "EAN-13(JAN-13)",
		"barcode.type.ean8": "EAN-8(JAN-8)",
		"barcode.type.upc": "UPC",
		"barcode.value": "Valor del código de barras",
		"barcode.showValue": "Mostrar valor del código de barras",
		"image.title": "Configuración de imagen + texto",
		"image.file": "Archivo de imagen",
		"qr.title": "Configuración de QR + texto",
		"qr.data": "Datos del QR",
		"preview.title": "Vista previa",
		"preview.subtitle": "El lienzo se rota para coincidir con la orientación de la impresora.",
		"print.title": "Imprimir",
		"print.helper": "Conecta la impresora y envía la vista previa actual.",
		"print.copies": "Copias",
		"print.connect": "Conectar e imprimir",
		"label.title": "Tamaño de etiqueta",
		"label.preset": "Preajuste (alto × ancho)",
		"label.choosePreset": "Elegir preajuste",
		"label.height": "Alto (mm)",
		"label.width": "Ancho (mm)",
		"label.marginY": "Margen Y (mm)",
		"label.marginX": "Margen X (mm)",
		"common.font": "Fuente",
		"common.fontSize": "Tamaño de fuente (px)",
		"common.alignment": "Alineación",
		"common.alignCenter": "Centro",
		"common.alignLeft": "Izquierda",
		"common.alignRight": "Derecha",
		"common.bold": "Negrita",
		"common.italic": "Cursiva",
		"common.underline": "Subrayado",
		"common.textOptional": "Texto (opcional)",
		"common.reset": "Restablecer",
		"print.status.connected": "Conectado.",
		"print.status.disconnected": "Desconectado.",
		"print.status.connecting": "Conectando...",
		"print.status.connectingPrinter": "Conectando a la impresora...",
		"print.status.sent": "Enviado a la impresora.",
		"print.status.sentCopies": "Se enviaron {count} copias.",
		"print.status.failed": "Error al imprimir. Revisa la consola.",
		"print.button.print": "Imprimir",
		"print.button.connect": "Conectar e imprimir",
		"error.barcode.required": "El valor del código de barras es obligatorio.",
		"error.barcode.ean13": "EAN-13 solo acepta 12 o 13 dígitos.",
		"error.barcode.ean8": "EAN-8 solo acepta 7 u 8 dígitos.",
		"error.barcode.upc": "UPC solo acepta 11 o 12 dígitos.",
		"error.barcode.code39": "CODE39 solo acepta A-Z, 0-9, espacio y - . $ / + %.",
		"error.barcode.code128": "CODE128 solo acepta caracteres ASCII imprimibles.",
		"error.barcode.invalid": "Valor de código de barras no válido.",
	},
};

const getLanguage = () => {
	const select = $("#languageSelect");
	if (select && select.value) {
		return select.value;
	}
	const raw = (navigator.language || "en").toLowerCase();
	if (raw.startsWith("ja")) return "ja";
	if (raw.startsWith("zh")) return "zh";
	if (raw.startsWith("fr")) return "fr";
	if (raw.startsWith("es")) return "es";
	return "en";
};

const t = (key, params = {}) => {
	const dict = I18N[currentLanguage] || I18N.en;
	let template = dict[key] || I18N.en[key] || key;
	Object.entries(params).forEach(([name, value]) => {
		template = template.replaceAll(`{${name}}`, String(value));
	});
	return template;
};

const applyTranslations = (language) => {
	const resolvedLanguage = language || getLanguage();
	currentLanguage = I18N[resolvedLanguage] ? resolvedLanguage : "en";
	document.documentElement.lang = currentLanguage;
	$$("[data-i18n]").forEach((element) => {
		element.textContent = t(element.dataset.i18n);
	});
	document.title = t("app.title");
};

const setBarcodeError = (message) => {
	const error = $("#barcodeError");
	if (error) {
		error.textContent = message || "";
		error.hidden = !message;
	}
	const input = $("#barcodeInput");
	if (input) {
		input.classList.toggle("is-error", Boolean(message));
	}
	const frame = $(".preview-frame");
	if (frame) {
		frame.classList.toggle("is-error", Boolean(message));
		if (message) {
			frame.dataset.error = message;
		} else {
			delete frame.dataset.error;
		}
	}
};

const validateBarcodeValue = (format, value) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "error.barcode.required";
	}

	switch (format) {
		case "EAN13":
			if (!/^\d{12,13}$/.test(trimmed)) {
				return "error.barcode.ean13";
			}
			return "";
		case "EAN8":
			if (!/^\d{7,8}$/.test(trimmed)) {
				return "error.barcode.ean8";
			}
			return "";
		case "UPC":
			if (!/^\d{11,12}$/.test(trimmed)) {
				return "error.barcode.upc";
			}
			return "";
		case "CODE39":
			if (!/^[0-9A-Z .\-$/+%]+$/.test(trimmed)) {
				return "error.barcode.code39";
			}
			return "";
		case "CODE128": {
			for (let i = 0; i < trimmed.length; i += 1) {
				const code = trimmed.charCodeAt(i);
				if (code < 32 || code > 126) {
					return "error.barcode.code128";
				}
			}
			return "";
		}
		default:
			return "";
	}
};

const saveFormState = () => {
	const state = {};
	$$("input, select, textarea").forEach((element) => {
		if (!element.id) return;
		if (element.type === "file") return;
		if (element.type === "checkbox") {
			state[element.id] = element.checked;
		} else {
			state[element.id] = element.value;
		}
	});
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const resetFormState = () => {
	localStorage.removeItem(STORAGE_KEY);
	$$("input, select, textarea").forEach((element) => {
		if (!element.id) return;
		if (element.type === "file") {
			element.value = "";
			return;
		}
		if (element.type === "checkbox" || element.type === "radio") {
			element.checked = element.defaultChecked;
			return;
		}
		if (element.tagName === "SELECT") {
			const defaultOption = element.querySelector("option[selected]") || element.options[0];
			element.value = defaultOption ? defaultOption.value : "";
			return;
		}
		element.value = element.defaultValue;
	});
	setBarcodeError("");
};

const restoreFormState = () => {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (!saved) return;
	try {
		const state = JSON.parse(saved);
		$$("input, select, textarea").forEach((element) => {
			if (!element.id || !(element.id in state)) return;
			if (element.type === "file") return;
			if (element.type === "checkbox") {
				element.checked = Boolean(state[element.id]);
			} else {
				element.value = state[element.id];
			}
		});
	} catch (error) {
		console.error(error);
	}
};

const labelSize = { width: 40, height: 12 };
const labelMargin = { x: 2, y: 0 };

const getEffectiveLabelHeight = () => (labelSize.height === 6 ? 12 : labelSize.height);

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
	canvas.width = getEffectiveLabelHeight() * 8;
	canvas.height = labelSize.width * 8;
	updatePreviewFrame(canvas);
};

const createLayoutCanvas = () => {
	const tempCanvas = document.createElement("canvas");
	tempCanvas.width = labelSize.height * 8;
	tempCanvas.height = labelSize.width * 8;
	return tempCanvas;
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
	const format = $("#barcodeFormat").value;
	const showValue = $("#barcodeShowValue").checked;
	const text = $("#barcodeTextInput").value;
	const fontSize = $("#barcodeTextSize").valueAsNumber;
	const font = $("#barcodeTextFont").value;
	const fontStyle = $("#barcodeTextItalic").checked ? "italic" : "";
	const fontWeight = $("#barcodeTextBold").checked ? "bold" : "";
	const underline = $("#barcodeTextUnderline").checked;
	const bounds = getLabelBounds(canvas);
	const availableWidth = Math.max(0, bounds.right - bounds.left);
	const availableHeight = Math.max(0, bounds.bottom - bounds.top);
	const barcodeMargin = 2;
	const valueFontSize = Math.max(10, Math.floor(labelSize.height * 2));
	const valueMargin = 4;
	const barcodeHeight = Math.max(
		1,
		Math.round(showValue ? availableHeight - valueFontSize - valueMargin : availableHeight)
	);
	const validationKey = validateBarcodeValue(format, barcodeData);
	const validationMessage = validationKey ? t(validationKey) : "";
	setBarcodeError(validationMessage);
	if (validationMessage) {
		clearCanvas(canvas);
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		const image = document.createElement("img");
		image.addEventListener("load", () => {
			const ctx = canvas.getContext("2d");
			clearCanvas(canvas);
			const resolvedFontSize = isNaN(fontSize)
				? Math.max(10, Math.min(48, Math.floor(availableHeight * 0.5)))
				: Math.max(1, fontSize);

			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate(Math.PI / 2);

			ctx.imageSmoothingEnabled = false;
			const drawBarcodeBlock = (areaLeft, areaTop, areaWidth, areaHeight, align) => {
				const scale = Math.min(1, areaWidth / image.width, areaHeight / image.height);
				const drawWidth = Math.max(1, Math.round(image.width * scale));
				const drawHeight = Math.max(1, Math.round(image.height * scale));
				const drawX =
					align === "left"
						? areaLeft
						: areaLeft + (areaWidth - drawWidth) / 2;
				const drawY = areaTop + (areaHeight - drawHeight) / 2;
				ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

				return drawWidth;
			};

			const barcodeTop = bounds.top + barcodeMargin;
			const barcodeHeightWithMargin = Math.max(0, availableHeight - barcodeMargin * 2);
			const textTop = bounds.top + barcodeMargin;
			const textHeightWithMargin = Math.max(0, availableHeight - barcodeMargin * 2);

			if (!text.trim()) {
				drawBarcodeBlock(
					bounds.left,
					barcodeTop,
					availableWidth,
					barcodeHeightWithMargin,
					"center"
				);
			} else {
				const gap = 6;
				const minTextWidth = 32;
				const barcodeWidth = Math.max(16, availableWidth - gap - minTextWidth);
				const drawWidth = drawBarcodeBlock(
					bounds.left,
					barcodeTop,
					barcodeWidth,
					barcodeHeightWithMargin,
					"left"
				);

				const textX = bounds.left + drawWidth + gap;
				const textY = textTop;
				const textWidth = Math.max(0, availableWidth - drawWidth - gap);
				const textHeight = textHeightWithMargin;
				if (textWidth > 0 && textHeight > 0) {
					ctx.fillStyle = "#000";
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
						align: "left",
					});
				}
			}

			ctx.rotate(-Math.PI / 2);
			ctx.translate(-canvas.width / 2, -canvas.height / 2);
			resolve();
		});

		image.addEventListener("error", () => resolve());

		try {
			JsBarcode(image, barcodeData, {
				format,
				width: 2,
				height: barcodeHeight,
				displayValue: showValue,
				textMargin: valueMargin,
				fontSize: valueFontSize,
			});
		} catch (error) {
			console.error(error);
			clearCanvas(canvas);
			setBarcodeError(t("error.barcode.invalid"));
			resolve();
		}
	});
};

const drawBinarizedImage = (ctx, img, drawX, drawY, drawWidth, drawHeight) => {
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
};

const updateCanvasImage = (canvas) => {
	const ctx = canvas.getContext("2d");
	const file = $("#imageInput").files[0];
	const text = $("#imageTextInput").value;
	const fontSize = $("#imageTextSize").valueAsNumber;
	const font = $("#imageTextFont").value;
	const fontStyle = $("#imageTextItalic").checked ? "italic" : "";
	const fontWeight = $("#imageTextBold").checked ? "bold" : "";
	const underline = $("#imageTextUnderline").checked;
	if (!file) {
		clearCanvas(canvas);
		return Promise.resolve();
	}
	const bounds = getLabelBounds(canvas);
	const availableWidth = Math.max(0, bounds.right - bounds.left);
	const availableHeight = Math.max(0, bounds.bottom - bounds.top);
	const resolvedFontSize = isNaN(fontSize)
		? Math.max(10, Math.min(48, Math.floor(availableHeight * 0.5)))
		: Math.max(1, fontSize);

	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.addEventListener("load", (event) => {
			const image = new Image();
			image.addEventListener("load", () => {
				clearCanvas(canvas);
				ctx.translate(canvas.width / 2, canvas.height / 2);
				ctx.rotate(Math.PI / 2);

				ctx.imageSmoothingEnabled = false;
				if (!text.trim()) {
					const scale = Math.min(
						availableWidth / image.width,
						availableHeight / image.height,
						1
					);
					const drawWidth = Math.max(1, Math.round(image.width * scale));
					const drawHeight = Math.max(1, Math.round(image.height * scale));
					const drawX = bounds.left + (availableWidth - drawWidth) / 2;
					const drawY = bounds.top + (availableHeight - drawHeight) / 2;
					drawBinarizedImage(ctx, image, drawX, drawY, drawWidth, drawHeight);
				} else {
					const gap = 6;
					const minTextWidth = 32;
					const maxImageWidth = Math.max(16, availableWidth - gap - minTextWidth);

					const scale = Math.min(
						maxImageWidth / image.width,
						availableHeight / image.height,
						1
					);
					const drawWidth = Math.max(1, Math.round(image.width * scale));
					const drawHeight = Math.max(1, Math.round(image.height * scale));
					const drawX = bounds.left;
					const drawY = bounds.top + (availableHeight - drawHeight) / 2;
					drawBinarizedImage(ctx, image, drawX, drawY, drawWidth, drawHeight);

					const textX = bounds.left + drawWidth + gap;
					const textY = bounds.top;
					const textHeight = availableHeight;
					const textWidth = Math.max(0, availableWidth - drawWidth - gap);
					if (textWidth > 0 && textHeight > 0) {
						ctx.fillStyle = "#000";
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
							align: "left",
						});
					}
				}

				ctx.rotate(-Math.PI / 2);
				ctx.translate(-canvas.width / 2, -canvas.height / 2);
				resolve();
			});
			image.addEventListener("error", () => resolve());
			image.src = event.target.result;
		});
		reader.addEventListener("error", () => resolve());
		reader.readAsDataURL(file);
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

	try {
		const qrImg = await QRCode.toDataURL(data, { width: qrSize, margin: 1 });
		return new Promise((resolve) => {
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
				resolve();
			});
			image.addEventListener("error", () => resolve());
			image.src = qrImg;
		});
	} catch (error) {
		console.error(error);
		return Promise.resolve();
	}
};

const layoutHandlers = {
	text: updateCanvasText,
	barcode: updateCanvasBarcode,
	image: updateCanvasImage,
	"qr-text": updateCanvasQRText,
};

const setActiveLayout = (layout, canvas) => {
	$$(".layout-fields").forEach((section) => {
		section.hidden = section.dataset.layout !== layout;
	});
	refreshPreview(layout, canvas);
};

const copyToDoubleHeightCanvas = (sourceCanvas, targetCanvas) => {
	const ctx = targetCanvas.getContext("2d");
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
	ctx.drawImage(sourceCanvas, 0, 0);
	ctx.drawImage(sourceCanvas, sourceCanvas.width, 0);
};

const refreshPreview = (layout, canvas) => {
	const handler = layoutHandlers[layout];
	if (!handler) return;
	if (layout !== "barcode") {
		setBarcodeError("");
	}
	if (labelSize.height === 6) {
		const tempCanvas = createLayoutCanvas();
		const result = handler(tempCanvas);
		if (result && typeof result.then === "function") {
			result.then(() => copyToDoubleHeightCanvas(tempCanvas, canvas));
		} else {
			copyToDoubleHeightCanvas(tempCanvas, canvas);
		}
	} else {
		handler(canvas);
	}
};

const initialize = () => {
	const canvas = $("#previewCanvas");
	const printButton = $("#printButton");
	const printStatus = $("#printStatus");
	const printCopies = $("#printCopies");
	let printerDevice = null;
	let printerCharacteristic = null;
	restoreFormState();
	applyTranslations();
	updateLabelSize(canvas);
	setActiveLayout($("#layoutSelect").value, canvas);

	$("#languageSelect").addEventListener("change", (event) => {
		applyTranslations(event.target.value);
		refreshPreview($("#layoutSelect").value, canvas);
		saveFormState();
	});

	$("#layoutSelect").addEventListener("change", (event) => {
		setActiveLayout(event.target.value, canvas);
		saveFormState();
	});

	$$("#labelWidth, #labelHeight, #labelMarginX, #labelMarginY").forEach((input) =>
		input.addEventListener("input", () => {
			updateLabelSize(canvas);
			refreshPreview($("#layoutSelect").value, canvas);
			saveFormState();
		})
	);
	$("#labelPreset").addEventListener("change", (event) => {
		const [height, width] = event.target.value.split("x").map((value) => Number(value));
		if (Number.isFinite(height) && Number.isFinite(width)) {
			$("#labelHeight").value = height;
			$("#labelWidth").value = width;
			updateLabelSize(canvas);
			refreshPreview($("#layoutSelect").value, canvas);
		}
		saveFormState();
	});

	$$("#textInput, #textSize, #textFont, #textAlign, #textBold, #textItalic, #textUnderline").forEach(
		(input) =>
			input.addEventListener("input", () => {
				refreshPreview("text", canvas);
				saveFormState();
			})
	);

	$$("#barcodeInput, #barcodeFormat, #barcodeShowValue").forEach((input) =>
		input.addEventListener("input", () => {
			refreshPreview("barcode", canvas);
			saveFormState();
		})
	);
	$$("#barcodeTextInput, #barcodeTextSize, #barcodeTextFont, #barcodeTextBold, #barcodeTextItalic, #barcodeTextUnderline").forEach(
		(input) =>
			input.addEventListener("input", () => {
				refreshPreview("barcode", canvas);
				saveFormState();
			})
	);
	$("#imageInput").addEventListener("change", () => {
		refreshPreview("image", canvas);
		saveFormState();
	});
	$$("#imageTextInput, #imageTextSize, #imageTextFont, #imageTextBold, #imageTextItalic, #imageTextUnderline").forEach(
		(input) =>
			input.addEventListener("input", () => {
				refreshPreview("image", canvas);
				saveFormState();
			})
	);
	$$("#qrTextData, #qrTextInput, #qrTextSize, #qrTextFont, #qrTextAlign, #qrTextBold, #qrTextItalic, #qrTextUnderline").forEach(
		(input) =>
			input.addEventListener("input", () => {
				refreshPreview("qr-text", canvas);
				saveFormState();
			})
	);
	$("#resetButton").addEventListener("click", () => {
		resetFormState();
		updateLabelSize(canvas);
		setActiveLayout($("#layoutSelect").value, canvas);
	});

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
						printButton.textContent = t("print.button.print");
						printStatus.textContent = t("print.status.connected");
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
					printButton.textContent = t("print.button.connect");
					printStatus.textContent = t("print.status.disconnected");
				});
				return connectDevice();
			});
	};

	printButton.addEventListener("click", () => {
		printButton.disabled = true;
		const copies = Math.max(1, Math.floor(printCopies.valueAsNumber || 1));
		printStatus.textContent = printerDevice
			? t("print.status.connecting")
			: t("print.status.connectingPrinter");
		getPrinterCharacteristic()
			.then((characteristic) => {
				const jobs = Array.from({ length: copies }, () => () =>
					printCanvas(characteristic, canvas)
				);
				return jobs.reduce((promise, job) => promise.then(job), Promise.resolve());
			})
			.then(() => {
				printStatus.textContent =
					copies > 1
						? t("print.status.sentCopies", { count: copies })
						: t("print.status.sent");
			})
			.catch((error) => {
				console.error(error);
				printStatus.textContent = t("print.status.failed");
			})
			.finally(() => {
				printButton.disabled = false;
			});
	});
};

document.addEventListener("DOMContentLoaded", initialize);
