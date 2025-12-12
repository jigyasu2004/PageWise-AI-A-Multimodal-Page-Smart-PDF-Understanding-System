# Tabwise PDF Explainer

**Tabwise PDF Explainer** is a professional-grade, AI-powered document analysis tool designed to make complex PDFs easy to understand. It leverages the latest **Google Gemini 3 Pro** and **2.5 Flash** models to provide real-time summaries, page-by-page explanations, and an interactive chat assistant.

## 🚀 Key Features

### 📄 Smart PDF Management
*   **Multi-Tab Interface**: Open, analyze, and switch between multiple PDF documents simultaneously.
*   **Undo Functionality**: Accidentally closed a tab? Restore it immediately with the Undo toast notification.
*   **Drag & Drop Upload**: Simply drag PDF files onto the workspace to begin.
*   **URL Loading**: Load PDFs directly from public URLs (supports CORS handling).

### 👁️ Advanced PDF Viewer
*   **Split-Screen Layout**: View the original PDF on the left and the AI explanation on the right.
*   **Synchronization**: Toggle "Sync" to automatically scroll the explanation to match the PDF page you are viewing.
*   **High-Fidelity Rendering**: Built on `pdfjs-dist` with HiDPI support for crisp text.
*   **Text Selection**: Native text layer allows for highlighting and copying text directly from the PDF.
*   **Zoom Controls**: Pinch-to-zoom (trackpad) or Ctrl+Scroll support, plus manual zoom buttons.
*   **Maximize Mode**: Toggle between Split View, Full PDF View, or Full Text View.

### 🧠 AI Analysis & Explanations
*   **Auto-Summarization**: Instantly generates a "Global Summary" of the entire document upon upload.
*   **Daisy-Chain Generation**: Automatically processes page explanations in the background, one after another, so you don't have to wait.
*   **Dual Model Support**:
    *   **Gemini 2.5 Flash**: Optimized for speed and quick summaries.
    *   **Gemini 3 Pro**: Optimized for complex reasoning and detailed breakdown.
*   **Smart Regeneration**:
    *   **Single Page**: Refine a specific page's explanation with custom comments (e.g., "Explain this like I'm 5").
    *   **Bulk Regeneration**: Regenerate explanations for the **entire document** with a single click using a global instruction.

### 🎨 Deep Customization
*   **Theming System**: 
    *   **7 Color Themes**: Blue, Emerald, Purple, Rose, Amber, Slate, and **Midnight (Dark Mode)**.
    *   Full **Dark Mode** support across all UI components.
*   **Explanation Styles**: Choose from Short, Medium, Long, Pointwise, Detailed, or define a **Custom Style** (e.g., "Use analogies").
*   **Language Support**:
    *   Built-in support for **English**, **Hindi**, **Sanskrit**, and **Hinglish** (e.g., "Tumhe mai samjhata hoon...").
    *   Custom language support for specific dialects or formal tones.
*   **Scope Control**: Apply specific settings (Style, Language, Instructions) granularly to the General Chat, Full PDF Context, or specific Page Explanations.

### 💬 Intelligent Chat Assistant
*   **Context Awareness**:
    *   **General Chat**: Ask general knowledge questions.
    *   **Full PDF Context**: Ask questions about the entire document.
    *   **Page Context**: Ask questions specifically about the currently open page.
*   **Google Search Grounding**: Toggle "Search" to let the AI verify facts from the web in real-time.
*   **Image Generation**: Generate AI images (1K, 2K, 4K resolution) directly within the chat interface using `gemini-3-pro-image-preview`.
*   **Rich Text Support**: Chat supports Markdown rendering, code blocks, and mathematical formatting.

### 📤 Export & Sharing
*   **PDF Export**: Download the entire AI-generated analysis (Global Summary + All Page Explanations) as a clean, formatted PDF file.

## 🛠️ Tech Stack
*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS (with Typography plugin)
*   **AI SDK**: Google GenAI SDK (`@google/genai`)
*   **PDF Engine**: PDF.js (`pdfjs-dist`)
*   **Markdown**: `react-markdown`, `remark-gfm`, `rehype-raw`, `react-syntax-highlighter`

## 📦 Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Set your API Key:
    *   Ensure `process.env.API_KEY` is available with a valid Google Gemini API key.
4.  Run the app: `npm run dev`
