function Navbar() {
  return (
    <div className="h-16 bg-white shadow-md flex items-center justify-between px-6">
      <h1 className="text-2xl font-bold text-blue-600">
        School Analytics
      </h1>

      <div className="text-sm text-gray-500">
        Performance Dashboard
      </div>
    </div>
  )
}

export default Navbar

// function Navbar() {
//   return (
//     <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
//       <div>
//         <h1 className="text-xl font-bold text-slate-800">
//           School Analytics Dashboard
//         </h1>
//         <p className="text-sm text-slate-500">
//           Upload files and generate reports
//         </p>
//       </div>

//       <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
//         Admin Panel
//       </div>
//     </div>
//   )
// }

// export default Navbar