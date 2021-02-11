"use strict"

import program from "commander"
import path from "path"
import chalk from "chalk"
import puppeteer from "puppeteer"
import slugify from "@sindresorhus/slugify"
import clipboardy from "clipboardy"

program
  .requiredOption("--url <url>", "YouTube URL")
  .option("--width <width>", "screenshot width", "1920")
  .option("--height <height>", "screenshot height", "1080")
  .option("--output <output>", "output folder", process.cwd())
  .option("--privacy", "use privacy-enhanced mode")
  .option("--clipboard", "copy markdown to clipboard")
  .option("--stdout", "output markdown to stdout")
program.parse(process.argv)

const run = async function () {
  let match: RegExpMatchArray
  if (
    !(match = program.url.match(
      /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]+)(&t=(\d+))?$/
    ))
  ) {
    console.error(
      chalk.red(
        "Invalid URL, expected format is https://www.youtube.com/watch?v=b9aMJZjZ4pw&t=0"
      )
    )
    process.exit(1)
  }

  const domain =
    program.privacy === true ? "www.youtube-nocookie.com" : "www.youtube.com"

  const videoId = match[1]

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Bridge browser console to Node (used while developing package)
  // page.on("console", (message) => console.log("Page log:", message))

  await page.setViewport({
    width: parseInt(program.width),
    height: parseInt(program.height),
    deviceScaleFactor: 1,
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
    path: path.resolve(program.output, filename),
  })
  await browser.close()
  const markdown = `[![${pageTitle}](${filename})](${program.url} "${pageTitle}")`
  if (program.stdout) {
    console.log(markdown)
  }
  if (program.clipboard) {
    await clipboardy.write(markdown)
  }
}

run()
