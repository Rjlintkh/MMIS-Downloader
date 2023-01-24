"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("node:readline/promises");
const fs = require("fs");
const url = require("url");
const path = require("path");
const node_process_1 = require("node:process");
const puppeteer_1 = require("puppeteer");
(async () => {
    console.log("Multimedia Information System E-BOOK Downloader");
    console.log("Disclaimer: I am not responsible for any legal issues that may arise from using this script. Use at your own risk.");
    const rl = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
    const coverUrl = await rl.question("Enter the URL for Cover Page of an E-BOOK: ");
    const browser = await puppeteer_1.default.launch({ headless: true });
    const [page] = await browser.pages();
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(coverUrl);
    const viewOnline = await page.waitForSelector("#_coverpage_WAR_mmisportalportlet_btnViewOnline, #_search_WAR_mmisportalportlet_btnViewOnline");
    console.log("E-BOOK found.");
    await viewOnline.click();
    const viewerPortlet = await page.waitForSelector("#viewerPortlet");
    const viewerUrl = await (await viewerPortlet.getProperty("src")).jsonValue();
    await page.goto(viewerUrl);
    await page.waitForSelector(".openseadragon-canvas");
    await page.waitForFunction(() => typeof EBOOK === "object");
    const ebook = await page.evaluate(() => EBOOK);
    console.log(`Title: ${ebook.title}`);
    async function getAllPageInfo() {
        return await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                const volumeIndex = CURRENT_VOL;
                const volumeXml = EBOOK.volumes[volumeIndex];
                const pages = volumeXml.pages;
                const allPageInfo = new Array();
                for (const page of pages) {
                    const no = parseInt(page.pageNo);
                    const url = EBookUtils.formatUrlToString(EBookUtils.generatePageUrl(SERVER_URL, ITEM_CODE, "", page.id, ENCTOKEN));
                    allPageInfo.push({
                        no,
                        url,
                    });
                }
                resolve(allPageInfo);
            });
        });
    }
    const allPageInfo = await getAllPageInfo();
    await browser.close();
    function getBibId(allPageInfo) {
        const sample = allPageInfo[0].url;
        const filename = url.parse(sample, true).query.ref;
        const paths = filename.split(path.sep);
        return paths[3];
    }
    const bibId = getBibId(allPageInfo);
    console.log(`Bib ID: ${bibId}`);
    console.log(`Pages: ${allPageInfo.length}`);
    console.log("All page URLs are fetched.");
    const confirmDownload = await rl.question("Download the images? (y/n): ");
    if (confirmDownload !== "y" && confirmDownload !== "Y") {
        console.log("Aborted.");
        return;
    }
    else {
        console.log("Downloading...");
    }
    if (!fs.existsSync("img")) {
        fs.mkdirSync("img");
    }
    let downloadCount = 0;
    for (const info of allPageInfo) {
        const response = await fetch(info.url);
        const buffer = await response.arrayBuffer();
        const filename = `${bibId}_${info.no}.jpg`;
        const filepath = path.join("img", filename);
        fs.writeFileSync(filepath, Buffer.from(buffer));
        downloadCount++;
    }
    console.log(`${downloadCount} images downloaded.`);
    const confirmBundle = await rl.question("Bundle the images into a pdf? (y/n): ");
    if (confirmBundle !== "y" && confirmBundle !== "Y") {
        console.log("Aborted.");
        return;
    }
    else {
        console.log("Bundling...");
    }
    if (!fs.existsSync("pdf")) {
        fs.mkdirSync("pdf");
    }
    const pdf = new (require("pdfkit"))({
        autoFirstPage: false
    });
    const pdfPath = path.join("pdf", `${bibId}.pdf`);
    pdf.pipe(fs.createWriteStream(pdfPath));
    console.log(`Pdf created at ${pdfPath}.`);
    for (const info of allPageInfo) {
        const filename = `${bibId}_${info.no}.jpg`;
        const filepath = path.join("img", filename);
        const img = pdf.openImage(filepath);
        pdf.addPage({ size: [img.width, img.height] });
        pdf.image(img, 0, 0);
    }
    pdf.end();
    const confirmDelete = await rl.question("Keep the downloaded images? (y/n): ");
    if (confirmDelete === "y" || confirmDelete === "Y") {
        console.log("Done.");
        process.exit(0);
        return;
    }
    else {
        console.log("Deleting...");
    }
    let deleteCount = 0;
    for (const info of allPageInfo) {
        const filename = `${bibId}_${info.no}.jpg`;
        const filepath = path.join("img", filename);
        fs.unlinkSync(filepath);
        deleteCount++;
    }
    console.log(`${deleteCount} images deleted.`);
    console.log("Done.");
    process.exit(0);
})();
