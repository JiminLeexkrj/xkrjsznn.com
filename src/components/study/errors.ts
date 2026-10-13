// 해설과 퀴즈를 만드는 API가 돌려주는 오류 코드를 사람이 읽을 문장으로

const ERRORS: Record<string, string> = {
  login: "로그인이 끊겼습니다. 다시 로그인한 뒤 새로고침하세요.",
  "not-configured": "서버에 OPENAI_API_KEY가 설정되지 않았습니다.",
  "openai-key": "OpenAI API 키가 올바르지 않습니다. 키를 확인하세요.",
  "openai-limit": "OpenAI 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도하거나 결제 잔액을 확인하세요.",
  openai: "모델이 답을 쓰지 못했습니다. 다시 시도하세요.",
  empty: "PDF에서 글자를 찾지 못했습니다. 스캔한 이미지로만 된 PDF일 수 있습니다.",
};

export const errorText = (code: string) => ERRORS[code] ?? `만들지 못했습니다. (${code})`;

/** 다른 페이지에서도 똑같이 날 오류. 이게 나면 자동으로 이어 하지 않는다. */
export const FATAL = new Set(["login", "not-configured", "openai-key", "openai-limit"]);

/** API를 불러 JSON을 받는다. 실패하면 오류 코드를 메시지로 던진다. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}
