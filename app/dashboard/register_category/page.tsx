// app/dashboard/register_category/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiEdit2, FiX, FiPlus } from "react-icons/fi";
import { AutoTextarea } from "@/components/AutoTextarea";

export default function RegisterCategoryPage() {
  const [categories, setCategories] = useState<any[]>([]);

  const [mainCategory, setMainCategory] = useState("");
  const [subCategoryInput, setSubCategoryInput] = useState(""); // 입력 칸 값 (한글)
  const [subCategories, setSubCategories] = useState<string[]>([]); // 🌟 서브 카테고리 배열

  // 🌐 영문 (옵셔널)
  const [engMainCategory, setEngMainCategory] = useState("");
  const [engSubCategoryInput, setEngSubCategoryInput] = useState(""); // 영문 입력 값
  const [engSubCategories, setEngSubCategories] = useState<string[]>([]); // 같은 인덱스로 매칭
  const [showEng, setShowEng] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🌐 영문 입력 토글
  const openEng = () => setShowEng(true);
  const closeEng = () => {
    const hasEngData =
      engMainCategory ||
      engSubCategories.some((s) => s) ||
      engSubCategoryInput;
    if (hasEngData &&
      !window.confirm("입력한 영문 내용을 비우고 영문 칸을 닫으시겠습니까?")) {
      return;
    }
    setEngMainCategory("");
    setEngSubCategories(subCategories.map(() => ""));
    setEngSubCategoryInput("");
    setShowEng(false);
  };

  // 목록 불러오기
  const fetchCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 🌟 서브 카테고리 태그 추가 버튼
  // 🌐 한글/영문을 같은 인덱스로 동시 추가
  const handleAddSubCategory = () => {
    const trimmed = subCategoryInput.trim();
    if (!trimmed) return;
    if (subCategories.includes(trimmed)) {
      alert("이미 추가된 서브 카테고리입니다.");
      return;
    }
    setSubCategories([...subCategories, trimmed]);
    setEngSubCategories([...engSubCategories, engSubCategoryInput.trim()]);
    setSubCategoryInput("");
    setEngSubCategoryInput("");
  };

  // 엔터 키 쳤을 때 태그 추가
  const handleSubCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubCategory();
    }
  };

  // 태그 삭제 (인덱스 기반으로 한/영 동시 삭제)
  const removeSubCategory = (idx: number) => {
    setSubCategories(subCategories.filter((_, i) => i !== idx));
    setEngSubCategories(engSubCategories.filter((_, i) => i !== idx));
  };

  // 🌐 기존 서브 카테고리의 영문 값 수정
  const updateEngSubCategory = (idx: number, value: string) => {
    setEngSubCategories(
      engSubCategories.map((eng, i) => (i === idx ? value : eng)),
    );
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
        // 🌐 영문 (빈 문자열 허용, 백엔드에서 인덱스 매칭 보장)
        eng_main_category: engMainCategory.trim(),
        eng_sub_categories: engSubCategories,
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
    const subs = cat.sub_categories || [];
    setSubCategories(subs);
    // 🌐 영문 데이터 로드 (인덱스 매칭 보장, 누락 시 빈 문자열)
    const engMain = cat.eng_main_category || "";
    const rawEngSubs = cat.eng_sub_categories || [];
    const engSubs = subs.map((_: string, idx: number) => rawEngSubs[idx] || "");
    setEngMainCategory(engMain);
    setEngSubCategories(engSubs);
    setShowEng(!!(engMain || engSubs.some((s: string) => s)));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setEngMainCategory("");
    setEngSubCategories([]);
    setEngSubCategoryInput("");
    setShowEng(false);
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
              메인 카테고리명 {showEng && <span className="text-slate-400 font-normal">(한글)</span>} (예: 난방 제어)
            </label>
            <AutoTextarea
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value)}
              disabled={editMode} // 🌟 식별자 역할을 하므로 수정 모드일 땐 이름 변경 불가
              className={`w-full px-4 py-3 border rounded-lg text-slate-900 ${editMode ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500"}`}
            />
          </div>

          {/* 🌐 영문 메인 카테고리 (옵셔널) */}
          {showEng && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Main Category Name <span className="text-slate-400 font-normal">(English, 선택)</span>
              </label>
              <AutoTextarea
                value={engMainCategory}
                onChange={(e) => setEngMainCategory(e.target.value)}
                placeholder="e.g. Heating Control"
                className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>
          )}

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              하위 서브 카테고리 추가
            </label>
            {showEng ? (
              <div className="flex flex-col gap-2 mb-4">
                <input
                  type="text"
                  value={subCategoryInput}
                  onChange={(e) => setSubCategoryInput(e.target.value)}
                  placeholder="한글: 예) 온도조절"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={engSubCategoryInput}
                    onChange={(e) => setEngSubCategoryInput(e.target.value)}
                    onKeyDown={handleSubCategoryKeyDown}
                    placeholder="English (선택): e.g. Temperature Control"
                    className="flex-1 px-4 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubCategory}
                    className="bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-100 flex items-center font-bold text-slate-700"
                  >
                    <FiPlus className="mr-1" /> 추가
                  </button>
                </div>
              </div>
            ) : (
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
            )}

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
                  className="flex flex-col gap-1 bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg"
                >
                  <div className="flex items-center text-blue-800 text-sm font-semibold">
                    {sub}
                    <button
                      type="button"
                      onClick={() => removeSubCategory(idx)}
                      className="ml-2 text-blue-500 hover:text-red-500"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                  {showEng && (
                    <input
                      type="text"
                      value={engSubCategories[idx] || ""}
                      onChange={(e) => updateEngSubCategory(idx, e.target.value)}
                      placeholder="English (선택)"
                      className="px-2 py-0.5 border border-blue-200 bg-white rounded text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 min-w-[150px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 🌐 영문 추가/제거 버튼 */}
          {showEng ? (
            <button
              type="button"
              onClick={closeEng}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-lg text-xs font-semibold transition-colors"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              영문 입력 제거
            </button>
          ) : (
            <button
              type="button"
              onClick={openEng}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-500 rounded-lg text-sm font-semibold transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              영문(English) 입력 추가하기
            </button>
          )}

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
            <h3 className="text-xl font-bold text-blue-800 mb-1">
              {cat.main_category}
            </h3>
            {cat.eng_main_category && (
              <p className="text-xs text-slate-500 italic mb-3">
                {cat.eng_main_category}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {cat.sub_categories?.length > 0 ? (
                cat.sub_categories.map((sub: string, i: number) => {
                  const eng = cat.eng_sub_categories?.[i] || "";
                  return (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded text-xs font-semibold"
                      title={eng ? `영문: ${eng}` : "영문 미등록"}
                    >
                      {sub}
                      {eng && (
                        <span className="ml-1 text-slate-400 italic font-normal">
                          / {eng}
                        </span>
                      )}
                    </span>
                  );
                })
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
