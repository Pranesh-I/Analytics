function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-sm font-medium text-slate-600">{text}</p>
      </div>
    </div>
  )
}

export default LoadingState