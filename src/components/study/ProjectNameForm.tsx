"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/me/study/actions";
import { MAX_PROJECT_NAME } from "@/lib/study-types";

type ProjectNameFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultName?: string;
  submitLabel: string;
  placeholder?: string;
};

/** 새 프로젝트 만들기와 이름 바꾸기가 함께 쓰는 한 줄짜리 폼 */
export function ProjectNameForm({ action, defaultName, submitLabel, placeholder }: ProjectNameFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-end gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="sr-only">프로젝트 이름</span>
          <input
            name="name"
            required
            maxLength={MAX_PROJECT_NAME}
            defaultValue={defaultName}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full border-b border-concrete bg-transparent py-2 font-ko outline-none transition-colors placeholder:text-soot focus:border-violet"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 bg-bone px-4 py-2 font-ko text-sm font-medium text-void transition-colors hover:bg-violet disabled:opacity-50"
        >
          {pending ? "저장 중" : submitLabel}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="font-ko text-sm text-blood">
          {state.error}
        </p>
      )}
      {state.savedAt && !pending && <p className="font-ko text-xs text-ash">저장했습니다.</p>}
    </form>
  );
}
