import { useState } from "react";
import { request } from '../util/request';
import { BASE_URL } from '../util/config';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username || !password) {
        setError("请输入用户名和密码");
        return;
    }

    setLoading(true);
    setError("");

    try {
        const res = await request(`${BASE_URL}/api/login`, {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("token", data.token);
            localStorage.setItem("superAdmin", data.superAdmin);
            window.location.href = "/admin"; // 登录成功跳转页面
        } else {
            const msg = await res.text();
            setError(msg || "登录失败");
        }
    } catch (err) {
        console.error(err);
        setError("网络错误，请稍后再试");
    } finally {
        setLoading(false);
    }
};

    return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">管理员登录</h2>
            {error && <div className="text-red-500 mb-2">{error}</div>}

            <form
                onSubmit={(e) => {
                e.preventDefault(); // 阻止表单自动刷新页面
                login();             // 调用你原来的 login 方法
                }}
            >
                <input
                    className="border border-gray-300 rounded px-3 py-2 w-full mb-3"
                    placeholder="用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    className="border border-gray-300 rounded px-3 py-2 w-full mb-4"
                    placeholder="密码"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded w-full"
                    disabled={loading}
                >
                {loading ? "登录中..." : "登录"}
                </button>
            </form>
        </div>
    </div>
    );
}