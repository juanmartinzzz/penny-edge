import Link from 'next/link'
import Button from '@/components/interaction/Button'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Penny Edge - TSX & TSXV Stock Analyzer
          </h1>
          <p className="mt-2 text-gray-600 mb-8">
            Analyze penny stocks from Toronto Stock Exchange (TSX) and TSX Venture Exchange (TSXV)
          </p>

          <div className="mt-8">
            <div className="flex flex-wrap gap-4">
              <Link href="/stocks">
                <Button variant="primary">
                  Browse TSX & TSXV Stocks
                </Button>
              </Link>
              <Link href="/future-features">
                <Button variant="secondary">
                  Manage Future Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
