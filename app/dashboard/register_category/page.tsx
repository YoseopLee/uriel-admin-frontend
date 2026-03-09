// app/dashboard/register_category/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiEdit2, FiX, FiPlus } from "react-icons/fi";

export default function RegisterCategoryPage() {
  const [categories, setCategories] = useState<any[]>([]);

  const [mainCategory, setMainCategory] = useState("");
  const [subCategoryInput, setSubCategoryInput] = useState(""); // 입력 칸 값
  const [subCategories, setSubCategories] = useState<string[]>([]); // 🌟 서브 카테고리 배열

  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 목록 불러오기
  const fetchCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
      );
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 🌟 서브 카테고리 태그 추가 버튼
  const handleAddSubCategory = () => {
    const trimmed = subCategoryInput.trim();
    if (!trimmed) return;
    if (subCategories.includes(trimmed)) {
      alert("이미 추가된 서브 카테고리입니다.");
      return;
    }
    setSubCategories([...subCategories, trimmed]);
    setSubCategoryInput("");
  };

  // 엔터 키 쳤을 때 태그 추가
  const handleSubCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubCategory();
    }
  };

  // 태그 삭제
  const removeSubCategory = (sub: string) => {
    setSubCategories(subCategories.filter((s) => s !== sub));
  };

  // 🌟 폼 제출 (POST 하나로 등록/수정 모두 처리)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainCategory.trim()) {
      alert("메인 카테고리 이름을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      const payload = {
        main_category: mainCategory.trim(),
        sub_categories: subCategories,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("저장 실패");

      alert("✅ 카테고리가 성공적으로 저장되었습니다!");
      resetForm();
      fetchCategories();
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 수정 모드 진입
  const handleEditClick = (cat: any) => {
    setEditMode(true);
    setMainCategory(cat.main_category);
    setSubCategories(cat.sub_categories || []);
    window.scrollTo({ top: 0, behavior: "smooth" }); // 화면 맨 위로 올리기
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "정말 삭제하시겠습니까? (이 메인 카테고리에 속한 서브 카테고리도 모두 날아갑니다)",
      )
    )
      return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCategories();
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const resetForm = () => {
    setEditMode(false);
    setMainCategory("");
    setSubCategories([]);
    setSubCategoryInput("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ===== 상단 폼 (등록/수정) ===== */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {editMode ? "카테고리 구성 수정" : "새 메인 카테고리 만들기"}
          </h2>
          {editMode && (
            <button
              onClick={resetForm}
              className="text-sm text-slate-500 hover:text-slate-800 flex"
            >
              <FiX className="mr-1 mt-0.5" /> 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              메인 카테고리명 (예: 난방 제어)
            </label>
            <input
              type="text"
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value)}
              disabled={editMode} // 🌟 식별자 역할을 하므로 수정 모드일 땐 이름 변경 불가
              className={`w-full px-4 py-3 border rounded-lg text-slate-900 ${editMode ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500"}`}
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              하위 서브 카테고리 추가
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={subCategoryInput}
                onChange={(e) => setSubCategoryInput(e.target.value)}
                onKeyDown={handleSubCategoryKeyDown}
                placeholder="엔터 또는 추가 버튼을 누르세요"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddSubCategory}
                className="bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-100 flex items-center font-bold text-slate-700"
              >
                <FiPlus className="mr-1" /> 추가
              </button>
            </div>

            {/* 🌟 등록된 서브 카테고리 태그들 보여주기 */}
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {subCategories.length === 0 && (
                <span className="text-sm text-slate-400 mt-2">
                  등록된 서브 카테고리가 없습니다.
                </span>
              )}
              {subCategories.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-semibold"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => removeSubCategory(sub)}
                    className="ml-2 text-blue-500 hover:text-red-500"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl shadow-lg transition-colors text-lg"
          >
            {isLoading ? "저장 중..." : "카테고리 구성 저장하기"}
          </button>
        </form>
      </div>

      {/* ===== 하단 리스트 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative"
          >
            <div className="absolute top-6 right-6 flex gap-2">
              <button
                onClick={() => handleEditClick(cat)}
                className="text-slate-400 hover:text-green-600"
              >
                <FiEdit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-blue-800 mb-4">
              {cat.main_category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {cat.sub_categories?.length > 0 ? (
                cat.sub_categories.map((sub: string, i: number) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded text-xs font-semibold"
                  >
                    {sub}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  하위 카테고리 없음
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
