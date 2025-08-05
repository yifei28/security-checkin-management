import { useEffect, useState } from "react";
import { request } from '../util/request';
import { BASE_URL } from '../util/config';

interface Admin {
  id: number;
  username: string;
  superAdmin: boolean;
}

export default function ManagerPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [error, setError] = useState("");

  const fetchAdmins = async () => {
    try {
      const res = await request(`${BASE_URL}/api/admin`);
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      setError("无法获取管理员列表");
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = async () => {
    if (!username || !password) {
      setError("请填写用户名和密码");
      return;
    }

    try {
      const res = await request(`${BASE_URL}/api/admin`, {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          superAdmin: isSuper,
        }),
      });

      if (res.ok) {
        setUsername("");
        setPassword("");
        setIsSuper(false);
        setError("");
        fetchAdmins(); // refresh
      } else {
        const msg = await res.text();
        setError(msg || "添加失败");
      }
    } catch (err) {
      setError("网络错误，添加失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除该管理员吗？")) return;

    try {
      await request(`${BASE_URL}/api/admin/${id}`, {
        method: "DELETE",
      });
      fetchAdmins();
    } catch (err) {
      setError("删除失败");
    }
  };

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">管理员管理</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">添加管理员</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="用户名"
            className="border rounded px-3 py-2 flex-1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="密码"
            className="border rounded px-3 py-2 flex-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isSuper}
              onChange={(e) => setIsSuper(e.target.checked)}
              className="mr-1"
            />
            超级管理员
          </label>
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            添加
          </button>
        </div>
      </div>

      <table className="w-full table-auto border-collapse bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">ID</th>
            <th className="border px-4 py-2 text-left">用户名</th>
            <th className="border px-4 py-2 text-left">角色</th>
            <th className="border px-4 py-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td className="border px-4 py-2">{admin.id}</td>
              <td className="border px-4 py-2">{admin.username}</td>
              <td className="border px-4 py-2">
                {admin.superAdmin ? "超级管理员" : "普通管理员"}
              </td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => handleDelete(admin.id)}
                  className="text-red-600 hover:underline"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}