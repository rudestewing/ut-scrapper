import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import dotenv from 'dotenv';

dotenv.config();

// Constants
const CONFIG = {
  BASE_URL: 'https://univterbuka.kotobee.com',
  DEFAULT_BOOK_ID: '88480',
  DEFAULT_START: 0,
  DEFAULT_END: 5,
  TIMEOUT: {
    NAVIGATION: 60000,
    URL_MATCH: 30000,
    URL_MATCH_FIRST: 60000,
    SELECTOR: 30000,
    RENDER_DELAY: 2000,
  },
  PDF: {
    WIDTH: '176mm',
    HEIGHT: '250mm',
    MARGIN: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
  },
  SELECTORS: {
    EPUB_CONTENT: '#epubContent',
  },
};

/**
 * Parse command line arguments
 * @returns {Object} Parsed parameters {id, start, end, name}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    id: CONFIG.DEFAULT_BOOK_ID,
    start: CONFIG.DEFAULT_START,
    end: CONFIG.DEFAULT_END,
    name: '',
  };

  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    switch (key) {
      case '--id':
        params.id = value;
        break;
      case '--start':
        params.start = parseInt(value, 10);
        break;
      case '--end':
        params.end = parseInt(value, 10);
        break;
      case '--name':
        params.name = value || '';
        break;
    }
  });

  return params;
}

const { id: bookID, start, end, name: bookName } = parseArgs();
console.log(`Book ID: ${bookID}, Start: ${start}, End: ${end}, Name: ${bookName || '(default)'}`);

/**
 * Generate chapter URL
 * @param {string} bookID - Book identifier
 * @param {number} chapterNumber - Chapter index
 * @returns {string} Full chapter URL
 */
function getChapterUrl(bookID, chapterNumber) {
  return `${CONFIG.BASE_URL}/#/book/${bookID}/reader/chapter/${chapterNumber}`;
}

/**
 * Create HTML template with content and styles
 * @param {string} content - HTML content
 * @param {string} styles - CSS styles
 * @returns {string} Complete HTML template
 */
function createHtmlTemplate(content, styles) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Reset styles */
    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      position: relative !important;
    }

    /* Override container restrictions */
    #epubContainer {
      width: 100% !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: none !important;
      overflow: visible !important;
      position: relative !important;
      bottom: 0 !important;
    }

    #epubContent {
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      position: relative !important;
    }

    /* Original styles from page */
    ${styles}
  </style>
</head>
<body>
  <div id="epubContainer" class="stylesEnabled">
    ${content}
  </div>
</body>
</html>
  `;
}

/**
 * Extract content and styles from the page
 * @param {Page} page - Puppeteer page instance
 * @returns {Promise<{content: string, styles: string}>}
 */
async function extractPageContent(page) {
  return await page.evaluate(() => {
    const epubContent = document.querySelector('#epubContent');
    const content = epubContent ? epubContent.outerHTML : '';

    const styles = [];

    // Get all style tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach((tag) => {
      styles.push(tag.innerHTML);
    });

    // Get all linked stylesheets
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach((link) => {
      try {
        const sheet = link.sheet;
        if (sheet && sheet.cssRules) {
          let css = '';
          for (let rule of sheet.cssRules) {
            css += rule.cssText + '\n';
          }
          styles.push(css);
        }
      } catch (e) {
        console.log('Could not access stylesheet:', link.href);
      }
    });

    return { content, styles: styles.join('\n') };
  });
}

/**
 * Navigate to and wait for chapter to load
 * @param {Page} page - Puppeteer page instance
 * @param {string} bookID - Book identifier
 * @param {number} chapterNumber - Chapter index
 * @param {number} timeout - Custom timeout for URL match (0 uses default)
 */
async function scrapeChapter(page, bookID, chapterNumber, timeout = 0) {
  const targetUrl = `https://univterbuka.kotobee.com/#/book/${bookID}/reader/chapter/${chapterNumber}`;
  const url = targetUrl;

  console.log(`Navigating to chapter ${chapterNumber}...`);

  // Create a promise that resolves when URL matches target
  const urlMatchPromise = new Promise((resolve) => {
    const checkUrl = () => {
      if (page.url() === targetUrl) {
        console.log(`✓ URL matched target: ${targetUrl}`);
        resolve();
      }
    };

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        // console.log(`URL changed to: ${frame.url()}`);
        checkUrl();
      }
    });

    // Check immediately in case URL is already correct
    checkUrl();
  });

  // Navigate with longer timeout
  try {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });
  } catch (error) {
    // If navigation times out but page is loading, continue
    console.log(`Navigation timeout, but continuing: ${error.message}`);
  }

  // Wait for URL to match target pattern (with timeout)
  console.log(`Waiting for URL to match: ${targetUrl}`);
  await Promise.race([
    urlMatchPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('URL match timeout')), timeout > 0 ? timeout : 30000)
    ),
  ]);

  // Wait for content to load
  console.log(`Waiting for #epubContent to appear...`);
  await page.waitForSelector('#epubContent', {
    timeout: 30000,
  });
  // Give it extra time to fully render
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`Chapter ${chapterNumber} loaded successfully`);
}

