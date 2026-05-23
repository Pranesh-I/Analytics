import MainLayout from '../components/layout/MainLayout'
import SectionCard from '../components/common/SectionCard'
import ActionButton from '../components/common/ActionButton'

function Report() {
  const stats = [
    { label: 'Total Students', value: '120' },
    { label: 'Average Score', value: '68.4%' },
    { label: 'Top Rank', value: '1' },
    { label: 'Weak Topics', value: '4' },
  ]

  const subjectData = [
    { subject: 'Physics', score: '71%' },
    { subject: 'Chemistry', score: '66%' },
    { subject: 'Maths', score: '68%' },
  ]

  const weakTopics = [
    'Electrostatics',
    'Solutions',
    'Matrices & Determinants',
    'Colligative Properties',
  ]

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Report Dashboard</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          View final analytics and generate the spreadsheet report from the uploaded files.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <SectionCard key={item.label}>
            <p className="text-sm text-gray-500">{item.label}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">{item.value}</h2>
          </SectionCard>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Subject Performance">
          <div className="space-y-4">
            {subjectData.map((item) => (
              <div key={item.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {item.subject}
                  </span>
                  <span className="text-sm text-slate-500">{item.score}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-3 w-[70%] rounded-full bg-blue-600"></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Weak Topic Analysis">
          <div className="space-y-3">
            {weakTopics.map((topic, index) => (
              <div
                key={topic}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-700">{topic}</span>
                <span className="text-sm text-slate-500">Priority {index + 1}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Export Actions" className="mt-8">
        <p className="text-sm text-gray-600">
          Use these buttons after backend integration to generate the final spreadsheet.
        </p>

        <div className="mt-5 flex flex-wrap gap-4">
          <ActionButton>
            Generate Spreadsheet
          </ActionButton>
          <ActionButton variant="secondary">
            Download Report
          </ActionButton>
        </div>
      </SectionCard>
    </MainLayout>
  )
}

export default Report