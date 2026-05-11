// components/AutoTextarea.tsx
// 🌟 input처럼 보이지만 textarea라서 줄바꿈(\n) 입력 가능
// 사용처: 어드민의 텍스트 콘텐츠 필드 (title, subtitle 등)
//
// - 한 줄로 시작하고, 내용이 길어지면 줄바꿈에 맞춰 자동으로 높이가 늘어남
// - resize 핸들 비활성화 (스타일 일관성 유지)
// - Enter 키: 줄바꿈 ✅
"use client";

import { useEffect, useRef, forwardRef } from "react";

type Props = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "rows" | "ref"
> & {
  /** 최소 줄 수 (기본 1) */
  minRows?: number;
};

export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function AutoTextarea(
    { className = "", minRows = 1, value, onChange, ...rest },
    forwardedRef,
  ) {
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // forwardedRef와 internalRef 둘 다 연결
    const setRef = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    // 🌟 내용에 맞춰 높이 자동 조절
    const resize = () => {
      const el = internalRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
      resize();
    }, [value]);

    return (
      <textarea
        ref={setRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
        }}
        onInput={resize}
        rows={minRows}
        className={`resize-none overflow-hidden ${className}`}
        {...rest}
      />
    );
  },
);
