import { useState } from 'react'
import SectionCard from '../common/SectionCard'
import ActionButton from '../common/ActionButton'
import api from '../../services/api'

export default function UploadTab({ testId, onSuccess }) {
  const [files, setFiles] = useState({
    errorReport: null,
    markList: null,
    blueprint: null,
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (key, event) => {
    const file = event.target.files[0] || null
    setFiles((prev) => ({
      ...prev,
      [key]: file,
    }))
  }

  const resetFiles = () => {
    setFiles({
      errorReport: null,
      markList: null,
      blueprint: null,
    })
    setMessage('')
    setError('')
  }

  const uploadCards = [
    {
      key: 'errorReport',
      title: 'ErrorReport',
      description: 'Contains right, wrong, and blank question data for each student.',
      hint: 'Recommended: Excel / CSV / PDF',
    },
    {
      key: 'markList',
      title: 'MarkList',
      description: 'Contains subject marks, total marks, percentage, and rank.',
      hint: 'Recommended: Excel / CSV / PDF',
    },
    {
      key: 'blueprint',
      title: 'Blueprint',
      description: 'Contains question mapping with topic, subtopic, and difficulty.',
      hint: 'Recommended: Excel / CSV / PDF',
    },
  ]

  const allSelected = Object.values(files).every(Boolean)

  const getStatusColor = (file) => {
    if (file) return 'text-green-600'
    return 'text-slate-500'
  }

  const handleValidate = async () => {
    if (!allSelected) {
      setError('Please upload all 3 files first.')
      setMessage('')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // PHASE 1: Upload Blueprint strictly for Database Insertion
      const blueprintData = new FormData()
      blueprintData.append('file', files.blueprint)

      await api.post(`/tests/${testId}/blueprint/upload`, blueprintData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // PHASE 2: Proceed with standard 3-file generation payload
      const formData = new FormData()
      formData.append('error_report', files.errorReport)
      formData.append('mark_list', files.markList)
      formData.append('blueprint', files.blueprint)

      const response = await api.post(`/tests/${testId}/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setMessage(response.data.message || 'Analytics generated successfully.')
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'object' && detail !== null) {
        setError(detail.message || detail.error || JSON.stringify(detail))
      } else {
        setError(detail || 'Upload failed. Please check the files and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Upload Test Files</h2>
        <p className="mt-2 text-gray-600">
          Upload the three required files to generate test analytics.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {uploadCards.map((card) => (
          <SectionCard key={card.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{card.description}</p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  files[card.key]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {files[card.key] ? 'Selected' : 'Pending'}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <input
                type="file"
                accept=".xls,.xlsx,.csv,.pdf,.doc,.docx"
                onChange={(e) => handleFileChange(card.key, e)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
              />
              <p className="mt-3 text-xs text-slate-500">{card.hint}</p>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Status</p>
              <p className={`mt-1 text-sm ${getStatusColor(files[card.key])}`}>
                {files[card.key] ? files[card.key].name : 'No file uploaded yet'}
              </p>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard className="mt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Upload Summary
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Make sure all three files are uploaded before generating analytics.
            </p>
          </div>

          <div className="flex gap-3">
            <ActionButton variant="secondary" onClick={resetFiles}>
              Reset
            </ActionButton>

            <ActionButton disabled={!allSelected || loading} onClick={handleValidate}>
              {loading ? 'Generating...' : 'Generate Analytics'}
            </ActionButton>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
