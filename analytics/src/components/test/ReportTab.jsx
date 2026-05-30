import SectionCard from '../common/SectionCard'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'

export default function ReportTab({ data }) {
  const stats = [
    {
      label: 'Total Students',
      value: data?.merged?.merged_row_count ?? 0,
    },
    {
      label: 'Common Roll Nos',
      value: data?.merged?.rollno_check?.common_count ?? 0,
    },
    {
      label: 'Only in ErrorReport',
      value: data?.merged?.rollno_check?.only_in_first_count ?? 0,
    },
    {
      label: 'Only in MarkList',
      value: data?.merged?.rollno_check?.only_in_second_count ?? 0,
    },
  ]

  const errorReportPreview =
    data?.files?.errorReport?.analysis?.preview_rows || []

  const markListPreview =
    data?.files?.markList?.analysis?.preview_rows || []

  const blueprintPreview =
    data?.files?.blueprint?.analysis?.preview_rows || []

  const handleDownload = () => {
    // Basic logic to download the report
    window.open('http://localhost:8000/upload/download-report', '_blank');
  };

  if (!data) {
    return (
      <EmptyState
        title="No report data found"
        description="Go to Upload, validate the files, and then open the report page."
        actionText="Go to Upload"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Report Dashboard</h2>
        <p className="mt-2 text-gray-600">
          Final analytics view using the uploaded files and backend response.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <SectionCard key={item.label}>
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              {item.value}
            </p>
          </SectionCard>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <SectionCard title="ErrorReport Records">
          <p className="text-sm text-slate-600">
            Rows extracted: {errorReportPreview.length}
          </p>
        </SectionCard>

        <SectionCard title="MarkList Records">
          <p className="text-sm text-slate-600">
            Rows extracted: {markListPreview.length}
          </p>
        </SectionCard>

        <SectionCard title="Blueprint Records">
          <p className="text-sm text-slate-600">
            Rows extracted: {blueprintPreview.length}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Backend Message" className="mt-8">
        <p className="text-sm text-slate-600">
          {data.message || 'Files processed successfully.'}
        </p>
      </SectionCard>

      <SectionCard title="Export Actions" className="mt-8">
        <p className="text-sm text-gray-600">
          Download the fully generated performance report spreadsheet.
        </p>

        <div className="mt-5 flex flex-wrap gap-4">
          <ActionButton variant="primary" onClick={handleDownload}>
            Download Report
          </ActionButton>
        </div>
      </SectionCard>
    </div>
  )
}
