"use client";

type DeleteButtonProps = {
  action: () => Promise<void>;
  title: string;
  /** 지우기 전에 묻는 말. 없으면 일정을 지운다고 묻는다. */
  message?: string;
  label?: string;
};

// 지운 것은 되돌릴 수 없으니 한 번 묻는다
export function DeleteButton({ action, title, message, label = "지우기" }: DeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message ?? `'${title}' 일정을 지울까요? 되돌릴 수 없습니다.`)) e.preventDefault();
      }}
    >
      <button type="submit" className="hover:text-blood">
        {label}
      </button>
    </form>
  );
}
