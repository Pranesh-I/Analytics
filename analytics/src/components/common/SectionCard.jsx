function SectionCard({ title, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${className}`}
    >
      {title && (
        <h2 className="text-lg font-semibold text-slate-800">
          {title}
        </h2>
      )}

      <div className={title ? 'mt-4' : ''}>
        {children}
      </div>
    </div>
  )
}

export default SectionCard