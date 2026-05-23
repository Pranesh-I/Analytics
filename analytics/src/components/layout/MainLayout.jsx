import Navbar from './Navbar'
import Sidebar from './Sidebar'

function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">

        <Navbar />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-in fade-in duration-300">
            {children}
          </div>
        </main>

      </div>

    </div>
  )
}

export default MainLayout