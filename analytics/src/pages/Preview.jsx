import { useLocation, useNavigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import SectionCard from '../components/common/SectionCard'
import EmptyState from '../components/common/EmptyState'
import ActionButton from '../components/common/ActionButton'

function Preview() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state

  const errorReportPreview =
    data?.files?.errorReport?.analysis?.preview_rows || []

  const markListPreview =
    data?.files?.markList?.analysis?.preview_rows || []

  const blueprintPreview =
    data?.files?.blueprint?.analysis?.preview_rows || []

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Preview Data</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          This page shows the real data returned from the backend after upload and validation.
        </p>
      </div>

      {!data ? (
        <EmptyState
          title="No uploaded data found"
          description="Upload the files first to see the preview here."
          actionText="Go to Upload"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard title="Upload Status">
              <p className="text-sm text-slate-600">
                {data.message || 'Files processed successfully.'}
              </p>
            </SectionCard>

            <SectionCard title="Merged Rows">
              <p className="text-2xl font-bold text-slate-800">
                {data?.merged?.merged_row_count ?? 0}
              </p>
            </SectionCard>

            <SectionCard title="Roll Number Match">
              <p className="text-sm text-slate-600">
                Common: {data?.merged?.rollno_check?.common_count ?? 0}
              </p>
              <p className="text-sm text-slate-600">
                Only in ErrorReport: {data?.merged?.rollno_check?.only_in_first_count ?? 0}
              </p>
              <p className="text-sm text-slate-600">
                Only in MarkList: {data?.merged?.rollno_check?.only_in_second_count ?? 0}
              </p>
            </SectionCard>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <SectionCard title="ErrorReport Preview">
              {errorReportPreview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(errorReportPreview[0]).map((key) => (
                          <th key={key} className="px-3 py-2 font-semibold text-slate-700">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {errorReportPreview.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-3 py-2 text-slate-600">
                              {String(value ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No preview available.</p>
              )}
            </SectionCard>

            <SectionCard title="MarkList Preview">
              {markListPreview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(markListPreview[0]).map((key) => (
                          <th key={key} className="px-3 py-2 font-semibold text-slate-700">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {markListPreview.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-3 py-2 text-slate-600">
                              {String(value ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No preview available.</p>
              )}
            </SectionCard>

            <SectionCard title="Blueprint Preview">
              {blueprintPreview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(blueprintPreview[0]).map((key) => (
                          <th key={key} className="px-3 py-2 font-semibold text-slate-700">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {blueprintPreview.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-3 py-2 text-slate-600">
                              {String(value ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No preview available.</p>
              )}
            </SectionCard>
          </div>

          <div className="mt-8 flex justify-end">
            <ActionButton onClick={() => navigate('/report')}>
              Go to Report
            </ActionButton>
          </div>
        </>
      )}
    </MainLayout>
  )
}

export default Preview