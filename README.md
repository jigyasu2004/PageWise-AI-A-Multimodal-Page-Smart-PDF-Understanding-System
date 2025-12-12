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

## ❓ Frequently Asked Questions (FAQ)

### 1. Why not just upload a PDF to ChatGPT or Google Gemini?

ChatGPT and Gemini are excellent conversational models, but they are not designed as structured PDF reading environments.

When you upload a PDF to ChatGPT or Gemini:
*   The document is treated as a single block of text
*   Page boundaries are lost
*   Explanations are not page-aware
*   You cannot regenerate explanations for specific pages
*   You cannot see explanations side-by-side with the real PDF
*   There is no concept of page-context vs full-document context
*   You cannot manage multiple PDFs in parallel

Tabwise PDF Explainer solves these limitations by introducing:
*   True page-by-page understanding
*   Split-view (real PDF + explanation)
*   Progressive explanation generation
*   Page-specific regeneration
*   Context-aware chat modes (General / Full PDF / Page)
*   Multi-document workflow using tabs

**Tabwise PDF Explainer is not a chatbot reading a PDF — it is a PDF-first AI reading system.**

### 2. What problem does Tabwise PDF Explainer solve that current tools cannot?

The core problem is not summarization — it is deep, accurate, page-level understanding.

Current tools fail when:
*   Users need to understand specific pages
*   Important details are skipped in summaries
*   References to the original PDF are unclear
*   Diagrams, charts, or figures need explanation
*   Users want explanations in their own language or learning style
*   Multiple documents must be studied together

Tabwise PDF Explainer keeps the structure of the PDF intact, so users always know:
*   What page they are on
*   What content has been explained
*   What is still being processed
*   What information comes from where

This significantly reduces cognitive load and missed information.

### 3. How does Tabwise PDF Explainer use Gemini 3 Pro differently?

Tabwise PDF Explainer uses Gemini 3 Pro as a document understanding engine, not just a chat model.

It leverages:
*   Multimodal reasoning (text + images inside PDFs)
*   Long-context understanding across entire documents
*   Page-aware prompts
*   Progressive multi-step generation
*   Context-scoped conversations (page vs full document)

This structured orchestration is not possible in a single chat interface.

### 4. Are there any known limitations in the current version?

Yes — and we intentionally acknowledge them to show transparency and technical honesty.

Known limitations:
*   The downloaded explanation PDF formatting is not always perfectly aligned with the on-screen layout (headings, spacing, tables).
*   The “Regenerate explanation for all pages” function may not work reliably in some cases due to current AI Studio Build constraints.

Despite multiple attempts using Google AI Studio Build, these issues could not be fully resolved within the hackathon timeframe.

These are UI and orchestration limitations, not model capability issues.

### 5. Why did you submit the project with these limitations?

Because the goal of this hackathon is to demonstrate the real and accurate power of Google AI Studio Build, not to hide imperfections.

Tabwise PDF Explainer demonstrates:
*   What is already possible today with Gemini 3 Pro
*   How powerful multimodal, page-aware reasoning can be
*   How AI Studio Build enables complex systems with minimal code
*   The current limitations are implementation-level, not conceptual. They can be resolved with additional engineering time or deeper customization.

### 6. Could these limitations be fixed outside AI Studio Build?

Yes.
With a fully custom backend, fine-grained PDF rendering, and manual layout control, these issues can be addressed.

However, this project intentionally stays within the AI Studio Build ecosystem to:
*   Show what can be achieved using low-code AI development
*   Highlight Gemini’s reasoning power rather than heavy engineering
*   Stay true to the spirit of Vibe Coding

### 7. Who is Tabwise PDF Explainer built for?

Tabwise PDF Explainer is useful for:
*   Students preparing for exams
*   Researchers reviewing papers
*   Professionals reading long reports or legal documents
*   Anyone overwhelmed by large PDFs

If you read PDFs regularly, Tabwise PDF Explainer saves time and improves understanding.

### 8. What makes this project special from a judging perspective?

Tabwise PDF Explainer:
*   Solves a real, personal, and global problem
*   Introduces a new interaction paradigm for PDFs
*   Uses Gemini 3 Pro in a way not achievable via chat alone
*   Demonstrates honesty, technical depth, and thoughtful design
*   Shows how AI Studio Build can be used to create serious applications
