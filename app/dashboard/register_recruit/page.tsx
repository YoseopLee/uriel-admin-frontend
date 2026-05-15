// app/dashboard/register_recruit/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  FiTrash2,
  FiEdit2,
  FiX,
  FiPlus,
  FiBriefcase,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiSearch,
} from "react-icons/fi";
import { AutoTextarea } from "@/components/AutoTextarea";

// 채용 플랫폼 링크 항목
interface RecruitLink {
  label: string;
  url: string;
  engLabel: string;
}

// 어드민 폼 상태
interface RecruitFormState {
  department: string;
  engDepartment: string;
  title: string;
  engTitle: string;
  employmentType: string;
  engEmploymentType: string;
  description: string;
  engDescription: string;
  location: string;
  engLocation: string;
  experienceLevel: string;
  engExperienceLevel: string;
  links: RecruitLink[];
  deadline: string; // YYYY-MM-DD
  isActive: boolean;
  showEng: boolean; // 영문 입력 표시 토글 (UI 전용)
}

// 응답 항목 (어드민용)
interface RecruitListItem {
  id: string;
  department: string;
  eng_department?: string;
  title: string;
  eng_title?: string;
  employment_type: string;
  eng_employment_type?: string;
  description?: string;
  eng_description?: string;
  location?: string;
  eng_location?: string;
  experience_level?: string;
  eng_experience_level?: string;
  links?: Array<{ label: string; url: string; eng_label?: string }>;
  deadline?: string;
  is_active?: boolean;
  _visible?: boolean;
  created_at: string;
}

const initialFormState: RecruitFormState = {
  department: "",
  engDepartment: "",
  title: "",
  engTitle: "",
  employmentType: "정규직",
  engEmploymentType: "Full-time",
  description: "",
  engDescription: "",
  location: "",
  engLocation: "",
  experienceLevel: "",
  engExperienceLevel: "",
  links: [{ label: "", url: "", engLabel: "" }],
  deadline: "",
  isActive: true,
  showEng: false,
};

