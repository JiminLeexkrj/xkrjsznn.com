"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { finishUpload, prepareUpload } from "@/app/me/study/actions";
import { openPdf } from "@/lib/pdfjs";
import { MAX_PDF_BYTES, STUDY_BUCKET, formatBytes } from "@/lib/study-types";
import { createUploadClient } from "@/lib/supabase/browser";

type Status = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "error"; text: string };

/** PDF를 골라 프로젝트에 올린다. 여러 개를 고르면 하나씩 차례로 올린다. */
export function UploadPdf({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function upload(file: File, index: number, total: number) {
    const prefix = total > 1 ? `(${index + 1}/${total}) ` : "";
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error(`${file.name}: PDF만 올릴 수 있습니다.`);
    }
    if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name}: ${formatBytes(file.size)}입니다. 50MB까지 올릴 수 있습니다.`);

    setStatus({ kind: "busy", text: `${prefix}${file.name} 읽는 중` });
    let pageCount: number;
    try {
      const task = await openPdf(await file.arrayBuffer());
      try {
        pageCount = (await task.promise).numPages;
      } finally {
        task.destroy();
      }
    } catch {
      throw new Error(`${file.name}: PDF를 열지 못했습니다. 암호가 걸렸거나 손상된 파일일 수 있습니다.`);
    }

    setStatus({ kind: "busy", text: `${prefix}${file.name} 올리는 중 (${formatBytes(file.size)})` });
    const ticket = await prepareUpload(projectId, file.size);
    if ("error" in ticket) throw new Error(ticket.error);
    const { error } = await createUploadClient()
      .storage.from(STUDY_BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: "application/pdf" });
    if (error) throw new Error(`${file.name}: 올리지 못했습니다. ${error.message}`);

    const title = file.name.replace(/\.pdf$/i, "");
    const done = await finishUpload(projectId, ticket.documentId, { title, pageCount, size: file.size });
    if (done.error) throw new Error(done.error);
  }

  async function onChange(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    try {
      for (const [i, file] of list.entries()) await upload(file, i, list.length);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "올리지 못했습니다." });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  }

  const busy = status.kind === "busy";

  return (
    <div className="flex flex-col gap-3">
      <label
        className={`flex cursor-pointer items-center justify-center border border-dashed border-soot px-6 py-10 text-center font-ko transition-colors hover:border-violet hover:bg-pit ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) onChange(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(e) => onChange(e.currentTarget.files)}
        />
        <span>
          {busy ? status.text : "PDF를 끌어다 놓거나 눌러서 고르세요"}
          {!busy && <span className="mt-1 block text-xs text-ash">파일 하나에 50MB까지</span>}
        </span>
      </label>
      {status.kind === "error" && (
        <p role="alert" className="font-ko text-sm text-blood">
          {status.text}
        </p>
      )}
    </div>
  );
}
