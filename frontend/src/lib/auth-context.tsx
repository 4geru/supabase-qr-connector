'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useLocale } from 'next-intl'

interface List {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
}

interface ListState {
  lists: List[];
  loading: boolean;
  error: string | null;
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  listState: ListState
  updateListState: (updates: Partial<ListState>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [listState, setListState] = useState<ListState>({
    lists: [],
    loading: true,
    error: null
  })
  const router = useRouter()
  const locale = useLocale()

  const updateListState = (updates: Partial<ListState>) => {
    setListState(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabaseの接続情報が設定されていません。環境変数を確認してください。');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // セッションの有効期限をチェック
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`認証エラー: ${sessionError.message}`);
        }

        if (!session) {
          // セッションが切れた場合はローカルストレージをクリア
          localStorage.removeItem('supabaseUrl');
          localStorage.removeItem('supabaseKey');
          return;
        }

        // セッションの有効期限が切れそうな場合は更新
        if (session.expires_at && new Date(session.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
        }

        setUser(session.user);

        // リストの取得処理
        const { data, error: fetchError } = await supabase
          .from('lists')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        updateListState({
          lists: data || [],
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('認証チェックエラー:', err);
        updateListState({
          lists: [],
          loading: false,
          error: err instanceof Error ? err.message : '不明なエラーが発生しました'
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      const currentPath = window.location.pathname;
      
      // 言語パスプレフィックスを無視して実際のルートパスを取得
      const pathWithoutLocale = currentPath.replace(/^\/[a-z]{2}\//, '/');
      
      if (!user) {
        // 未認証ユーザーはログイン、サインアップ、QRコードページ以外にアクセスできない
        if (!pathWithoutLocale.startsWith('/login') &&
            !pathWithoutLocale.startsWith('/signup') &&
            !pathWithoutLocale.startsWith('/qr/') &&
            !pathWithoutLocale.startsWith('/landing')) {
          router.push(`/${locale}/login`);
        }
      } else {
        // 認証済みユーザーはログインページにアクセスできない
        if (pathWithoutLocale.startsWith(`/${locale}/login`)) {
          router.push(`/${locale}/lists`);
        }
      }
    }
  }, [user, loading, router, locale]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    router.push(`/${locale}/lists`)
  }

  const signOut = async () => {
    try {
      // ユーザー状態をリセット
      setUser(null)
      updateListState({
        lists: [],
        loading: false,
        error: null
      });
      
      localStorage.removeItem('supabaseUrl');
      localStorage.removeItem('supabaseKey');
      // Supabaseのセッションをクリア
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // ログインページにリダイレクト
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('ログアウトエラー:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/${locale}/lists`
      }
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signOut, 
      signInWithGoogle,
      listState,
      updateListState
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
