import { Routes, Route } from 'react-router-dom'

import Home from '../pages/Home'
import Upload from '../pages/Upload'
import Preview from '../pages/Preview'
import Report from '../pages/Report'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/preview" element={<Preview />} />
      <Route path="/report" element={<Report />} />
    </Routes>
  )
}

export default AppRoutes