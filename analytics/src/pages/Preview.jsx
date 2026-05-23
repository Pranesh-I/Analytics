import MainLayout from '../components/layout/MainLayout'

function Preview() {
  const sampleRows = [
    { rollno: '101', name: 'Student A', phymarks: 78, chemmarks: 82, mathsmarks: 74, total: 234, percentage: '78%' },
    { rollno: '102', name: 'Student B', phymarks: 69, chemmarks: 75, mathsmarks: 71, total: 215, percentage: '71.6%' },
    { rollno: '103', name: 'Student C', phymarks: 88, chemmarks: 90, mathsmarks: 84, total: 262, percentage: '87.3%' },
  ]

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Preview Data</h1>
        <p className="mt-2 text-gray-600">
          Here you can preview the extracted and merged student data before report generation.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-800">Sample Preview Table</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Roll No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Physics</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Chemistry</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Maths</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Percentage</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {sampleRows.map((row) => (
                <tr key={row.rollno} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{row.rollno}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.phymarks}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.chemmarks}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.mathsmarks}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.total}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.percentage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}

export default Preview