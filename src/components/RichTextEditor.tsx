"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  toolbarSide?: "top" | "right";
  editorHeight?: number;
  stickyToolbar?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  toolbarSide = "top",
  editorHeight = 300,
  stickyToolbar = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Disable link from StarterKit since we're adding it separately
        link: false,
        // Disable underline from StarterKit since we're adding it separately
        underline: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      TextStyle,
      Color,
      Underline,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose-editor",
        "data-placeholder": placeholder || "Enter content...",
      },
    },
  });

  // Update editor content when value prop changes
  if (editor && editor.getHTML() !== value) {
    editor.commands.setContent(value || "");
  }

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt("Image URL");

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`rte-shell ${toolbarSide === "right" ? "rte-right" : "rte-top"}`}
      style={{ marginBottom: "1rem" }}
    >
      {/* Toolbar */}
      <div
        className="rte-toolbar"
        style={{
          borderBottom: toolbarSide === "right" ? "1.5px solid var(--abgc-border)" : "none",
          display: "flex",
          flexWrap: toolbarSide === "right" ? "nowrap" : "wrap",
          flexDirection: toolbarSide === "right" ? "column" : "row",
          borderRadius: toolbarSide === "right" ? "0 var(--abgc-radius-md) var(--abgc-radius-md) 0" : "var(--abgc-radius-md) var(--abgc-radius-md) 0 0",
          maxHeight: toolbarSide === "right" ? `${editorHeight}px` : "none",
          overflowY: toolbarSide === "right" ? "auto" : "visible",
          position: stickyToolbar ? "sticky" : "static",
          top: stickyToolbar ? 0 : undefined,
          zIndex: stickyToolbar ? 2 : 1,
          backgroundColor: stickyToolbar ? "white" : undefined,
        }}
      >
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "rte-btn-active" : ""}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "rte-btn-active" : ""}
          style={{ fontStyle: "italic" }}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "rte-btn-active" : ""}
          style={{ textDecoration: "underline" }}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "rte-btn-active" : ""}
          style={{ textDecoration: "line-through" }}
          title="Strikethrough"
        >
          S
        </button>

        <div className="rte-sep" style={{ width: "1px", background: "#ddd", margin: "0 4px" }} />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "rte-btn-active" : ""}
          style={{ fontWeight: "bold" }}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "rte-btn-active" : ""}
          style={{ fontWeight: "bold" }}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "rte-btn-active" : ""}
          style={{ fontWeight: "bold" }}
          title="Heading 3"
        >
          H3
        </button>

        <div className="rte-sep" style={{ width: "1px", background: "#ddd", margin: "0 4px" }} />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "rte-btn-active" : ""}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "rte-btn-active" : ""}
          title="Numbered List"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "rte-btn-active" : ""}
          title="Quote"
        >
          "
        </button>

        <div className="rte-sep" style={{ width: "1px", background: "#ddd", margin: "0 4px" }} />

        {/* Links and Images */}
        <button
          type="button"
          onClick={setLink}
          className={editor.isActive("link") ? "rte-btn-active" : ""}
          title="Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={addImage}
          title="Image"
        >
          🖼️
        </button>

        <div className="rte-sep" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          ↷
        </button>
      </div>

      {/* Editor Content */}
      <div
        className="rte-content"
        style={{
          borderTop: toolbarSide === "right" ? "1.5px solid var(--abgc-border)" : "none",
          borderRight: toolbarSide === "right" ? "none" : "1.5px solid var(--abgc-border)",
          minHeight: `${editorHeight}px`,
          maxHeight: `${editorHeight}px`,
          borderRadius: toolbarSide === "right" ? "var(--abgc-radius-md) 0 0 var(--abgc-radius-md)" : "0 0 var(--abgc-radius-md) var(--abgc-radius-md)",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .rte-shell {
          display: flex;
          flex-direction: column;
        }
        .rte-shell.rte-right {
          flex-direction: row;
          align-items: stretch;
        }
        .rte-shell.rte-right .rte-toolbar button {
          min-width: 38px !important;
          width: 38px !important;
          height: 34px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .rte-shell.rte-right .rte-sep {
          width: 100% !important;
          height: 1px !important;
          margin: 4px 0 !important;
        }
        .ProseMirror {
          min-height: ${editorHeight}px;
        }
        .ProseMirror ul {
          list-style: none !important;
        }
        .ProseMirror ul li {
          position: relative !important;
        }
        .ProseMirror ul li::before {
          content: "•" !important;
          position: absolute !important;
          left: -2em !important;
          color: var(--abgc-text) !important;
          font-weight: bold !important;
          font-size: 1.2em !important;
          text-align: right !important;
          min-width: 1.5em !important;
        }
        .ProseMirror ol {
          list-style: none !important;
          counter-reset: item !important;
        }
        .ProseMirror ol li {
          position: relative !important;
          counter-increment: item !important;
        }
        .ProseMirror ol li::before {
          content: counter(item) "." !important;
          position: absolute !important;
          left: -2em !important;
          color: var(--abgc-text) !important;
          font-weight: normal !important;
          text-align: right !important;
          min-width: 1.5em !important;
        }
        .ProseMirror ul ul li::before {
          content: "◦" !important;
        }
        .ProseMirror ul ul ul li::before {
          content: "▪" !important;
        }
      `}</style>
    </div>
  );
}