/**
 * Launch browser with configured options
 * @returns {Promise<Browser>}
 */
async function launchBrowser() {
  const userDataDir = process.env.USER_DATA_DIR || '';

  return await puppeteer.launch({
    headless: process.env.HEADLESS === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--user-data-dir=${userDataDir}`,
      '--profile-directory=Default',
    ],
  });
}

/**
 * Ensure output directory exists
 * @param {string} bookID - Book identifier
 * @returns {string} Output folder path
 */
function ensureOutputFolder(bookID) {
  const outputFolder = path.join(process.cwd(), 'storage', bookID);
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
    console.log(`Created folder: ${outputFolder}`);
  }
  return outputFolder;
}

/**
 * Main execution function
 */
async function main() {
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(CONFIG.TIMEOUT.NAVIGATION);

    const outputFolder = ensureOutputFolder(bookID);

    console.log('\n=== Step 1: Scraping chapters and saving as PDF ===');
    const totalChapters = end - start + 1;
    const pdfFiles = [];

    for (let chapter = start; chapter <= end; chapter++) {
      const isFirstChapter = chapter === start;
      const pdfPath = await processChapter(
        browser,
        page,
        bookID,
        chapter,
        outputFolder,
        totalChapters,
        isFirstChapter
      );
      pdfFiles.push(pdfPath);
    }

    console.log('\n=== All chapters saved as PDF ===');

    // Step 2: Merge all PDFs into one
    console.log('\n=== Step 2: Merging all PDFs ===');
    const finalPdfPath = await mergePdfs(pdfFiles, bookID, bookName);

    console.log(`\n=== Process completed ===`);
    console.log(`✓ Final PDF saved: ${finalPdfPath}`);
    console.log(`✓ Individual PDFs location: ${outputFolder}`);
    console.log(`✓ Total chapters processed: ${totalChapters} (from ${start} to ${end - 1})`);

    await browser.close();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

/**
 * Process a single chapter: scrape, extract, save HTML, generate PDF
 * @param {Browser} browser - Puppeteer browser instance
 * @param {Page} page - Puppeteer page instance
 * @param {string} bookID - Book identifier
 * @param {number} chapter - Chapter index
 * @param {string} outputFolder - Output directory path
 * @param {number} totalChapters - Total number of chapters
 * @param {boolean} isFirstChapter - Whether this is the first chapter
 * @returns {Promise<string>} Path to generated PDF
 */
async function processChapter(
  browser,
  page,
  bookID,
  chapter,
  outputFolder,
  totalChapters,
  isFirstChapter
) {
  console.log(`\nProcessing Chapter ${chapter} (${chapter - start + 1} of ${totalChapters})...`);

  // Navigate to chapter with longer timeout for first chapter
  const timeout = isFirstChapter ? CONFIG.TIMEOUT.URL_MATCH_FIRST : CONFIG.TIMEOUT.URL_MATCH;
  await scrapeChapter(page, bookID, chapter, timeout);

  // Extract content and styles
  console.log(`Extracting content and styles for chapter ${chapter}...`);
  const { content, styles } = await extractPageContent(page);

  // Create and save HTML template
  const htmlTemplate = createHtmlTemplate(content, styles);
  const htmlFilePath = path.join(outputFolder, `chapter_${chapter}.html`);
  fs.writeFileSync(htmlFilePath, htmlTemplate, 'utf-8');
  console.log(`✓ HTML saved: ${htmlFilePath}`);

  // Generate PDF
  const pdfFilePath = await generatePdfFromHtml(browser, htmlTemplate, outputFolder, chapter);
  console.log(`✓ PDF saved: ${pdfFilePath}`);

  return pdfFilePath;
}

/**
 * Generate PDF from HTML content
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} htmlTemplate - HTML content
 * @param {string} outputFolder - Output directory
 * @param {number} chapter - Chapter index
 * @returns {Promise<string>} Path to generated PDF
 */
async function generatePdfFromHtml(browser, htmlTemplate, outputFolder, chapter) {
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

  // Wait a bit more to ensure full rendering
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get the actual width and height of the content
  const { contentWidth, contentHeight } = await pdfPage.evaluate(() => {
    // Get the main content container
    const epubContent = document.querySelector('#epubContent');
    const epubContainer = document.querySelector('#epubContainer');

    if (epubContent) {
      const rect = epubContent.getBoundingClientRect();
      const computedWidth = Math.ceil(rect.width);
      const computedHeight = Math.ceil(rect.bottom);
      console.log('epubContent bounding rect - width:', computedWidth, 'height:', computedHeight);
      return { contentWidth: computedWidth, contentHeight: computedHeight };
    }

    if (epubContainer) {
      const rect = epubContainer.getBoundingClientRect();
      const computedWidth = Math.ceil(rect.width);
      const computedHeight = Math.ceil(rect.bottom);
      console.log('epubContainer bounding rect - width:', computedWidth, 'height:', computedHeight);
      return { contentWidth: computedWidth, contentHeight: computedHeight };
    }

    // Fallback to document dimensions
    const body = document.body;
    const html = document.documentElement;
    const height = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
    const width = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth
    );
    console.log('Fallback document - width:', width, 'height:', height);
    return { contentWidth: width, contentHeight: height };
  });

  console.log(`Content dimensions: ${contentWidth}px x ${contentHeight}px`);
  console.log(`Saving chapter ${chapter} as PDF...`);
  const tempPdfPath = path.join(outputFolder, `chapter_${chapter}_temp.pdf`);
  const finalPdfPath = path.join(outputFolder, `chapter_${chapter}.pdf`);

  await pdfPage.pdf({
    path: tempPdfPath,
    width: `${contentWidth}px`,
    height: `${contentHeight}px`,
    printBackground: true,
    margin: CONFIG.PDF.MARGIN,
    preferCSSPageSize: false,
    omitBackground: false,
  });

  await pdfPage.close();
  await removeBlankPageFromPDF(tempPdfPath);
  fs.renameSync(tempPdfPath, finalPdfPath);

  return finalPdfPath;
}

/**
 * Merge multiple PDF files into one
 * @param {string[]} pdfFiles - Array of PDF file paths
 * @param {string} bookID - Book identifier
 * @param {string} bookName - Optional book name
 * @returns {Promise<string>} Path to merged PDF
 */
async function mergePdfs(pdfFiles, bookID, bookName = '') {
  const mergedPdf = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
    const pdfBytes = fs.readFileSync(pdfFile);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    console.log(`✓ Merged: ${path.basename(pdfFile)}`);
  }

  const mergedPdfBytes = await mergedPdf.save();
  const filename = bookName ? `${bookID}_${bookName}.pdf` : `book_${bookID}.pdf`;
  const finalPdfPath = path.join(process.cwd(), 'storage', filename);
  fs.writeFileSync(finalPdfPath, mergedPdfBytes);

  return finalPdfPath;
}

/**
 * Remove blank pages from PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<boolean>}
 */
async function removeBlankPageFromPDF(pdfPath) {
  console.log(`Removing blank pages...`);
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  console.log(`  Total pages: ${totalPages}`);

  // Identify non-blank pages
  const nonBlankPageIndices = [];

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const contentStream = page.node.Contents();

    // Check if page has content
    let hasContent = false;
    if (contentStream) {
      // Get content size as indicator of whether page has meaningful content
      const content = contentStream.toString();
      // A page with actual content will have more than just basic PDF operators
      // Blank pages typically have very minimal content (< 100 chars)
      hasContent = content.length > 100;
    }

    if (hasContent) {
      nonBlankPageIndices.push(i);
      console.log(`  ✓ Page ${i + 1}: Has content (keeping)`);
    } else {
      console.log(`  ✗ Page ${i + 1}: Blank (removing)`);
    }
  }

  // Create new PDF with only non-blank pages
  const newPdf = await PDFDocument.create();

  if (nonBlankPageIndices.length > 0) {
    const copiedPages = await newPdf.copyPages(pdfDoc, nonBlankPageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
  }

  // Save back to original file
  const newPdfBytes = await newPdf.save();
  fs.writeFileSync(pdfPath, newPdfBytes);

  const removedPages = totalPages - nonBlankPageIndices.length;
  console.log(
    `  Result: ${nonBlankPageIndices.length} pages kept, ${removedPages} blank pages removed`
  );

  return true;
}

// Run the scraper
main().catch(console.error);
