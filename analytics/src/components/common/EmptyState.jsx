function EmptyState({
  title = 'No data available',
  description = 'Upload files to start generating analytics and reports.',
  actionText,
  onAction,
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}

export default EmptyState