"use strict"

import {
  program,
  Option as CommanderOption,
  InvalidArgumentError as CommanderInvalidArgumentError,
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
    throw new CommanderInvalidArgumentError("Invalid URL")
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
  .option("--scale <scale>", "scale factor", "2")
  .addOption(
    new CommanderOption("--type <type>", "screenshot type")
      .choices(["jpeg", "png"])
      .default("png")
  )
  .option("--output <output>", "output folder", process.cwd())
  .option("--privacy", "use privacy-conscious mode")
  .option("--clipboard", "copy markdown to clipboard")
  .option("--stdout", "output markdown to stdout")

program.parse(process.argv)

const options = program.opts()

const run = async function () {
  try {
    const domain =
      options.privacy === true ? "www.youtube-nocookie.com" : "www.youtube.com"
    const videoId = options.url.match(youtubeUrlRegExp)[1]

    const browser = await puppeteer.launch({ headless: "new" })
    const page = await browser.newPage()

    // Bridge page console to Node (used while developing package)
    // See https://pptr.dev/guides/debugging#capture-console-output
    // page.on("console", (msg) => {
    //   console.log(`Page console.${msg.type()}`, msg.text())
    // })

    await page.setViewport({
      width: parseFloat(options.width) / parseFloat(options.scale),
      height: parseFloat(options.height) / parseFloat(options.scale),
      deviceScaleFactor: parseFloat(options.scale),
    })

    await page.goto(
      `https://${domain}/embed/${videoId}?modestbranding=1&rel=0`,
      {
        waitUntil: "networkidle0",
      }
    )

    // Remove "Watch on YouTube"
    await page.evaluate((selector) => {
      const node = document.querySelector(selector)
      if (node) {
        node.parentNode.removeChild(node)
      }
    }, ".ytp-impression-link")

    // Find video title
    const pageTitle = await page.evaluate((selector) => {
      const node = document.querySelector(selector)
      return node.textContent
    }, ".ytp-title-link")

    if (!pageTitle) {
      throw new Error("Could not find video title")
    }

    const filename = `${slugify(pageTitle, {
      decamelize: false,
    })}.${options.type === "jpeg" ? "jpg" : "png"}`

    await page.screenshot({
      path: path.resolve(options.output, filename),
      type: options.type,
    })
    await browser.close()
    const markdown = `[![${pageTitle}](${filename})](${options.url} "${pageTitle}")`
    if (options.stdout) {
      console.info(markdown)
    }
    if (options.clipboard) {
      await clipboardy.write(markdown)
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

run()
