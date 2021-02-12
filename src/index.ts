"use strict"

import program, {
  Option as CommanderOption,
  InvalidOptionArgumentError as CommanderInvalidOptionError,
} from "commander"
import path from "path"
import puppeteer from "puppeteer"
import slugify from "@sindresorhus/slugify"
import clipboardy from "clipboardy"

const youtubeUrlRegExp = new RegExp(
  /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]+)(&t=(\d+))?$/
)

const parseUrl = function (value: string) {
  if (!value.match(youtubeUrlRegExp)) {
    throw new CommanderInvalidOptionError("Invalid URL")
  }
  return value
}

program
  .addOption(
    new CommanderOption("--url <url>", "YouTube URL")
      .argParser(parseUrl)
      .makeOptionMandatory(true)
  )
  .option("--width <width>", "screenshot width", "1920")
  .option("--height <height>", "screenshot height", "1080")
  .option("--output <output>", "output folder", process.cwd())
  .option("--privacy", "use privacy-enhanced mode")
  .option("--clipboard", "copy markdown to clipboard")
  .option("--stdout", "output markdown to stdout")
program.parse(process.argv)

const options = program.opts()

const run = async function () {
  const domain =
    options.privacy === true ? "www.youtube-nocookie.com" : "www.youtube.com"
  const videoId = options.url.match(youtubeUrlRegExp)[1]

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Bridge browser console to Node (used while developing package)
  // page.on("console", (message) => console.log("Page log:", message))

  await page.setViewport({
    width: parseInt(options.width) / 2,
    height: parseInt(options.height) / 2,
    deviceScaleFactor: 2,
  })

  await page.goto(`https://${domain}/embed/${videoId}?modestbranding=1&rel=0`, {
    waitUntil: "networkidle0",
  })

  // Remove "Watch as YouTube"
  await page.evaluate((selector) => {
    const node = document.querySelector(selector)
    if (node) {
      node.parentNode.removeChild(node)
    }
  }, ".ytp-impression-link")

  // Find video title
  const pageTitle = await page.evaluate((selector) => {
    const node = document.querySelector(selector)
    return node.innerText
  }, ".ytp-title-link")

  if (!pageTitle) {
    throw new Error("Could not find video title")
  }

  const filename = `${slugify(pageTitle, {
    decamelize: false,
  })}.png`

  await page.screenshot({
    path: path.resolve(options.output, filename),
  })
  await browser.close()
  const markdown = `[![${pageTitle}](${filename})](${options.url} "${pageTitle}")`
  if (options.stdout) {
    console.info(markdown)
  }
  if (options.clipboard) {
    await clipboardy.write(markdown)
  }
}

run()
