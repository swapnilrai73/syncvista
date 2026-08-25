export default function Loading() {
    return (
      <div className="flex h-screen w-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-14 font-medium text-gray-500">Loading page content...</p>
        </div>
      </div>
    )
  }