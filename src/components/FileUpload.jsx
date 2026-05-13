import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    setUploading(true)
    try {
      const fileName = `${Date.now()}_${file.name}`
      // 1. Upload to Supabase Storage 'datasets' bucket
      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(fileName, file)

      if (error) {
        console.error('Upload Error:', error)
        alert('Failed to upload file.')
      } else {
        // Redirect to chat
        navigate(`/chat/${encodeURIComponent(fileName)}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }, [navigate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']} })

  return (
    <div className="flex-1 overflow-y-auto h-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Knowledge Ingestion</h2>
        <p className="text-gray-500 mb-8">Connect your datasets to Aether AI for instant semantic analysis.</p>

        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-[#5D4492] bg-[#f0ecfc]' : 'border-gray-200 bg-white hover:border-[#5D4492] hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex justify-center mb-4 text-[#5D4492]">
            <UploadCloud size={48} />
          </div>
          <p className="text-xl font-semibold text-gray-700 mb-2">Drag and Drop Data</p>
          <p className="text-sm text-gray-500 mb-6">Support for CSV, XLSX, and PDF. Max file size 50MB.</p>
          <div className="flex gap-4 justify-center">
            <span className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-medium">CSV / XLSX</span>
          </div>
          
          {uploading && (
            <div className="mt-8">
              <p className="text-[#5D4492] text-sm font-semibold mb-2 animate-pulse">Uploading and Indexing...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-[#5D4492] h-2 rounded-full w-1/2 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
