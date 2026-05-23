import MainLayout from '../components/layout/MainLayout'

function Home() {
  const cards = [
    {
      title: 'Upload Files',
      description: 'Add ErrorReport, MarkList, and Blueprint files.',
      value: 'Step 1',
    },
    {
      title: 'Validate Data',
      description: 'Check columns, roll numbers, and file matching.',
      value: 'Step 2',
    },
    {
      title: 'Generate Report',
      description: 'Create spreadsheet output and analytics.',
      value: 'Step 3',
    },
  ]

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800">
          Welcome to School Analytics Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Upload exam files, validate the data, and generate smart performance reports automatically.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-blue-600">{card.value}</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-800">
              {card.title}
            </h2>
            <p className="mt-3 text-sm text-gray-600">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Ready to begin?
        </h2>
        <p className="mt-2 text-gray-600">
          Go to Upload Files and start by adding the three required files.
        </p>
      </div>
    </MainLayout>
  )
}

export default Home