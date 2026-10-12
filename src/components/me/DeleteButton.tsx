"use client";

// 지운 일정은 되돌릴 수 없으니 한 번 묻는다
export function DeleteButton({ action, title }: { action: () => Promise<void>; title: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`'${title}' 일정을 지울까요? 되돌릴 수 없습니다.`)) e.preventDefault();
      }}
    >
      <button type="submit" className="hover:text-blood">
        지우기
      </button>
    </form>
  );
}
