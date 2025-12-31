import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

// sample url
// https://univterbuka.kotobee.com/#/book/88480/reader/chapter/0

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    id: '88480',
    start: 0,
    end: 5,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--id=')) {
      params.id = arg.split('=')[1];
    } else if (arg.startsWith('--start=')) {
      params.start = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--end=')) {
      params.end = parseInt(arg.split('=')[1]);
    }
  });

  return params;
}

const { id: bookID, start, end } = parseArgs();
console.log(`Book ID: ${bookID}, Start: ${start}, End: ${end}`);

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
      timeout: timeout > 0 ? timeout : 60000, // Increased to 60 seconds
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
  await page.waitForSelector('#epubContent', { timeout: 30000 });
  // Give it extra time to fully render
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`Chapter ${chapterNumber} loaded successfully`);
}

async function main() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-data-dir=C:\\Users\\rudi.setiawan\\AppData\\Local\\Google\\Chrome\\User Data',
        '--profile-directory=Default',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); // Increased to 60 seconds

    // Create output folder for this book
    const outputFolder = path.join(process.cwd(), 'storage', bookID);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      console.log(`Created folder: ${outputFolder}`);
    }

    // Step 1: Loop through all chapters and save as PDF directly
    console.log('\n=== Step 1: Scraping chapters and saving as PDF ===');
    const totalChapters = end - start;
    const pdfFiles = [];

    for (let chapter = start; chapter < end; chapter++) {
      console.log(`\nProcessing Chapter ${chapter + 1}/${totalChapters} (index: ${chapter})...`);

      // Navigate to chapter
      await scrapeChapter(page, bookID, chapter, chapter === start ? 60000 : 30000);

      // Extract content and styles from the page
      console.log(`Extracting content and styles for chapter ${chapter + 1}...`);

      const { content, styles } = await page.evaluate(() => {
        // Get the content from #epubContent
        const epubContent = document.querySelector('#epubContent');
        const content = epubContent ? epubContent.outerHTML : '';

        // Get all styles from the page
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
            // CORS issues might prevent access to some stylesheets
            console.log('Could not access stylesheet:', link.href);
          }
        });

        return { content, styles: styles.join('\n') };
      });

      // Create HTML template with extracted content and styles
      const htmlTemplate = `
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
      margin: 0;
      padding: 0;
      width: 100%;
      height: auto !important;
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

      // Save HTML file for debugging
      const htmlFilePath = path.join(outputFolder, `chapter_${chapter + 1}.html`);
      fs.writeFileSync(htmlFilePath, htmlTemplate, 'utf-8');
      console.log(`✓ HTML saved: ${htmlFilePath}`);

      // Create a new page and set the HTML content
      const pdfPage = await browser.newPage();
      await pdfPage.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

      // Save as PDF
      const pdfFilePath = path.join(outputFolder, `chapter_${chapter + 1}.pdf`);
      console.log(`Saving chapter ${chapter + 1} as PDF...`);

      const tempPdfPath = path.join(outputFolder, `chapter_${chapter + 1}_temp.pdf`);

      await pdfPage.pdf({
        path: tempPdfPath,
        width: '176mm', // Ukuran B5 - standar buku pelajaran
        height: '250mm',
        printBackground: true,
        margin: {
          top: '0px',
          bottom: '0px',
          left: '0px',
          right: '0px',
        },
        preferCSSPageSize: false,
        omitBackground: false,
      });

      await pdfPage.close();

      await removeBlankPageFromPDF(tempPdfPath);

      // Rename temp file to final file
      fs.renameSync(tempPdfPath, pdfFilePath);

      console.log(`✓ PDF saved: ${pdfFilePath}`);
      pdfFiles.push(pdfFilePath);
    }

    console.log('\n=== All chapters saved as PDF ===');

    // Step 2: Merge all PDFs into one
    console.log('\n=== Step 2: Merging all PDFs ===');

    const mergedPdf = await PDFDocument.create();

    for (const pdfFile of pdfFiles) {
      const pdfBytes = fs.readFileSync(pdfFile);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      console.log(`✓ Merged: ${path.basename(pdfFile)}`);
    }

    const mergedPdfBytes = await mergedPdf.save();
    const finalPdfPath = path.join(process.cwd(), 'storage', `book_${bookID}.pdf`);
    fs.writeFileSync(finalPdfPath, mergedPdfBytes);

    console.log(`\n=== Process completed ===`);
    console.log(`✓ Final PDF saved: ${finalPdfPath}`);
    console.log(`✓ Individual PDFs location: ${outputFolder}`);
    console.log(`✓ Total chapters processed: ${totalChapters} (from ${start} to ${end - 1})`);

    await browser.close();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

async function removeBlankPageFromPDF(pdfPath) {
  console.log(`Keeping only first page...`);
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  console.log(`  Total pages: ${totalPages}`);

  // Create new PDF with only first page
  const newPdf = await PDFDocument.create();

  if (totalPages > 0) {
    const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
    newPdf.addPage(firstPage);
    console.log(`  ✓ Kept page 1 only`);
  }

  // Save back to original file
  const newPdfBytes = await newPdf.save();
  fs.writeFileSync(pdfPath, newPdfBytes);

  console.log(`  Result: 1 page kept, ${totalPages - 1} pages removed`);

  return true;
}

// Run the scraper
main().catch(console.error);
