import React, { useState } from 'react'
import { ContentStore, CommunityConfig, FormField, CommunityMember, FormFieldType } from '../types'

interface CommunityAdminProps {
  store: ContentStore
  onUpdate: (newStore: ContentStore) => void
}

const FIELD_TYPES: FormFieldType[] = ['text', 'textarea', 'radio', 'checklist', 'select', 'upload']

export const CommunityAdmin: React.FC<CommunityAdminProps> = ({ store, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'registry'>('form')
  const community = store.modules.community

  const updateCommunity = (updates: Partial<CommunityConfig>) => {
    onUpdate({ ...store, modules: { ...store.modules, community: { ...community, ...updates } } })
  }

  const addField = () => {
    const newField: FormField = { id: `f_${Math.random().toString(36).substr(2, 5)}`, label: 'New Field', type: 'text', required: false, placeholder: 'Enter response...' }
    updateCommunity({ formFields: [...community.formFields, newField] })
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    updateCommunity({ formFields: community.formFields.map(f => f.id === id ? { ...f, ...updates } : f) })
  }

  const deleteField = (id: string) => {
    if (!confirm('Remove this field?')) return
    updateCommunity({ formFields: community.formFields.filter(f => f.id !== id) })
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...community.formFields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= fields.length) return
    ;[fields[index], fields[newIndex]] = [fields[newIndex], fields[index]]
    updateCommunity({ formFields: fields })
  }

  const updateMember = (id: string, updates: Partial<CommunityMember>) => {
    updateCommunity({ members: community.members.map(m => m.id === id ? { ...m, ...updates } : m) })
  }

  const deleteMember = (id: string) => {
    if (!confirm('Decommission this member record?')) return
    updateCommunity({ members: community.members.filter(m => m.id !== id) })
  }

  const exportCSV = () => {
    const headers = ['Email', 'Role', 'Join Date', ...community.formFields.map(f => f.label)].join(',')
    const rows = community.members.map(m => {
      const fieldData = community.formFields.map(f => `"${m.fields[f.id] || ''}"`).join(',')
      return `"${m.email}","${m.role}","${m.joinDate}",${fieldData}`
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + headers + '\n' + rows.join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `registry_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight uppercase mono">Community Protocol</h2>
          <p className="text-[10px] text-neutral-500 mono uppercase tracking-widest mt-1">Registry Management</p>
        </div>
        <div className="flex gap-2">
          {(['form', 'registry'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveSubTab(tab)} className={`px-4 py-2 text-[10px] mono uppercase tracking-widest border transition-all ${activeSubTab === tab ? 'bg-white text-black border-white' : 'text-neutral-500 border-white/10 hover:border-white/30'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {activeSubTab === 'form' && (
        <div className="space-y-10">
          <div className="flex justify-between items-center">
            <h3 className="text-xs uppercase mono tracking-[0.3em] text-neutral-600 font-bold">Registry Synthesis Engine</h3>
            <button onClick={addField} className="px-6 py-2 bg-white text-black text-[10px] mono uppercase font-bold hover:bg-neutral-200 transition-all">+ Add Field</button>
          </div>
          <div className="space-y-4">
            {community.formFields.map((field, idx) => (
              <div key={field.id} className="p-6 border border-white/5 bg-neutral-900/10 rounded-sm group relative">
                <div className="absolute top-4 right-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button onClick={() => moveField(idx, 'up')} className="text-neutral-500 hover:text-white mono text-xs">↑</button>
                    <button onClick={() => moveField(idx, 'down')} className="text-neutral-500 hover:text-white mono text-xs">↓</button>
                  </div>
                  <button onClick={() => deleteField(field.id)} className="text-red-500/50 hover:text-red-500 text-[10px] mono uppercase">Delete</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Field Label</label>
                    <input className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Data Type</label>
                    <select className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30 mono uppercase" value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FormFieldType })}>
                      {FIELD_TYPES.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Placeholder</label>
                    <input className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30" value={field.placeholder || ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="accent-white" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                    <span className="text-[9px] mono uppercase text-neutral-500">Required</span>
                  </label>
                  {['radio', 'checklist', 'select'].includes(field.type) && (
                    <div className="flex-grow space-y-1">
                      <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Options (Comma Delimited)</label>
                      <input className="w-full bg-black border border-white/10 p-2 text-xs outline-none focus:border-white/30" value={field.options?.join(', ') || ''} placeholder="Option 1, Option 2" onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {community.formFields.length === 0 && (
              <div className="py-20 text-center border border-dashed border-white/5 rounded-sm bg-neutral-900/5">
                <p className="text-[9px] uppercase mono text-neutral-700 tracking-[0.4em]">No Dynamic Fields Configured</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'registry' && (
        <div className="space-y-8 animate-in">
          <header className="flex justify-between items-center">
            <h3 className="text-xs uppercase mono tracking-[0.3em] text-neutral-600 font-bold">Operator Spreadsheet</h3>
            <button onClick={exportCSV} className="text-[10px] mono uppercase border-b border-white/10 hover:border-white transition-all text-neutral-400 hover:text-white">Export CSV</button>
          </header>
          <div className="border border-white/5 bg-black/40 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-neutral-900/60 border-b border-white/5">
                    <th className="p-4 text-[9px] uppercase mono text-neutral-500 font-bold tracking-widest">#</th>
                    <th className="p-4 text-[9px] uppercase mono text-neutral-500 font-bold tracking-widest">Email</th>
                    <th className="p-4 text-[9px] uppercase mono text-neutral-500 font-bold tracking-widest">Role</th>
                    <th className="p-4 text-[9px] uppercase mono text-neutral-500 font-bold tracking-widest">Joined</th>
                    {community.formFields.map(f => <th key={f.id} className="p-4 text-[9px] uppercase mono text-neutral-500 font-bold tracking-widest truncate max-w-[150px]">{f.label}</th>)}
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {community.members.map((member, i) => (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-[10px] mono text-neutral-700">{i + 1}</td>
                      <td className="p-4 text-xs font-bold text-neutral-200">{member.email}</td>
                      <td className="p-4">
                        <select className="bg-transparent border border-white/5 p-1 text-[10px] mono uppercase text-neutral-400 outline-none hover:border-white/20" value={member.role} onChange={e => updateMember(member.id, { role: e.target.value })}>
                          <option>Member</option><option>Operator</option><option>Lead</option><option>Admin</option>
                        </select>
                      </td>
                      <td className="p-4 text-[10px] mono text-neutral-600 uppercase">{member.joinDate}</td>
                      {community.formFields.map(f => <td key={f.id} className="p-4 text-[11px] text-neutral-400 truncate max-w-[150px]">{member.fields[f.id] || '-'}</td>)}
                      <td className="p-4 text-right">
                        <button onClick={() => deleteMember(member.id)} className="text-red-500/30 hover:text-red-500 text-[10px] mono uppercase transition-colors opacity-0 group-hover:opacity-100">Drop</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {community.members.length === 0 && <div className="py-20 text-center text-neutral-700 italic text-[9px] uppercase tracking-[0.4em]">No Personnel Detected</div>}
          </div>
        </div>
      )}
    </div>
  )
}
