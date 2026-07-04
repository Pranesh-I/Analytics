import sys

filepath = r"c:\MEDJEE\website\Analytics\analytics\src\pages\StudentDetails.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state variable
if "const [activeSubtopicTab" not in content:
    content = content.replace("const [selectedTest, setSelectedTest] = useState('combined');",
                              "const [selectedTest, setSelectedTest] = useState('combined');\n  const [activeSubtopicTab, setActiveSubtopicTab] = useState('Total');")

# 2. Add useMemo to process subtopic data
if "const subtopicColumns = useMemo(" not in content:
    use_memo_block = """
  // Prepare subtopic columns data
  const subtopicColumns = React.useMemo(() => {
    if (!subtopics || !subtopics.subtopics) return [];
    const subjects = Object.keys(subtopics.subtopics);
    if (subjects.length === 0) return [];

    let totalSubtopics = [];
    subjects.forEach(subj => {
      const rows = subtopics.subtopics[subj].map(r => ({ ...r, subject: subj }));
      totalSubtopics.push(...rows);
    });

    const columns = [
      { id: 'Total', title: 'Total', color: 'bg-slate-600', dot: 'bg-slate-500', data: totalSubtopics }
    ];

    subjects.forEach(subj => {
      columns.push({
        id: subj,
        title: subj,
        color: subj.toLowerCase().includes('phys') ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
               subj.toLowerCase().includes('chem') ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200',
        dot: subj.toLowerCase().includes('phys') ? 'bg-indigo-500' :
             subj.toLowerCase().includes('chem') ? 'bg-emerald-500' : 'bg-rose-500',
        data: subtopics.subtopics[subj].map(r => ({ ...r, subject: subj }))
      });
    });

    return columns;
  }, [subtopics]);
"""
    content = content.replace("  const getMasteryColor = (acc, correct, wrong) => {",
                              use_memo_block + "\n  const getMasteryColor = (acc, correct, wrong) => {")
                              
    if "import React, { useState, useEffect" not in content:
        content = content.replace("import { useState, useEffect }", "import React, { useState, useEffect }")
        
# 3. Replace Subtopic Analysis Section JSX
subtopic_section_old = """        {/* Subtopic Analysis Section */}
        <SectionCard title="Subtopic-wise Analysis">
          {subtopics && subtopics.subtopics && Object.keys(subtopics.subtopics).length > 0 ? (
            <div className="space-y-6 mt-2">
              {Object.entries(subtopics.subtopics).map(([subject, rows]) => (
                <div key={subject}>
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full inline-block ${
                      subject.toLowerCase().includes('phys') ? 'bg-indigo-500' :
                      subject.toLowerCase().includes('chem') ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}></span>
                    {subject}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((row, i) => {
                      const mc = getMasteryColor(row.accuracy);
                      return (
                        <div key={i} className={`rounded-xl border p-3 ${mc.bg}`}>
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-xs font-semibold ${mc.text} leading-tight`}>{row.subtopic}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                              row.accuracy >= 75 ? 'bg-green-200 text-green-800' :
                              row.accuracy >= 50 ? 'bg-amber-100 text-amber-800' :
                              row.accuracy > 0 ? 'bg-red-100 text-red-800' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {mc.badge}
                            </span>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>✅ {row.correct}</span>
                            <span>❌ {row.wrong}</span>
                            <span className="font-semibold text-slate-700">{row.accuracy}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 italic text-sm">
                No subtopic data available for this view. Re-run analytics to populate subtopic mastery.
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Subtopic data is computed during the analytics generation pipeline.
              </p>
            </div>
          )}
        </SectionCard>"""

