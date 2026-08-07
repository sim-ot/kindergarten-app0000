import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function useAuth() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  function save(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  }
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, []);
  return { user, save, logout };
}

function Login({ onLogin }) {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [err,setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      onLogin(res.data.token, res.data.user);
    } catch (e) {
      setErr('Login failed');
    }
  }
  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl mb-4">Sign in</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full p-2 border" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-2 border" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="bg-blue-600 text-white px-4 py-2">Sign in</button>
        {err && <div className="text-red-600">{err}</div>}
      </form>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl">Dashboard</h1>
      <p>Quick actions: mark attendance, view students, fees.</p>
    </div>
  );
}

function Students() {
  const [students,setStudents] = useState([]);
  useEffect(()=>{ axios.get(`${API}/students`).then(r=>setStudents(r.data)); }, []);
  return (
    <div className="p-6">
      <h2 className="text-xl mb-3">Students</h2>
      <table className="w-full border">
        <thead><tr><th className="border p-2">Name</th><th className="border p-2">Class</th></tr></thead>
        <tbody>
          {students.map(s=>(
            <tr key={s.id}><td className="border p-2">{s.first_name} {s.last_name}</td><td className="border p-2">{s.class_name}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Attendance() {
  const [students,setStudents] = useState([]);
  useEffect(()=>{ axios.get(`${API}/students`).then(r=>setStudents(r.data)); }, []);
  async function mark(id, status) {
    await axios.post(`${API}/attendance/mark`, { student_id: id, date: new Date().toISOString().slice(0,10), status });
    alert('Marked');
  }
  return (
    <div className="p-6">
      <h2 className="text-xl mb-3">Attendance</h2>
      <div className="grid gap-3">
        {students.map(s=>(
          <div key={s.id} className="flex items-center justify-between border p-3">
            <div>{s.first_name} {s.last_name}</div>
            <div>
              <button onClick={()=>mark(s.id,'present')} className="mr-2 bg-green-500 text-white px-3 py-1">Present</button>
              <button onClick={()=>mark(s.id,'absent')} className="bg-red-500 text-white px-3 py-1">Absent</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppShell({ user, logout }) {
  return (
    <div>
      <nav className="bg-white shadow p-3 flex justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="font-bold">Kindergarten</Link>
          <Link to="/students" className="text-sm">Students</Link>
          <Link to="/attendance" className="text-sm">Attendance</Link>
        </div>
        <div>
          <span className="mr-3">Hi, {user?.name}</span>
          <button onClick={logout} className="text-sm text-red-600">Sign out</button>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/attendance" element={<Attendance />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  return (
    <BrowserRouter>
      {!auth.user ? <Login onLogin={auth.save} /> : <AppShell user={auth.user} logout={auth.logout} />}
    </BrowserRouter>
  );
}
