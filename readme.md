# bww2abc Server

`bww2abc-server` is a Node.js web application that lets you convert **.bww** files  
(Bagpipe Writer format) into **.abc** notation directly from your browser via **drag & drop**.  

It uses the original [bww2abc](http://moinejf.free.fr/) conversion script (by Jean-François Moine)  
wrapped in a Node.js/Express server.

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

Install dependencies

```bash
npm install
```

Rune the server

```bash
npm start
```

## 🎼 Usage (Web Interface)

Open http://localhost:3000
 in your browser

Drag & drop one or more .bww files into the page

The converted .abc file(s) are automatically downloaded:

Single file → .abc text file

Multiple files → .zip archive containing all .abc