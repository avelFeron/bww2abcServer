# bww2abc Server

`bww2abc-server` is a Node.js web application to convert **.bww** files (Bagpipe Writer format) into **.abc** notation directly from your browser via **drag & drop**.

It wraps the original [bww2abc](http://moinejf.free.fr/) conversion script (by Jean‑François Moine) with an Express server.

---

## ✨ Features

- Upload one or multiple `.bww` files from a web page
- Converts automatically to `.abc` format
- If multiple files are uploaded → downloads as a ZIP archive
- Built-in drag & drop interface
- Keeps original CLI support (`node bww2abc.js file.bww > file.abc`)

---

## 📦 Requirements

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (comes with Node.js)

---

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/your-username/bww2abc-server.git
cd bww2abc-server
```

or download the repository


Install dependencies

```bash
npm install
```

Run the server

```bash
npm start
```

During development (auto‑reload with Nodemon):

```bash
npm run dev
```

## 🎼 Usage (Web Interface)

Open http://localhost:3000 in your browser.

- Drag & drop one or more `.bww` files into the page
- The converted files download automatically
  - Single file → `.abc` text file
  - Multiple files → `.zip` archive containing all `.abc`


---

## 🔌 API

- `GET /` → Serves `public/index.html` and assets
- `POST /convert` → Multipart form with `files` field (accepts up to 50 `.bww`)
  - Returns one `.abc` as `text/plain` or many as `application/zip`

---

## 🖥️ CLI (Optional)

You can still use the converter directly:

```bash
node bww2abc.js path/to/file.bww > path/to/file.abc
```
