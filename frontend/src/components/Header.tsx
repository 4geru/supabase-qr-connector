'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'

export default function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('Header')

  console.log('現在の言語:', locale)
  console.log('現在のパス:', pathname)

  // URLに言語情報が含まれているか確認し、含まれていない場合はリダイレクト
  useEffect(() => {
    // すでにマッチしている場合はスキップ
    if (pathname && !pathname.match(/^\/[a-z]{2}(\/|$)/)) {
      console.log('言語情報がURLに含まれていません。リダイレクトします。')
      const newPath = `/${locale}${pathname === '/' ? '' : pathname}`
      window.location.href = newPath
    }
  }, [pathname, locale])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  const changeLanguage = (newLocale: string) => {
    // 言語を切り替える最もシンプルな方法
    if (newLocale !== locale) {
      // 現在のURLから言語部分を取得
      const currentUrl = window.location.href
      // 新しい言語に置き換える
      const newUrl = currentUrl.replace(/\/(en|ja)(\/|$)/, `/${newLocale}$2`)
      // 新しいURLに遷移する
      window.location.href = newUrl
    }
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={`/${locale}`} className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Image
                  src="/images/SupaQR-icon.png"
                  alt="SupaQR Icon"
                  width={32}
                  height={32}
                />
                <span>SupaQR</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  locale === 'en' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('ja')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  locale === 'ja' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                日本語
              </button>
            </div>
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href={`/${locale}/login`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {t('login')}
                </Link>
                <Link
                  href={`/${locale}/signup`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {t('signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 