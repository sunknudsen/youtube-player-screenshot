"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const slugify_1 = __importDefault(require("@sindresorhus/slugify"));
const clipboardy_1 = __importDefault(require("clipboardy"));
commander_1.default
    .requiredOption("--url <url>", "YouTube URL")
    .option("--width <width>", "screenshot width", "680")
    .option("--height <height>", "screenshot height", "382")
    .option("--output <output>", "output folder", process.cwd())
    .option("--privacy", "use privacy-enhanced mode")
    .option("--clipboard", "copy markdown to clipboard")
    .option("--stdout", "output markdown to stdout");
commander_1.default.parse(process.argv);
const capture = async function () {
    let match;
    if (!(match = commander_1.default.url.match(/^https:\/\/www\.youtube\.com\/watch\?v=(\w+)(&t=(\d+))?$/))) {
        console.error(chalk_1.default.red("Invalid URL, expected format is https://www.youtube.com/watch?v=b9aMJZjZ4pw&t=0"));
        process.exit(1);
    }
    const domain = commander_1.default.privacy === true ? "www.youtube-nocookie.com" : "www.youtube.com";
    const videoId = match[1];
    const browser = await puppeteer_1.default.launch();
    const page = await browser.newPage();
    await page.goto(`https://${domain}/embed/${videoId}?rel=0`, {
        waitUntil: "networkidle0",
    });
    await page.setViewport({
        width: parseInt(commander_1.default.width),
        height: parseInt(commander_1.default.height),
        deviceScaleFactor: 2,
    });
    const pageTitle = await page.title();
    const filename = `${slugify_1.default(pageTitle.replace(/ \- YouTube$/, ""), {
        decamelize: false,
    })}.png`;
    await page.screenshot({
        path: path_1.default.resolve(commander_1.default.output, filename),
    });
    await browser.close();
    const markdown = `[![${pageTitle}](${filename})](${commander_1.default.url} "${pageTitle}")`;
    if (commander_1.default.stdout) {
        console.log(markdown);
    }
    if (commander_1.default.clipboard) {
        await clipboardy_1.default.write(markdown);
    }
};
capture();
//# sourceMappingURL=index.js.map