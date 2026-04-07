// app/dashboard/layout.tsx
"use client"; // 클라이언트 사이드 동작(로그아웃, 메뉴 토글 등)을 위해

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import {
  FiHome,
  FiFileText,
  FiImage,
  FiSettings,
  FiLogOut,
  FiMessageCircle,
  FiList,
  FiBookOpen,
  FiEdit3,
  FiMail,
  FiInbox,
  FiCoffee,
} from "react-icons/fi";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // 현재 선택된 메뉴를 하이라이트하기 위함
  const router = useRouter();

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    try {
      await signOut(); // Amplify를 통한 Cognito 로그아웃
      router.push("/"); // 로그아웃 후 로그인 화면(메인)으로 이동
    } catch (error) {
      console.error("로그아웃 에러:", error);
      alert("로그아웃 중 문제가 발생했습니다.");
    }
  };

  // 사이드바 메뉴 목록 업데이트
  const menuItems = [
    {
      name: "대시보드 홈",
      path: "/dashboard",
      icon: <FiHome className="w-5 h-5" />,
    },
    {
      name: "랜딩페이지 관리",
      path: "/dashboard/register_landing",
      icon: <FiImage className="w-5 h-5" />,
    },
    {
      name: "카테고리 관리",
      path: "/dashboard/register_category",
      icon: <FiSettings className="w-5 h-5" />,
    },
    {
      name: "제품 등록",
      path: "/dashboard/register_device",
      icon: <FiFileText className="w-5 h-5" />,
    },
    {
      name: "등록된 제품 관리",
      path: "/dashboard/manage_devices",
      icon: <FiList className="w-5 h-5" />,
    },
    {
      name: "고객 문의 관리",
      path: "/dashboard/manage_inquiry",
      icon: <FiInbox className="w-5 h-5" />,
    },
    {
      name: "FAQ 관리",
      path: "/dashboard/register_faq",
      icon: <FiMessageCircle className="w-5 h-5" />,
    },
    {
      name: "제품 가이드 관리",
      path: "/dashboard/register_guide",
      icon: <FiBookOpen className="w-5 h-5" />,
    },
    {
      name: "블로그 관리",
      path: "/dashboard/register_blog",
      icon: <FiEdit3 className="w-5 h-5" />,
    },
    {
      name: "엔지니어 라운지",
      path: "/dashboard/register_lounge",
      icon: <FiCoffee className="w-5 h-5" />,
    },
    {
      name: "구독자 이메일 관리",
      path: "/dashboard/manage_email",
      icon: <FiMail className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 📌 왼쪽 사이드바 영역 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">우리엘 어드민</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* 하단 로그아웃 버튼 */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiLogOut className="w-5 h-5" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 📌 오른쪽 메인 컨텐츠 영역 */}
      <main className="flex-1 flex flex-col">
        {/* 상단 헤더 영역 */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-slate-700">
            {menuItems.find((m) => m.path === pathname)?.name ||
              "관리자 페이지"}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">
              관리자님, 환영합니다.
            </span>
            {/* 여기에 나중에 관리자 프로필 사진 등을 넣을 수 있어 */}
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              A
            </div>
          </div>
        </header>

        {/* 실제 각 페이지의 내용(children)이 렌더링되는 부분 */}
        <div className="flex-1 p-8 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
