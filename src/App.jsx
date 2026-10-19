import { useEffect, useState } from "react";
import { api } from "./api.js";

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "-");

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api("/api/user/login", { method: "POST", body: { email, password } });
      localStorage.setItem("token", r.token);
      localStorage.setItem("user", JSON.stringify(r.user));
      onLogin(r.user);
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <form className="card login" onSubmit={submit}>
      <h2>Library Login</h2>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <div className="msg">{err}</div>}
      <button className="btn">Login</button>
    </form>
  );
}

const empty = { title: "", author: "", quantity: 1, location: "" };

function Books({ user }) {
  const admin = user.role === "ADMIN";
  const [books, setBooks] = useState([]);
  const [filter, setFilter] = useState({ title: "", author: "" });
  const [showDeleted, setShowDeleted] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [dates, setDates] = useState({});
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const q = new URLSearchParams({ ...filter, ...(admin && showDeleted ? { includeDeleted: "true" } : {}) });
      setBooks(await api("/api/books?" + q));
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [showDeleted]);

  const run = async (fn, ok) => {
    try { await fn(); setMsg(ok || ""); await load(); } catch (e) { setMsg(e.message); }
  };
  const save = (e) => {
    e.preventDefault();
    const body = { ...form, quantity: Number(form.quantity) };
    run(async () => {
      if (editId) await api(`/api/books/${editId}`, { method: "PATCH", body });
      else await api("/api/books", { method: "POST", body });
      setForm(empty); setEditId(null);
    }, editId ? "Book updated" : "Book created");
  };
  const edit = (b) => { setEditId(b._id); setForm({ title: b.title, author: b.author, quantity: b.quantity, location: b.location }); };

  return (
    <>
      {admin && (
        <form className="card" onSubmit={save}>
          <h3>{editId ? "Edit book" : "Add book"}</h3>
          <div className="row">
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <input type="number" min="0" style={{ width: 90 }} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <button className="btn">{editId ? "Save" : "Add"}</button>
            {editId && <button type="button" className="btn grey" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
      )}
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <input placeholder="Search title" value={filter.title} onChange={(e) => setFilter({ ...filter, title: e.target.value })} />
          <input placeholder="Search author" value={filter.author} onChange={(e) => setFilter({ ...filter, author: e.target.value })} />
          <button className="btn" onClick={load}>Search</button>
          {admin && (
            <label><input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} /> Show deleted</label>
          )}
        </div>
        {msg && <div className="msg">{msg}</div>}
        <table>
          <thead><tr><th>Title</th><th>Author</th><th>Qty</th><th>Location</th>{admin && <th>Status</th>}<th></th></tr></thead>
          <tbody>
            {books.map((b) => (
              <tr key={b._id} className={b.status === "DELETED" ? "deleted" : ""}>
                <td>{b.title}</td><td>{b.author}</td><td>{b.quantity}</td><td>{b.location}</td>
                {admin && <td><span className="badge">{b.status}</span></td>}
                <td>
                  {admin ? (
                    <div className="row">
                      <button className="btn" onClick={() => edit(b)}>Edit</button>
                      {b.status === "DELETED"
                        ? <button className="btn green" onClick={() => run(() => api(`/api/books/${b._id}`, { method: "PATCH", body: { status: "ACTIVE" } }), "Book restored")}>Restore</button>
                        : <button className="btn red" onClick={() => confirm("Delete this book?") && run(() => api(`/api/books/${b._id}`, { method: "DELETE" }), "Book deleted")}>Delete</button>}
                    </div>
                  ) : (
                    <div className="row">
                      <input type="date" value={dates[b._id] || ""} onChange={(e) => setDates({ ...dates, [b._id]: e.target.value })} />
                      <button className="btn" onClick={() => run(() => api("/api/borrow", { method: "POST", body: { bookId: b._id, targetDate: dates[b._id] } }), "Borrow request submitted — see Requests")}>Request</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!books.length && <tr><td colSpan="6">No books found</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Requests({ user }) {
  const admin = user.role === "ADMIN";
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const load = async () => { try { setRows(await api("/api/borrow")); } catch (e) { setMsg(e.message); } };
  useEffect(() => { load(); }, []);
  const act = async (id, status) => {
    try { await api("/api/borrow", { method: "PATCH", body: { id, status } }); setMsg(""); load(); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div className="card">
      <h3>{admin ? "All borrowing requests" : "My borrowing requests"}</h3>
      {msg && <div className="msg">{msg}</div>}
      <table>
        <thead><tr><th>Book</th>{admin && <th>User</th>}<th>Created</th><th>Pick-up date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td>{r.bookTitle}</td>{admin && <td>{r.userEmail}</td>}
              <td>{fmt(r.createdAt)}</td><td>{fmt(r.targetDate)}</td>
              <td><span className="badge">{r.status}</span></td>
              <td className="row">
                {admin && r.status === "INIT" && <button className="btn green" onClick={() => act(r._id, "ACCEPTED")}>Accept</button>}
                {admin && ["INIT", "ACCEPTED"].includes(r.status) && <button className="btn red" onClick={() => act(r._id, "CANCEL-ADMIN")}>Cancel</button>}
                {!admin && ["INIT", "ACCEPTED"].includes(r.status) && <button className="btn red" onClick={() => act(r._id, "CANCEL-USER")}>Cancel</button>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="6">No requests</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });
  const [tab, setTab] = useState("books");

  const logout = async () => {
    try { await api("/api/user/logout", { method: "POST" }); } catch {}
    localStorage.clear(); setUser(null); setTab("books");
  };
  if (!user || !localStorage.getItem("token")) return <Login onLogin={setUser} />;

  return (
    <>
      <header>
        <h1>📚 Library — {user.email} ({user.role})</h1>
        <button className={tab === "books" ? "active" : ""} onClick={() => setTab("books")}>Books</button>
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
          {user.role === "ADMIN" ? "Manage Requests" : "My Requests"}
        </button>
        <button onClick={logout}>Logout</button>
      </header>
      <main>{tab === "books" ? <Books user={user} /> : <Requests user={user} />}</main>
    </>
  );
}
