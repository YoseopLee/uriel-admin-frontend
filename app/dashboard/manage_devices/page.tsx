// app/dashboard/manage_devices/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiExternalLink, FiEdit, FiSearch, FiX } from "react-icons/fi";

// 간단한 타입 정의
interface DeviceItem {
  id: string;
  main_category: string;
  sub_category: string[];
  thumbnail_info: {
    title: string;
    image_url: string;
  };
  created_at: string;
}

// 🌟 카테고리 탭: 모든 카테고리를 의미하는 특수 값
const ALL_CATEGORIES = "__ALL__";

export default function ManageDevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 🌟 검색어 + 카테고리 필터 state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const router = useRouter();

  // 🌟 카테고리별 제품 수 + 정렬된 카테고리 목록
  const { categoryList, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach((d) => {
      const cat = d.main_category || "기타";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const list = Object.keys(counts).sort((a, b) => a.localeCompare(b, "ko"));
    return { categoryList: list, categoryCounts: counts };
  }, [devices]);

  // 🌟 필터링된 제품 목록 (선택된 카테고리 + 검색어 적용)
  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return devices.filter((d) => {
      // 카테고리 필터
      if (selectedCategory !== ALL_CATEGORIES && d.main_category !== selectedCategory) {
        return false;
      }
      // 검색어 필터 (제품명)
      if (q && !(d.thumbnail_info?.title || "").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [devices, searchQuery, selectedCategory]);

  // 🌟 컴포넌트 로드 시 제품 목록 불러오기
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      // 🔧 어드민에서는 전체 제품 목록을 봐야 하므로 limit를 충분히 크게 설정
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/devices?limit=1000`);
      if (!res.ok) throw new Error("목록 불러오기 실패");
      const jsonResponse = await res.json();
      setDevices(jsonResponse.data || []);
    } catch (error) {
      console.error(error);
      alert("제품 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // 🌟 삭제 버튼 클릭 핸들러
  const handleDelete = async (id: string, title: string) => {
    // 실수로 지우는 걸 방지하기 위해 한 번 더 확인!
    const confirmDelete = window.confirm(
      `정말로 [${title}] 제품을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
    );
    if (!confirmDelete) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      // 백엔드 삭제 API 호출 (DELETE 메소드)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/devices/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error("삭제 실패");

      alert("✅ 제품이 삭제되었습니다.");

      // 삭제 성공 후 목록 새로고침 (화면에서 해당 항목 제거)
      setDevices(devices.filter((device) => device.id !== id));
    } catch (error) {
      console.error(error);
      alert("제품 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-end mb-8 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            등록된 제품 관리
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            현재 홈페이지에 등록된 모든 제품 목록입니다. (총 {devices.length}개)
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-500">
          데이터를 불러오는 중입니다...
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-slate-500">
          등록된 제품이 없습니다. 새로운 제품을 먼저 등록해주세요.
        </div>
      ) : (
        <>
          {/* 🌟 검색 + 카테고리 필터 영역 */}
          <div className="space-y-4 mb-5">
            {/* 검색 input */}
            <div className="relative max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제품명으로 검색..."
                className="w-full pl-10 pr-9 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                  title="검색어 지우기"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            {/* 카테고리 탭 */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(ALL_CATEGORIES)}
                className={`text-sm px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                  selectedCategory === ALL_CATEGORIES
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                전체 <span className="ml-1 opacity-80">({devices.length})</span>
              </button>
              {categoryList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-sm px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat}{" "}
                  <span className="ml-1 opacity-80">
                    ({categoryCounts[cat]})
                  </span>
                </button>
              ))}
            </div>

            {/* 현재 필터 결과 요약 */}
            <p className="text-xs text-slate-500">
              {filteredDevices.length}건 표시 중
              {selectedCategory !== ALL_CATEGORIES && (
                <span className="ml-1">· 카테고리: {selectedCategory}</span>
              )}
              {searchQuery && (
                <span className="ml-1">· 검색: &quot;{searchQuery}&quot;</span>
              )}
            </p>
          </div>

          {/* 결과 없음 처리 */}
          {filteredDevices.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-slate-500">
              검색 조건에 맞는 제품이 없습니다.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(ALL_CATEGORIES);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  필터 초기화
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-wider border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-4">이미지</th>
                    <th className="px-6 py-4">제품명 (타이틀)</th>
                    <th className="px-6 py-4">카테고리</th>
                    <th className="px-6 py-4">등록일</th>
                    <th className="px-6 py-4 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDevices.map((device) => (
                <tr
                  key={device.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <img
                      src={
                        device.thumbnail_info?.image_url ||
                        "https://via.placeholder.com/100"
                      }
                      alt="thumbnail"
                      className="w-16 h-16 object-cover rounded-md border border-slate-200 shadow-sm"
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {device.thumbnail_info?.title || "제목 없음"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md font-bold mb-1">
                      {device.main_category}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">
                      {device.sub_category?.join(", ")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(device.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          window.open(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/devices/${device.id}`,
                          )
                        }
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="데이터 원본 확인"
                      >
                        <FiExternalLink size={18} />
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/register_device?editId=${device.id}`,
                          )
                        }
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(device.id, device.thumbnail_info?.title)
                        }
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
