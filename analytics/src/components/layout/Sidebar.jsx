import { NavLink } from 'react-router-dom'

function Sidebar() {
  const linkClass = ({ isActive }) =>
    `block rounded-lg p-3 transition ${
      isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'
    }`

  return (
    <div className="min-h-screen w-64 bg-slate-900 p-5 text-white">
      <h2 className="mb-10 text-2xl font-bold">Analytics</h2>

      <nav className="flex flex-col gap-3">
        <NavLink to="/" className={linkClass}>
          Home
        </NavLink>

        <NavLink to="/upload" className={linkClass}>
          Upload Files
        </NavLink>

        <NavLink to="/preview" className={linkClass}>
          Preview
        </NavLink>

        <NavLink to="/report" className={linkClass}>
          Report
        </NavLink>
      </nav>
    </div>
  )
}

export default Sidebar