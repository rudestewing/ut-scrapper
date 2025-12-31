# UT Scraper

## Summary

A web scraper tool to download and convert digital books from Universitas Terbuka (Kotobee Reader) into searchable PDF files. This tool automates the process of extracting multiple chapters, converting them to B5-sized PDFs, and merging them into a single document.

## Requirements

- **Node.js** (v14 or higher)
- **Google Chrome** browser
- Active account on [Bahan Ajar Digital Universitas Terbuka](https://univterbuka.kotobee.com)

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd ut-scrapper
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Configure `.env`:

```env
# Browser mode: true (background) or false (visible)
HEADLESS=false

# Path to your Chrome user data directory
USER_DATA_DIR=C:/Users/YourUsername/AppData/Local/Google/Chrome/User Data
```

## Usage

### ⚠️ Important: Before Running

1. **Login first**: Open Google Chrome and login to https://univterbuka.kotobee.com with your UT credentials
2. **Verify access**: Make sure your account has access to the digital book you want to scrape
3. **Get Book ID**: Open the book you want to download, check the URL for the book ID
   - Example URL: `https://univterbuka.kotobee.com/#/library/book/47777`
   - The ID is `47777`
4. **Close Chrome**: Close ALL Chrome browser windows before running the script

### Run the Script

```bash
node main.js --id=<BOOK_ID> --start=<START_CHAPTER> --end=<END_CHAPTER>
```

**Example:**

```bash
node main.js --id=103040 --start=0 --end=300
```

### Parameters

| Parameter | Description              | Default | Required |
| --------- | ------------------------ | ------- | -------- |
| `--id`    | Book ID from Kotobee URL | 88480   | No       |
| `--start` | Starting chapter index   | 0       | No       |
| `--end`   | Ending chapter index     | 5       | No       |

## Output

The script generates files in the `storage/` folder:

```
storage/
├── {BOOK_ID}/
│   ├── chapter_1.html       # Individual chapter HTML
│   ├── chapter_1.pdf        # Individual chapter PDF
│   ├── chapter_2.html
│   ├── chapter_2.pdf
│   └── ...
└── book_{BOOK_ID}.pdf       # Final merged PDF (all chapters)
```

- **Individual PDFs**: Each chapter saved separately in `storage/{BOOK_ID}/`
- **Merged PDF**: All chapters combined in `storage/book_{BOOK_ID}.pdf`
- **HTML files**: Saved for debugging purposes