subtopic_section_new = """        {/* Subtopic Analysis Section */}
        <SectionCard title="Subtopic-wise Analysis">
          {subtopicColumns.length > 0 ? (
            <div className="mt-2 flex flex-col h-full">
              {/* Mobile Tabs */}
              <div className="lg:hidden flex overflow-x-auto pb-3 mb-3 gap-2 border-b border-slate-200 hide-scrollbar">
                {subtopicColumns.map(col => (
                  <button
                    key={`tab-${col.id}`}
                    onClick={() => setActiveSubtopicTab(col.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      activeSubtopicTab === col.id 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {col.title}
                  </button>
                ))}
              </div>

              {/* Columns Container */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
                {subtopicColumns.map(col => {
                  // Only show active tab on mobile, show all on desktop
                  const isVisible = activeSubtopicTab === col.id;
                  
                  // Calculate summary for this column
                  const summary = { strong: 0, moderate: 0, weak: 0, unattempted: 0 };
                  col.data.forEach(row => {
                    const attempts = (row.correct || 0) + (row.wrong || 0);
                    if (attempts === 0) summary.unattempted++;
                    else if (row.accuracy >= 75) summary.strong++;
                    else if (row.accuracy >= 50) summary.moderate++;
                    else summary.weak++;
                  });
                  const totalCount = col.data.length;

                  return (
                    <div key={`col-${col.id}`} className={`${isVisible ? 'block' : 'hidden lg:block'} flex flex-col h-[550px]`}>
                      {/* Column Header */}
                      <div className="mb-3 shrink-0">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                          {col.title !== 'Total' && <span className={`w-2 h-2 rounded-full inline-block ${col.dot}`}></span>}
                          {col.title} <span className="text-xs text-slate-400 font-normal normal-case">({totalCount})</span>
                        </h3>
                        
                        {/* Stacked Bar Summary */}
                        {totalCount > 0 && (
                          <div className="w-full h-2.5 flex rounded-full overflow-hidden bg-slate-100 gap-0.5">
                            {summary.strong > 0 && <div style={{width: `${(summary.strong/totalCount)*100}%`}} className="bg-green-500" title={`Strong: ${summary.strong}`} />}
                            {summary.moderate > 0 && <div style={{width: `${(summary.moderate/totalCount)*100}%`}} className="bg-amber-400" title={`Moderate: ${summary.moderate}`} />}
                            {summary.weak > 0 && <div style={{width: `${(summary.weak/totalCount)*100}%`}} className="bg-red-500" title={`Weak: ${summary.weak}`} />}
                            {summary.unattempted > 0 && <div style={{width: `${(summary.unattempted/totalCount)*100}%`}} className="bg-slate-300" title={`Not Attempted: ${summary.unattempted}`} />}
                          </div>
                        )}
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1.5 px-1">
                          <span className="text-green-600">{summary.strong}</span>
                          <span className="text-amber-500">{summary.moderate}</span>
                          <span className="text-red-500">{summary.weak}</span>
                          <span className="text-slate-400">{summary.unattempted}</span>
                        </div>
                      </div>

                      {/* Scrollable Subtopic List */}
                      <div className="flex-grow overflow-y-auto pr-2 space-y-2 custom-scrollbar pb-4">
                        {col.data.map((row, i) => {
                          const mc = getMasteryColor(row.accuracy, row.correct, row.wrong);
                          const totalAttempts = (row.correct || 0) + (row.wrong || 0);
                          const isUnattempted = totalAttempts === 0;
                          
                          return (
                            <div key={i} className={`rounded-xl border p-3 ${mc.bg}`}>
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <p className={`text-xs font-semibold ${mc.text} leading-tight`}>
                                  {col.id === 'Total' && (
                                    <span className="text-[10px] opacity-70 uppercase block mb-0.5 font-bold tracking-wider">{row.subject}</span>
                                  )}
                                  {row.subtopic}
                                </p>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="flex gap-3 text-xs text-slate-500 font-medium bg-white/50 px-2 py-1 rounded-md">
                                  <span className="text-green-600" title="Correct">✅ {row.correct || 0}</span>
                                  <span className="text-red-500" title="Wrong">❌ {row.wrong || 0}</span>
                                  <span className="text-slate-600 border-l border-slate-300 pl-3" title="Total Attempts">Σ {totalAttempts}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                                    isUnattempted ? 'bg-slate-200 text-slate-600' :
                                    row.accuracy >= 75 ? 'bg-green-200 text-green-800' :
                                    row.accuracy >= 50 ? 'bg-amber-100 text-amber-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {mc.badge}
                                  </span>
                                  <span className={`font-bold text-sm ${isUnattempted ? 'text-slate-400' : 'text-slate-700'}`}>
                                    {isUnattempted ? '-' : `${row.accuracy}%`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400 italic text-sm">
                No subtopic data available for this view. Re-run analytics to populate subtopic mastery.
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Subtopic data is computed during the analytics generation pipeline.
              </p>
            </div>
          )}
        </SectionCard>"""

# Using python's string replace makes it easier to match big blocks
if "No subtopic data available for this view" in content and "Subtopic-wise Analysis" in content:
    # First, let's just find the start of the section
    start_idx = content.find("{/* Subtopic Analysis Section */}")
    end_idx = content.find("        {/* Test History List */}")
    
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + subtopic_section_new + "\n\n" + content[end_idx:]
    else:
        print("COULD NOT FIND START OR END INDICES!")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Update successful.")
