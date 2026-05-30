import { Routes, Route } from 'react-router-dom'

import Home from '../pages/Home'
import Schools from '../pages/Schools'
import SchoolDetails from '../pages/SchoolDetails'
import TestDetails from '../pages/TestDetails'
import DatabaseView from '../pages/DatabaseView'
import ReportsPage from '../pages/Report'
import StudentDetails from '../pages/StudentDetails'
import Comparison from '../pages/Comparison'
import NotFound from '../pages/NotFound'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/schools" element={<Schools />} />
      <Route path="/schools/:id" element={<SchoolDetails />} />
      <Route path="/tests/:id" element={<TestDetails />} />
      <Route path="/students/:id" element={<StudentDetails />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/database" element={<DatabaseView />} />
      <Route path="/comparison" element={<Comparison />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes