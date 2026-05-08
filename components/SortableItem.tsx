// components/SortableItem.tsx
// 🌟 D&D 정렬 가능한 항목 래퍼 컴포넌트
// 사용처: Our Story, Landing, Blog, Lounge, Device 등 모든 섹션 빌더
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiMove } from "react-icons/fi";

interface SortableItemProps {
  id: number | string;
  children: React.ReactNode;
  /** 드래그 핸들 위치 (default: top-left). 카드 디자인에 맞게 조정 */
  handlePosition?: "top-left" | "left-side";
  /** 핸들 위치를 수동으로 absolute 배치할 때 className 오버라이드 */
  handleClassName?: string;
  /** 카드 wrapper에 추가 className */
  className?: string;
  /** 드래그 중 표시 강도 조정 (기본 0.5) */
  draggingOpacity?: number;
}

export function SortableItem({
  id,
  children,
  handlePosition = "top-left",
  handleClassName,
  className = "",
  draggingOpacity = 0.5,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? draggingOpacity : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  // 핸들 기본 스타일 (카드 좌상단 또는 좌측 사이드)
  const defaultHandleClass =
    handlePosition === "top-left"
      ? "absolute top-3 left-3 z-10"
      : "absolute top-1/2 -translate-y-1/2 left-2 z-10";

  return (
    <div ref={setNodeRef} style={style} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="드래그하여 순서 변경"
        title="드래그하여 순서 변경"
        className={
          handleClassName ||
          `${defaultHandleClass} cursor-grab active:cursor-grabbing p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 touch-none`
        }
        {...attributes}
        {...listeners}
      >
        <FiMove className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}
