import { profile } from "@/content/profile";

// 임시 로고. 로고가 정해지면 이 파일만 교체한다.
export function Logo({ className = "" }: { className?: string }) {
  return <span className={`font-gothic leading-none ${className}`}>{profile.code}</span>;
}
