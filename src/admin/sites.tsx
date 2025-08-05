import { useState, useEffect } from 'react'
import { request } from '../util/request';
import { BASE_URL } from '../util/config';

interface Site {
  id: number
  name: string
  latitude: number
  longitude: number
  allowedRadiusMeters: number
}

export default function SiteManagement() {
  const [sites, setSites] = useState<Site[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingSite, setEditingSite] = useState({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: ''
  })

  const [showForm, setShowForm] = useState(false)
  const [newSite, setNewSite] = useState({
    name: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: ''
  })

  useEffect(() => {
    request(`${BASE_URL}/api/sites`)
      .then(res => res.json())
      .then(data => setSites(data))
      .catch(() => alert('获取单位列表失败'))
  }, [])

  const addSite = () => {
    const payload = {
      name: newSite.name,
      latitude: parseFloat(newSite.latitude),
      longitude: parseFloat(newSite.longitude),
      allowedRadiusMeters: parseFloat(newSite.allowedRadiusMeters)
    }

    request(`${BASE_URL}/api/sites`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(newEntry => {
        setSites([...sites, newEntry])
        setNewSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' })
        setShowForm(false)
      })
      .catch(() => alert('添加单位失败'))
  }

  const startEditing = (site: Site) => {
    setEditingId(site.id)
    setEditingSite({
      name: site.name,
      latitude: site.latitude.toString(),
      longitude: site.longitude.toString(),
      allowedRadiusMeters: site.allowedRadiusMeters.toString()
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' })
  }

  const saveEditing = () => {
    const payload = {
      id: editingId,
      name: editingSite.name,
      latitude: parseFloat(editingSite.latitude),
      longitude: parseFloat(editingSite.longitude),
      allowedRadiusMeters: parseFloat(editingSite.allowedRadiusMeters)
    }

    request(`${BASE_URL}/api/sites/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(updated => {
        setSites(sites.map(s => (s.id === updated.id ? updated : s)))
        setEditingId(null)
        setEditingSite({ name: '', latitude: '', longitude: '', allowedRadiusMeters: '' })
      })
      .catch(() => alert('保存失败'))
  }

  const deleteSite = (id: number) => {
    if (!confirm('确认删除该单位吗？')) return

    request(`${BASE_URL}/api/sites/${id}`, {
        method: 'DELETE'
    })
        .then(() => setSites(sites.filter(s => s.id !== id)))
        .catch(() => alert('删除失败'))
  }


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">单位管理</h1>

      {!showForm && (
        <button
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => setShowForm(true)}
        >
          添加单位
        </button>
      )}

      {showForm && (
        <div className="mb-4 space-y-2 p-4 border rounded shadow bg-gray-50">
          <h2 className="text-lg font-semibold">添加单位信息</h2>
          <input className="border p-2 rounded w-full" placeholder="名称" value={newSite.name} onChange={e => setNewSite({ ...newSite, name: e.target.value })} />
          <input className="border p-2 rounded w-full" placeholder="纬度" value={newSite.latitude} onChange={e => setNewSite({ ...newSite, latitude: e.target.value })} />
          <input className="border p-2 rounded w-full" placeholder="经度" value={newSite.longitude} onChange={e => setNewSite({ ...newSite, longitude: e.target.value })} />
          <input className="border p-2 rounded w-full" placeholder="允许半径（米）" value={newSite.allowedRadiusMeters} onChange={e => setNewSite({ ...newSite, allowedRadiusMeters: e.target.value })} />
          <div className="space-x-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={addSite}>提交</button>
            <button className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">名称</th>
            <th className="border p-2">纬度</th>
            <th className="border p-2">经度</th>
            <th className="border p-2">允许半径 (米)</th>
            <th className="border p-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id}>
              <td className="border p-2 text-center">{site.id}</td>
              <td className="border p-2">
                {editingId === site.id ? (
                  <input
                    className="border p-1 rounded w-full"
                    value={editingSite.name}
                    onChange={e => setEditingSite({ ...editingSite, name: e.target.value })}
                  />
                ) : (
                  site.name
                )}
              </td>
              <td className="border p-2">
                {editingId === site.id ? (
                  <input
                    className="border p-1 rounded w-full"
                    value={editingSite.latitude}
                    onChange={e => setEditingSite({ ...editingSite, latitude: e.target.value })}
                  />
                ) : (
                  site.latitude
                )}
              </td>
              <td className="border p-2">
                {editingId === site.id ? (
                  <input
                    className="border p-1 rounded w-full"
                    value={editingSite.longitude}
                    onChange={e => setEditingSite({ ...editingSite, longitude: e.target.value })}
                  />
                ) : (
                  site.longitude
                )}
              </td>
              <td className="border p-2">
                {editingId === site.id ? (
                  <input
                    className="border p-1 rounded w-full"
                    value={editingSite.allowedRadiusMeters}
                    onChange={e => setEditingSite({ ...editingSite, allowedRadiusMeters: e.target.value })}
                  />
                ) : (
                  site.allowedRadiusMeters
                )}
              </td>
              <td className="border p-2 space-x-1 text-center">
                {editingId === site.id ? (
                    <>
                      <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={saveEditing}>保存</button>
                      <button className="px-2 py-1 bg-gray-400 text-white rounded" onClick={cancelEditing}>取消</button>
                    </>
                ) : (
                    <>
                      <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => startEditing(site)}>编辑</button>
                      <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => deleteSite(site.id)}>删除</button>
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
