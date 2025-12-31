# UT Scraper

Web scraper to download and convert digital books from Universitas Terbuka (Kotobee Reader) into PDF files.

## 📋 Features

- ✅ Scrape multiple chapters from Kotobee Reader
- ✅ Extract content and styles from web pages
- ✅ Generate PDF with B5 size (standard textbook format)
- ✅ Merge all chapters into a single PDF file
- ✅ Support for headless/non-headless mode
- ✅ Uses Chrome user data for session persistence
- ✅ **Searchable PDF output** - This tool works by extracting HTML files and converting them to PDF, so the text in the PDF remains searchable (searchable PDF)

## 🛠️ Technologies

- **Puppeteer** - Browser automation
- **pdf-lib** - PDF manipulation
- **Node.js** - Runtime environment
- **dotenv** - Environment configuration

## 📦 Installation

1. Clone repository:

```bash
git clone <repository-url>
cd ut-scrapper
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Setup environment variables:

```bash
cp .env.example .env
```

4. Edit `.env` and adjust the configuration:

```env
# Set to true for headless mode (background), false to see the browser
HEADLESS=false

# Path to your Chrome user data
USER_DATA_DIR=C:/Users/YourUsername/AppData/Local/Google/Chrome/User Data
```

## ⚠️ Important! Before Running the Script

1. **Login first**: Make sure you are already logged in and have an active session on the [Bahan Ajar Digital Universitas Terbuka](https://univterbuka.kotobee.com) website

2. **Close Chrome browser**: Close all Chrome windows/tabs that are accessing the digital learning materials before running this script. The script requires exclusive access to the Chrome user data directory.

3. **Verify access**: Make sure your account has access to the book you want to scrape.

## 🚀 Usage

### Basic Usage

```bash
node main.js --id=<BOOK_ID> --start=<START_CHAPTER> --end=<END_CHAPTER>
```

### Examples

Download book with ID 88480, chapters 0-5:

```bash
node main.js --id=88480 --start=0 --end=5
```

Download book with ID 130758, chapters 0-319:

```bash
node main.js --id=130758 --start=0 --end=319
```

### Parameters

| Parameter | Description                       | Default | Required |
| --------- | --------------------------------- | ------- | -------- |
| `--id`    | Book ID from Kotobee URL          | 88480   | No       |
| `--start` | Starting chapter (index)          | 0       | No       |
| `--end`   | Ending chapter (index, exclusive) | 5       | No       |

### URL Format

Kotobee book URL: `https://univterbuka.kotobee.com/#/book/{BOOK_ID}/reader/chapter/{CHAPTER_NUMBER}`

Example: `https://univterbuka.kotobee.com/#/book/88480/reader/chapter/0`

## 📁 Output

Scraping results will be saved in the `storage/` folder:

```
storage/
├── {BOOK_ID}/
│   ├── chapter_1.html    # HTML for debugging
│   ├── chapter_1.pdf     # PDF per chapter
│   ├── chapter_2.html
│   ├── chapter_2.pdf
│   └── ...
└── book_{BOOK_ID}.pdf    # Merged PDF (final)
```

## ⚙️ Configuration

### Environment Variables

| Variable        | Description                                            | Example                                                   |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `HEADLESS`      | Browser mode: `true` (background) or `false` (visible) | `false`                                                   |
| `USER_DATA_DIR` | Path to Chrome user data directory                     | `C:/Users/Username/AppData/Local/Google/Chrome/User Data` |

### PDF Settings

PDF is generated with the following configuration:

- **Size**: B5 (176mm x 250mm)
- **Margin**: 0px (all sides)
- **Print Background**: Enabled
- **Format**: 1 page per chapter

## 🔧 How It Works

1. **Navigation**: Browser opens the chapter URL with Puppeteer
2. **Wait**: Waits for `#epubContent` content to be fully loaded
3. **Extract**: Extracts HTML content and CSS styles
4. **Save HTML**: Saves HTML for debugging purposes
5. **Generate PDF**: Converts HTML to PDF with Puppeteer
6. **Cleanup**: Removes blank pages from PDF
7. **Merge**: Combines all chapter PDFs into a single file

## 📝 Notes

- Scraper uses Chrome user data to maintain session/login
- First chapter uses longer timeout (60s vs 30s)
- PDF output only keeps the first page from each render to avoid blank pages
- Spaces in paths (like `User Data`) are safe to use with forward slashes

## 🐛 Troubleshooting

### Error: Navigation timeout

- Try increasing the timeout value in `CONFIG.TIMEOUT` in [main.js](main.js)
- Make sure your internet connection is stable

### Path not read from .env

- Use forward slash `/` in Windows paths
- Don't use quotes around the path
- Example: `C:/Users/Username/AppData/Local/Google/Chrome/User Data`

### Browser doesn't open the correct page

- Manually login to the Univterbuka site in Chrome
- Make sure `USER_DATA_DIR` points to the Chrome profile that's already logged in

## 📄 License

MIT

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

## 📧 Contact

For questions or issues, please create an issue in this repository.