export default function RegisterRecruitPage() {
  const [list, setList] = useState<RecruitListItem[]>([]);
  const [form, setForm] = useState<RecruitFormState>(initialFormState);
  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 🌟 목록 불러오기 (include_inactive=true: 마감/숨김 항목도 표시)
  const fetchList = async () => {
    setIsListLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/recruits?include_inactive=true`,
      );
      if (!res.ok) throw new Error("목록 조회 실패");
      const data = await res.json();
      setList(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // 🌟 검색 필터링 (직무명/직군으로)
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      return (
        (item.title || "").toLowerCase().includes(q) ||
        (item.department || "").toLowerCase().includes(q) ||
        (item.eng_title || "").toLowerCase().includes(q) ||
        (item.eng_department || "").toLowerCase().includes(q)
      );
    });
  }, [list, searchQuery]);

  // 🌟 폼 헬퍼
  const updateField = <K extends keyof RecruitFormState>(
    key: K,
    value: RecruitFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // 🌟 영문 토글
  const openEng = () => updateField("showEng", true);
  const closeEng = () => {
    const hasEng = !!(
      form.engDepartment ||
      form.engTitle ||
      form.engEmploymentType ||
      form.engDescription ||
      form.engLocation ||
      form.engExperienceLevel ||
      form.links.some((l) => l.engLabel)
    );
    if (hasEng && !window.confirm("입력한 영문 내용을 비우시겠습니까?")) return;
    setForm((prev) => ({
      ...prev,
      engDepartment: "",
      engTitle: "",
      engEmploymentType: "",
      engDescription: "",
      engLocation: "",
      engExperienceLevel: "",
      links: prev.links.map((l) => ({ ...l, engLabel: "" })),
      showEng: false,
    }));
  };

  // 🌟 링크 핸들러
  const addLink = () =>
    setForm((prev) => ({
      ...prev,
      links: [...prev.links, { label: "", url: "", engLabel: "" }],
    }));
  const removeLink = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== idx),
    }));
  const updateLink = (idx: number, key: keyof RecruitLink, value: string) =>
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l, i) => (i === idx ? { ...l, [key]: value } : l)),
    }));

  // 🌟 폼 초기화
  const resetForm = () => {
    setForm(initialFormState);
    setEditId(null);
  };

  // 🌟 수정 모드 진입
  const handleEditClick = (item: RecruitListItem) => {
    setEditId(item.id);
    const hasEng = !!(
      item.eng_department ||
      item.eng_title ||
      item.eng_employment_type ||
      item.eng_description ||
      item.eng_location ||
      item.eng_experience_level ||
      (item.links || []).some((l) => l.eng_label)
    );
    setForm({
      department: item.department || "",
      engDepartment: item.eng_department || "",
      title: item.title || "",
      engTitle: item.eng_title || "",
      employmentType: item.employment_type || "정규직",
      engEmploymentType: item.eng_employment_type || "",
      description: item.description || "",
      engDescription: item.eng_description || "",
      location: item.location || "",
      engLocation: item.eng_location || "",
      experienceLevel: item.experience_level || "",
      engExperienceLevel: item.eng_experience_level || "",
      links:
        (item.links || []).length > 0
          ? item.links!.map((l) => ({
              label: l.label || "",
              url: l.url || "",
              engLabel: l.eng_label || "",
            }))
          : [{ label: "", url: "", engLabel: "" }],
      deadline: item.deadline || "",
      isActive: item.is_active !== false,
      showEng: hasEng,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 🌟 삭제
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`정말로 [${title}] 채용공고를 삭제하시겠습니까?`)) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/recruits/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("삭제 실패");
      alert("삭제되었습니다.");
      fetchList();
      if (editId === id) resetForm();
    } catch (err: any) {
      alert(`삭제 실패: ${err?.message || "알 수 없는 에러"}`);
    }
  };

  // 🌟 활성/비활성 빠른 토글
  const toggleActive = async (item: RecruitListItem) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/recruits/${item.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: !item.is_active }),
        },
      );
      if (!res.ok) throw new Error("상태 변경 실패");
      fetchList();
    } catch (err: any) {
      alert(`상태 변경 실패: ${err?.message || "알 수 없는 에러"}`);
    }
  };

  // 🌟 폼 제출 (등록/수정)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("직무명을 입력해주세요.");
      return;
    }
    if (!form.department.trim()) {
      alert("직군을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      const payload = {
        department: form.department.trim(),
        eng_department: form.engDepartment.trim(),
        title: form.title.trim(),
        eng_title: form.engTitle.trim(),
        employment_type: form.employmentType.trim(),
        eng_employment_type: form.engEmploymentType.trim(),
        description: form.description.trim(),
        eng_description: form.engDescription.trim(),
        location: form.location.trim(),
        eng_location: form.engLocation.trim(),
        experience_level: form.experienceLevel.trim(),
        eng_experience_level: form.engExperienceLevel.trim(),
        links: form.links
          .filter((l) => l.label.trim() || l.url.trim())
          .map((l) => ({
            label: l.label.trim(),
            url: l.url.trim(),
            eng_label: l.engLabel.trim(),
          })),
        deadline: form.deadline,
        is_active: form.isActive,
      };

      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/recruits/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/recruits`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("저장 실패");

      alert(editId ? "수정되었습니다." : "등록되었습니다.");
      resetForm();
      fetchList();
    } catch (err: any) {
      alert(`오류 발생: ${err?.message || "알 수 없는 에러"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ===== 상단 폼 ===== */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <FiBriefcase className="mr-2" />
            {editId ? "채용공고 수정" : "채용공고 신규 등록"}
          </h2>
          {editId && (
            <button
              onClick={resetForm}
              className="text-sm flex items-center text-slate-500 hover:text-slate-800"
            >
              <FiX className="mr-1" /> 수정 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. 직군 + 직무명 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                직군 {form.showEng && (
                  <span className="text-slate-400 font-normal">(한글)</span>
                )}{" "}
                <span className="text-red-500">*</span>
              </label>
              <AutoTextarea
                value={form.department}
                onChange={(e) => updateField("department", e.target.value)}
                placeholder="예: 디자이너, 개발자, 영업 등"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                직무명 {form.showEng && (
                  <span className="text-slate-400 font-normal">(한글)</span>
                )}{" "}
                <span className="text-red-500">*</span>
              </label>
              <AutoTextarea
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="예: 그래픽 디자이너, 소프트웨어 엔지니어"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>
          {form.showEng && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Department{" "}
                  <span className="text-slate-400 font-normal">
                    (English, 선택)
                  </span>
                </label>
                <AutoTextarea
                  value={form.engDepartment}
                  onChange={(e) =>
                    updateField("engDepartment", e.target.value)
                  }
                  placeholder="e.g. Designer, Developer"
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Title{" "}
                  <span className="text-slate-400 font-normal">
                    (English, 선택)
                  </span>
                </label>
                <AutoTextarea
                  value={form.engTitle}
                  onChange={(e) => updateField("engTitle", e.target.value)}
                  placeholder="e.g. Graphic Designer"
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>
          )}

          {/* 2. 직무 형태 + 경력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                직무 형태 {form.showEng && (
                  <span className="text-slate-400 font-normal">(한글)</span>
                )}
              </label>
              <AutoTextarea
                value={form.employmentType}
                onChange={(e) => updateField("employmentType", e.target.value)}
                placeholder="예: 정규직, 계약직, 인턴"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                경력 {form.showEng && (
                  <span className="text-slate-400 font-normal">(한글)</span>
                )}
              </label>
              <AutoTextarea
                value={form.experienceLevel}
                onChange={(e) =>
                  updateField("experienceLevel", e.target.value)
                }
                placeholder="예: 신입, 경력 3년 이상, 경력 무관"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>
          {form.showEng && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Employment Type{" "}
                  <span className="text-slate-400 font-normal">
                    (English, 선택)
                  </span>
                </label>
                <AutoTextarea
                  value={form.engEmploymentType}
                  onChange={(e) =>
                    updateField("engEmploymentType", e.target.value)
                  }
                  placeholder="e.g. Full-time, Contract"
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Experience{" "}
                  <span className="text-slate-400 font-normal">
                    (English, 선택)
                  </span>
                </label>
                <AutoTextarea
                  value={form.engExperienceLevel}
                  onChange={(e) =>
                    updateField("engExperienceLevel", e.target.value)
                  }
                  placeholder="e.g. Entry, 3+ years, Any"
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>
          )}

          {/* 3. 근무지 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              근무지 {form.showEng && (
                <span className="text-slate-400 font-normal">(한글)</span>
              )}
            </label>
            <AutoTextarea
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="예: 경기도 고양시 덕양구 향기로 52"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>
          {form.showEng && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Location{" "}
                <span className="text-slate-400 font-normal">
                  (English, 선택)
                </span>
              </label>
              <AutoTextarea
                value={form.engLocation}
                onChange={(e) => updateField("engLocation", e.target.value)}
                placeholder="e.g. Goyang-si, Gyeonggi-do"
                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>
          )}

          {/* 4. 설명 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              간단 설명 {form.showEng && (
                <span className="text-slate-400 font-normal">(한글, 선택)</span>
              )}
            </label>
            <AutoTextarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="채용 배경, 주요 업무 등을 간단히 적어주세요"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 min-h-[80px]"
              minRows={3}
            />
          </div>
          {form.showEng && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Description{" "}
                <span className="text-slate-400 font-normal">
                  (English, 선택)
                </span>
              </label>
              <AutoTextarea
                value={form.engDescription}
                onChange={(e) =>
                  updateField("engDescription", e.target.value)
                }
                placeholder="Brief description in English"
                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 min-h-[80px]"
                minRows={3}
              />
            </div>
          )}

          {/* 영문 추가/제거 버튼 */}
          {form.showEng ? (
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

          {/* 5. 외부 채용 플랫폼 링크 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-slate-700">
                외부 채용 플랫폼 링크 (최소 1개)
              </label>
              <button
                type="button"
                onClick={addLink}
                className="text-sm bg-white border border-slate-300 px-3 py-1 rounded-lg hover:bg-slate-100 flex items-center gap-1 font-semibold text-slate-700"
              >
                <FiPlus /> 링크 추가
              </button>
            </div>
            {form.links.map((link, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 relative"
              >
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  disabled={form.links.length === 1}
                  className="absolute top-2 right-2 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="이 링크 삭제"
                >
                  <FiTrash2 size={14} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pr-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      라벨 (한글)
                    </label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(idx, "label", e.target.value)}
                      placeholder="예: 잡코리아"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      URL
                    </label>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      placeholder="https://www.jobkorea.co.kr/..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-mono"
                    />
                  </div>
                </div>
                {form.showEng && (
                  <div className="pr-6">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      라벨 (English, 선택)
                    </label>
                    <input
                      type="text"
                      value={link.engLabel}
                      onChange={(e) =>
                        updateLink(idx, "engLabel", e.target.value)
                      }
                      placeholder="e.g. JobKorea"
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 6. 마감 처리: 마감일 + 활성 토글 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-bold text-amber-900 flex items-center">
              📅 마감 처리
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  채용 마감일 (비워두면 무기한)
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => updateField("deadline", e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  마감일이 지나면 회사 홈페이지에서 자동으로 숨겨집니다.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  활성 상태 (강제 노출/숨김)
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none w-fit bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField("isActive", e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  {form.isActive ? (
                    <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                      <FiEye /> 노출 중
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                      <FiEyeOff /> 숨김
                    </span>
                  )}
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  체크 해제하면 마감일과 무관하게 강제 숨김됩니다.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg disabled:bg-blue-300"
          >
            {isLoading
              ? "처리중..."
              : editId
                ? "채용공고 수정하기"
                : "채용공고 등록하기"}
          </button>
        </form>
      </div>

      {/* ===== 하단 리스트 ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            등록된 채용공고 ({list.length})
          </h3>
        </div>

        {/* 검색 */}
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="직무명 또는 직군으로 검색..."
            className="w-full pl-10 pr-9 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {isListLoading ? (
          <div className="text-center py-10 text-slate-500">
            불러오는 중...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-slate-500">
            {list.length === 0
              ? "등록된 채용공고가 없습니다."
              : "검색 결과가 없습니다."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((item) => {
              const isVisible = item._visible !== false;
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isVisible
                      ? "bg-white border-slate-200 hover:border-slate-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {item.department || "직군 미정"}
                        </span>
                        {item.employment_type && (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.employment_type}
                          </span>
                        )}
                        {item.experience_level && (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.experience_level}
                          </span>
                        )}
                        {/* 상태 뱃지 */}
                        {!isVisible && (
                          <span className="text-xs font-bold text-white bg-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                            <FiEyeOff size={10} />
                            {item.is_active === false ? "숨김" : "마감"}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg whitespace-pre-line">
                        {item.title}
                      </h4>
                      {item.location && (
                        <p className="text-xs text-slate-500 mt-1">
                          📍 {item.location}
                        </p>
                      )}
                      {item.deadline && (
                        <p className="text-xs text-slate-500 mt-1">
                          ⏰ 마감: {item.deadline}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}
                      {item.links && item.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.links.map((l, i) => (
                            <a
                              key={i}
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <FiExternalLink size={12} />
                              {l.label || l.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.is_active !== false
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-400 hover:bg-slate-100"
                        }`}
                        title={
                          item.is_active !== false ? "숨김으로 전환" : "노출로 전환"
                        }
                      >
                        {item.is_active !== false ? (
                          <FiEye size={18} />
                        ) : (
                          <FiEyeOff size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
