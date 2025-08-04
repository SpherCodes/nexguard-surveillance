import { FeedProps } from '@/Types'
import React from 'react'
import Image from 'next/image'

const FeedCard = ({ alertEvent }: FeedProps) => {
  // prepare data URI for base64 thumbnail
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

  return (
    <div
      className="group transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg bg-white border border-gray-100 rounded-md p-3 flex gap-4 w-full items-center"
    >
      <div className="flex-shrink-0">
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt="Detection thumbnail"
            width={160}
            height={90}
            unoptimized
            className="rounded-md object-cover border border-gray-200 group-hover:shadow-md transition-shadow duration-300"
          />
        ) : (
          <div className="w-[160px] h-[90px] bg-gray-100 flex items-center justify-center rounded-md text-gray-400 text-xl">
            ?
          </div>
        )}
      </div>

      <div className="flex-1 text-sm text-gray-800">
        <div className="font-medium text-base text-gray-900">
          Camera: <span className="font-semibold">{alertEvent.cameraId}</span>
        </div>

        {timestamp && (
          <div className="mt-1 text-xs text-gray-500 space-y-0.5">
            <div>Date: <span className="text-gray-700">{formattedDate}</span></div>
            <div>Time: <span className="text-gray-700">{formattedTime}</span></div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-gray-600">Confidence:</span>
          <span className="font-semibold text-gray-900">
            {alertEvent.confidence ? (alertEvent.confidence * 100).toFixed(1) : '--'}%
          </span>
        </div>
      </div>
    </div>
  )
}

export default FeedCard
