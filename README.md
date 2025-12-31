# UT Scraper

Web scraper untuk mengunduh dan mengkonversi buku digital dari Universitas Terbuka (Kotobee Reader) menjadi file PDF.

## 📋 Fitur

- ✅ Scrape multiple chapters dari Kotobee Reader
- ✅ Extract konten dan styles dari halaman web
- ✅ Generate PDF dengan ukuran B5 (standar buku)
- ✅ Merge semua chapters menjadi satu file PDF
- ✅ Support headless/non-headless mode
- ✅ Menggunakan Chrome user data untuk session persistence

## 🛠️ Teknologi

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
# atau
yarn install
```

3. Setup environment variables:

```bash
cp .env.example .env
```

4. Edit `.env` dan sesuaikan konfigurasi:

```env
# Set to true untuk headless mode (background), false untuk melihat browser
HEADLESS=false

# Path ke user data Chrome Anda
USER_DATA_DIR=C:/Users/YourUsername/AppData/Local/Google/Chrome/User Data
```

## ⚠️ Penting! Sebelum Menjalankan Script

1. **Login terlebih dahulu**: Pastikan Anda sudah login dan memiliki session aktif di website [Bahan Ajar Digital Universitas Terbuka](https://univterbuka.kotobee.com)

2. **Close browser Chrome**: Tutup semua window/tab Chrome yang sedang mengakses bahan ajar digital sebelum menjalankan script ini. Script memerlukan akses eksklusif ke Chrome user data directory.

3. **Verifikasi akses**: Pastikan akun Anda memiliki akses ke buku yang ingin di-scrape.

## 🚀 Usage

### Basic Usage

```bash
node main.js --id=<BOOK_ID> --start=<START_CHAPTER> --end=<END_CHAPTER>
```

### Contoh

Download buku dengan ID 88480, chapter 0-5:

```bash
node main.js --id=88480 --start=0 --end=5
```

Download buku dengan ID 130758, chapter 0-319:

```bash
node main.js --id=130758 --start=0 --end=319
```

### Parameters

| Parameter | Deskripsi                        | Default | Required |
| --------- | -------------------------------- | ------- | -------- |
| `--id`    | Book ID dari URL Kotobee         | 88480   | No       |
| `--start` | Chapter awal (index)             | 0       | No       |
| `--end`   | Chapter akhir (index, exclusive) | 5       | No       |

### URL Format

URL buku Kotobee: `https://univterbuka.kotobee.com/#/book/{BOOK_ID}/reader/chapter/{CHAPTER_NUMBER}`

Contoh: `https://univterbuka.kotobee.com/#/book/88480/reader/chapter/0`

## 📁 Output

Hasil scraping akan disimpan di folder `storage/`:

```
storage/
├── {BOOK_ID}/
│   ├── chapter_1.html    # HTML untuk debugging
│   ├── chapter_1.pdf     # PDF per chapter
│   ├── chapter_2.html
│   ├── chapter_2.pdf
│   └── ...
└── book_{BOOK_ID}.pdf    # Merged PDF (final)
```

## ⚙️ Configuration

### Environment Variables

| Variable        | Deskripsi                                                | Example                                                   |
| --------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `HEADLESS`      | Browser mode: `true` (background) atau `false` (visible) | `false`                                                   |
| `USER_DATA_DIR` | Path ke Chrome user data directory                       | `C:/Users/Username/AppData/Local/Google/Chrome/User Data` |

### PDF Settings

PDF dihasilkan dengan konfigurasi:

- **Ukuran**: B5 (176mm x 250mm)
- **Margin**: 0px (semua sisi)
- **Print Background**: Enabled
- **Format**: 1 halaman per chapter

## 🔧 Cara Kerja

1. **Navigasi**: Browser membuka URL chapter dengan Puppeteer
2. **Wait**: Menunggu konten `#epubContent` fully loaded
3. **Extract**: Mengekstrak HTML content dan CSS styles
4. **Save HTML**: Menyimpan HTML untuk debugging
5. **Generate PDF**: Konversi HTML ke PDF dengan Puppeteer
6. **Cleanup**: Menghapus halaman kosong dari PDF
7. **Merge**: Menggabungkan semua PDF chapter menjadi satu file

## 📝 Notes

- Scraper menggunakan Chrome user data untuk maintain session/login
- Chapter pertama menggunakan timeout lebih lama (60s vs 30s)
- PDF hasil hanya menyimpan halaman pertama dari setiap render untuk menghindari halaman kosong
- Spasi di path (seperti `User Data`) aman digunakan dengan forward slash

## 🐛 Troubleshooting

### Error: Navigation timeout

- Coba tingkatkan nilai timeout di `CONFIG.TIMEOUT` di [main.js](main.js)
- Pastikan koneksi internet stabil

### Path tidak terbaca dari .env

- Gunakan forward slash `/` di path Windows
- Jangan gunakan quotes di sekitar path
- Contoh: `C:/Users/Username/AppData/Local/Google/Chrome/User Data`

### Browser tidak membuka halaman yang benar

- Login manual ke situs Univterbuka di Chrome
- Pastikan `USER_DATA_DIR` mengarah ke profile Chrome yang sudah login

## 📄 License

MIT

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

## 📧 Contact

Untuk pertanyaan atau issues, silakan buat issue di repository ini.
