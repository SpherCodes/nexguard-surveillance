'use client'
import VideoPlayer from '@/components/VideoPlayer'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function ReplayContent() {
  const searchParams = useSearchParams();
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentId(searchParams.get('id'));
    console.log('Search Params ID:', searchParams.get('id'));
  }, [searchParams]);

  if (!currentId) {
    return <p>Loading ...</p>
  }

  return (
    <div className="w-full h-80 flex flex-col justify-center items-center mt-10">
      <VideoPlayer id={currentId!} />
    </div>
  )
}

export default function Replay() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ReplayContent />
    </Suspense>
  )
}
