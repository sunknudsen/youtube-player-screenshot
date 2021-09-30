"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const slugify_1 = __importDefault(require("@sindresorhus/slugify"));
const clipboardy_1 = __importDefault(require("clipboardy"));
const youtubeUrlRegExp = new RegExp(/^https:\/\/www\.youtube\.com\/watch\?v=([\w-]+)(&t=(\d+))?$/);
const parseUrl = function (value) {
    if (!value.match(youtubeUrlRegExp)) {
        throw new commander_1.InvalidOptionArgumentError("Invalid URL");
    }
    return value;
};
commander_1.program
    .addOption(new commander_1.Option("--url <url>", "YouTube URL")
    .argParser(parseUrl)
    .makeOptionMandatory(true))
    .option("--width <width>", "screenshot width", "1920")
    .option("--height <height>", "screenshot height", "1080")
    .option("--output <output>", "output folder", process.cwd())
    .option("--privacy", "use privacy-enhanced mode")
    .option("--clipboard", "copy markdown to clipboard")
    .option("--stdout", "output markdown to stdout");
commander_1.program.parse(process.argv);
const options = commander_1.program.opts();
const run = async function () {
    try {
        const domain = options.privacy === true ? "www.youtube-nocookie.com" : "www.youtube.com";
        const videoId = options.url.match(youtubeUrlRegExp)[1];
        const browser = await puppeteer_1.default.launch();
        const page = await browser.newPage();
        // Bridge browser console to Node (used while developing package)
        // page.on("console", (message) => console.log("Page log:", message))
        await page.setViewport({
            width: parseInt(options.width) / 2,
            height: parseInt(options.height) / 2,
            deviceScaleFactor: 2,
        });
        await page.goto(`https://${domain}/embed/${videoId}?modestbranding=1&rel=0`, {
            waitUntil: "networkidle0",
        });
        // Remove "Watch as YouTube"
        await page.evaluate((selector) => {
            const node = document.querySelector(selector);
            if (node) {
                node.parentNode.removeChild(node);
            }
        }, ".ytp-impression-link");
        // Find video title
        const pageTitle = await page.evaluate((selector) => {
            const node = document.querySelector(selector);
            return node.innerText;
        }, ".ytp-title-link");
        if (!pageTitle) {
            throw new Error("Could not find video title");
        }
        const filename = `${(0, slugify_1.default)(pageTitle, {
            decamelize: false,
        })}.png`;
        await page.screenshot({
            path: path_1.default.resolve(options.output, filename),
        });
        await browser.close();
        const markdown = `[![${pageTitle}](${filename})](${options.url} "${pageTitle}")`;
        if (options.stdout) {
            console.info(markdown);
        }
        if (options.clipboard) {
            await clipboardy_1.default.write(markdown);
        }
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
};
run();
//# sourceMappingURL=index.js.map