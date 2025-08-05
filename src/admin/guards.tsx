import { useState, useEffect } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';

interface Guard {
  id: number
  name: string
  phoneNumber: string
  employeeId: string
  site: { id: number; name: string }
}

interface Site {
  id: number
  name: string
}

export default function GuardManagement() {
  const [guards, setGuards] = useState<Guard[]>([])
  const [sites, setSites] = useState<Site[]>([])

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingGuard, setEditingGuard] = useState({
    name: '',
    phoneNumber: '',
    employeeId: '',
    siteId: ''
  })

  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    request(`${BASE_URL}/api/guards`)
      .then(res => res.json())
      .then(setGuards)
      .catch(err => {
        console.error(err);
        alert('获取保安列表失败');
      });


    request(`${BASE_URL}/api/sites`)
      .then(res => res.json())
      .then(setSites)
      .catch(err => {
        console.error(err);
        alert('获取单位列表失败');
      });
  }, [])

  const addGuard = () => {
    if (!selectedSiteId) {
      alert('请选择所属单位')
      return
    }

    const payload = {
      name: newName,
      phoneNumber: newPhone,
      site: { id: selectedSiteId }
    }

    request(`${BASE_URL}/api/guards`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(newGuard => {
        setGuards([...guards, newGuard])
        setNewName('')
        setNewPhone('')
        setSelectedSiteId(null)
        setShowForm(false)
      })
      .catch(err => {
        console.error(err)
        alert('添加保安失败')
      })
  }

  const startEditing = (guard: Guard) => {
    setEditingId(guard.id)
    setEditingGuard({
      name: guard.name,
      phoneNumber: guard.phoneNumber,
      employeeId: guard.employeeId,
      siteId: guard.site?.id?.toString() ?? ''
    })
  }

  const saveEditing = () => {
    const payload = {
      id: editingId,
      name: editingGuard.name,
      employeeId: editingGuard.employeeId,
      phoneNumber: editingGuard.phoneNumber,
      site: { id: Number(editingGuard.siteId) }
    }

    request(`${BASE_URL}/api/guards/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(updated => {
        setGuards(guards.map(g => g.id === updated.id ? updated : g))
        setEditingId(null)
        setEditingGuard({ name: '', phoneNumber: '', employeeId: '', siteId: '' })
      })
      .catch(() => alert('保存失败'))
  }

  const deleteGuard = (id: number) => {
    if (!confirm('确认删除该保安吗？')) return

    request(`${BASE_URL}/api/guards/${id}`, {
      method: 'DELETE'
    })
      .then(() => setGuards(guards.filter(g => g.id !== id)))
      .catch(() => alert('删除失败'))
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">保安管理</h1>

      {!showForm && (
        <button
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowForm(true)}
        >
          添加保安
        </button>
      )}

      {showForm && (
        <div className="mb-4 space-y-2 p-4 border rounded shadow bg-gray-50">
          <h2 className="text-lg font-semibold">添加保安信息</h2>
          <input className="border p-2 rounded w-full" placeholder="姓名" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="border p-2 rounded w-full" placeholder="手机号" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          <select className="border p-2 rounded w-full" value={selectedSiteId ?? ''} onChange={e => setSelectedSiteId(Number(e.target.value))}>
            <option value="" disabled>请选择所属单位</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          <div className="space-x-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={addGuard}>提交</button>
            <button className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">姓名</th>
            <th className="border p-2">工号</th>
            <th className="border p-2">手机号</th>
            <th className="border p-2">单位</th>
            <th className="border p-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {guards.map((guard) => (
            <tr key={guard.id}>
              <td className="border p-2 text-center">{guard.id}</td>
              <td className="border p-2">
                {editingId === guard.id ? (
                  <input className="border p-1 rounded w-full" value={editingGuard.name} onChange={e => setEditingGuard({ ...editingGuard, name: e.target.value })} />
                ) : guard.name}
              </td>
              <td className="border p-2">
                {guard.employeeId}
              </td>
              <td className="border p-2">
                {editingId === guard.id ? (
                  <input className="border p-1 rounded w-full" value={editingGuard.phoneNumber} onChange={e => setEditingGuard({ ...editingGuard, phoneNumber: e.target.value })} />
                ) : guard.phoneNumber}
              </td>
              <td className="border p-2">
                {editingId === guard.id ? (
                  <select className="border p-1 rounded w-full" value={editingGuard.siteId} onChange={e => setEditingGuard({ ...editingGuard, siteId: e.target.value })}>
                    <option value="">请选择单位</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                ) : (guard.site?.name ?? '未分配')}
              </td>
              <td className="border p-2 space-x-1 text-center">
                {editingId === guard.id ? (
                  <>
                    <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={saveEditing}>保存</button>
                    <button className="px-2 py-1 bg-gray-400 text-white rounded" onClick={() => setEditingId(null)}>取消</button>
                  </>
                ) : (
                  <>
                    <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => startEditing(guard)}>编辑</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => deleteGuard(guard.id)}>删除</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
