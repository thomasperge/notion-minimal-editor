# Notion Minimal Editor

A minimal Notion-like editor powered by BlockNote and Next.js. Focus on writing without the complexity.

## ✨ Features

- 📝 **Rich Text Editor** - Powered by BlockNote with full Notion-style editing
- 🎨 **Canvas Editor** - Build interactive diagrams and flows with React Flow
- 🌓 **Dark Mode** - Beautiful dark and light themes
- 💾 **Local Storage** - Auto-save your content in the browser
- 📥 **Import Options** - Import content from JSON, Markdown, or HTML files or paste from clipboard
- 📤 **Export Options** - Export your documents as JSON, Markdown, or HTML
- ⚡ **Undo/Redo** - Full history support
- 🎨 **Customizable Width** - Adjust editor width (Narrow, Medium, Wide, Full)
- 🖼️ **Image Support** - Paste and insert images directly
- ⚙️ **Settings Dialog** - Customize your editor experience
- 📱 **QR Code Sharing** - Share your content instantly

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/thomasperge/notion-minimal-editor.git
cd notion-minimal-editor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Built With

- [Next.js 13](https://nextjs.org/) - React framework
- [React 18](https://react.dev/) - UI library
- [BlockNote](https://www.blocknotejs.org/) - Block-based editor
- [React Flow](https://reactflow.dev/) - Canvas and diagram editor
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - UI components
- [next-themes](https://github.com/pacocoursey/next-themes) - Theme management

## 📖 Usage

### Document Types

Create two types of content:
- **📝 Pages** - Rich text documents with BlockNote
- **🎨 Canvas** - Interactive diagrams and flows with React Flow

### Writing

Start typing to create content. The editor supports:
- Headings (H1, H2, H3)
- Bullet lists
- Numbered lists
- Bold, italic, and underline
- Links
- Images (paste or drag & drop)

### Canvas

Create interactive diagrams by:
- Clicking "+ Add Node" to add new nodes
- Dragging nodes around
- Connecting nodes by dragging from one handle to another
- Deleting elements with Delete key

### Keyboard Shortcuts

- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `/` - Open slash command menu

### Import Content

You can import content from various formats:
- **Import from file**: Click the avatar icon → Settings → Import, then choose JSON, Markdown, or HTML
- **Paste from clipboard**: Click "Coller" in the Import section to paste content (automatically detects format)

Supported formats:
- **JSON**: BlockNote JSON format
- **Markdown**: Standard Markdown files (.md)
- **HTML**: HTML documents

### Settings

Click the avatar icon in the header to access settings:
- Import content (JSON, Markdown, HTML files or clipboard)
- Adjust editor width
- Toggle auto-save
- Export content (JSON, Markdown, HTML)
- Clear content
- View statistics

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [BlockNote](https://www.blocknotejs.org/) for the amazing editor
- Original inspiration from [Notion](https://www.notion.so/)
