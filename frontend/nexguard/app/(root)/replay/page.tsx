'use client'
import VideoPlayer from '@/components/VideoPlayer'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Replay() {
  const searchParams = useSearchParams();
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentId(searchParams.get('id'));
  }, [searchParams]);

  if (!currentId) {
    return (
      <section className="flex h-full min-h-[60vh] w-full items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">No replay selected</h1>
          <p className="mt-2 text-sm text-gray-500">
            Pick an event from the activity feed to review its recording here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full px-2 sm:px-4 py-4 sm:py-6 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">Replay</p>
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Review captured footage</h1>
          <p className="text-sm text-gray-500">Event ID {currentId}</p>
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Captured video</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              #{currentId}
            </span>
          </div>

          <div className="rounded-b-2xl bg-gray-950/90 p-2 sm:p-3">
            <div className="w-full" style={{ height: 'min(80vh, calc(100vw * 9 / 16))' }}>
              <VideoPlayer id={currentId} className="h-full w-full" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-4 text-sm text-gray-500 shadow-sm">
          <p className="leading-relaxed">
            Tip: Use the controls inside the player to pause, scrub through the timeline, or review the scene frame by frame. This replay view keeps things minimal so you can stay focused on the footage.
          </p>
        </div>
      </div>
    </section>
  )
}
