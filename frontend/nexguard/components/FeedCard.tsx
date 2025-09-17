import { FeedProps } from '@/Types'
import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const FeedCard = ({ alertEvent}: FeedProps) => {
  const router = useRouter();
  const thumbnailBase64 = alertEvent.image_media?.[0]?.imageData;
  const thumbnailSrc = thumbnailBase64
    ? thumbnailBase64.startsWith('data:')
      ? thumbnailBase64
      : `data:image/jpeg;base64,${thumbnailBase64}`
    : null;

  const timestamp = alertEvent.timestamp ? new Date(alertEvent.timestamp) : null

  const formattedDate = timestamp?.toLocaleDateString('en-ZA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const formattedTime = timestamp?.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const handleCardClick = (id: string) => {
    router.push(`/replay?id=${id}`);
  }

  return (
    <div className="group bg-white rounded-2xl ring-1 ring-gray-200 p-3 hover:shadow-sm hover:ring-gray-300 transition-all duration-200 w-full max-w-full overflow-hidden"
      onClick={() => handleCardClick(alertEvent.id)}>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 truncate" title={`Camera ${alertEvent.cameraId}`}>
            <span className="text-gray-900">Camera</span> <span className="text-gray-600">{alertEvent.cameraId}</span>
          </h4>
          {timestamp && (
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formattedTime}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0",
          alertEvent.confidence && alertEvent.confidence > 0.8 
            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
            : alertEvent.confidence && alertEvent.confidence > 0.6
            ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" 
            : "bg-red-50 text-red-700 ring-1 ring-red-200"
        )}>
          {alertEvent.confidence ? (alertEvent.confidence * 100).toFixed(1) : '--'}%
        </div>
      </div>

      {/* Compact Image Section */}
      <div className="relative">
        {thumbnailSrc ? (
          <div className="relative overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">
            <Image
              src={thumbnailSrc}
              alt="Detection thumbnail"
              width={280}
              height={140}
              unoptimized
              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Confidence overlay */}
            <div className="absolute top-2 right-2">
              <div className={cn(
                "px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm",
                alertEvent.confidence && alertEvent.confidence > 0.8 
                  ? "bg-green-900/80 text-white"
                  : alertEvent.confidence && alertEvent.confidence > 0.6
                  ? "bg-yellow-900/80 text-white" 
                  : "bg-red-900/80 text-white"
              )}>
                {alertEvent.confidence ? (alertEvent.confidence * 100).toFixed(0) : '--'}%
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-32 bg-gray-50 rounded-lg ring-1 ring-gray-200 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">No Image</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FeedCard
