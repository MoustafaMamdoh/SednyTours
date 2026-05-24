const isDev = window.location.port === "5173";
const BASE = isDev ? `http://${window.location.hostname}:8000/api` : "/api";

async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// Helper — appends caller_id as query param for admin-guarded endpoints
function withCaller(path, callerId) {
  return `${path}?caller_id=${callerId || 1}`;
}

export const api = {
  // ── Auth ──────────────────────────────────────────
  login: (data) => req("POST", "/login", data),

  // ── Dashboard ─────────────────────────────────────
  dashboard: () => req("GET", "/dashboard"),

  // ── Users (Admin) ─────────────────────────────────
  getUsers:    ()             => req("GET",    "/users"),
  createUser:  (data, cid)    => req("POST",   withCaller("/users", cid), data),
  updateUser:  (id, data, cid)=> req("PUT",    withCaller(`/users/${id}`, cid), data),
  deleteUser:  (id, cid)      => req("DELETE", withCaller(`/users/${id}`, cid)),

  // ── Accounts ──────────────────────────────────────
  getAccounts:   ()             => req("GET", "/accounts"),
  updateAccount: (id, data, cid)=> req("PUT", withCaller(`/accounts/${id}`, cid), data),

  // ── Periods ───────────────────────────────────────
  getPeriods: () => req("GET", "/periods"),

  // ── Receipts ──────────────────────────────────────
  getReceipts:    ()          => req("GET",    "/receipts"),
  createReceipt:  (data)      => req("POST",   "/receipts", data),
  updateReceipt:  (id, data, cid) => req("PUT", withCaller(`/receipts/${id}`, cid), data),
  deleteReceipt:  (id, cid)   => req("DELETE", withCaller(`/receipts/${id}`, cid)),
  acceptReceipt:  (id)        => req("PATCH",  `/receipts/${id}/accept`),

  // ── Journal ───────────────────────────────────────
  getJournal: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return req("GET", `/journal${q ? "?" + q : ""}`);
  },
  createJournal: (entries)    => req("POST",   "/journal", entries),
  deleteJournal: (id, cid)    => req("DELETE", withCaller(`/journal/${id}`, cid)),

  // ── Tickets ───────────────────────────────────────
  getTickets:    ()           => req("GET",    "/tickets"),
  getTicketsStats:()           => req("GET",    "/tickets/stats"),
  createTicket:  (data)       => req("POST",   "/tickets", data),
  updateTicket:  (id, data, cid)=> req("PUT",  withCaller(`/tickets/${id}`, cid), data),
  deleteTicket:  (id, cid)    => req("DELETE", withCaller(`/tickets/${id}`, cid)),

  // ── Hajj & Umrah ──────────────────────────────────
  getTrips:      ()           => req("GET",    "/hajj-trips"),
  createTrip:    (data)       => req("POST",   "/hajj-trips", data),
  deleteTrip:    (id, cid)    => req("DELETE", withCaller(`/hajj-trips/${id}`, cid)),
  getPilgrims:   (tripId)     => req("GET",    `/hajj-trips/${tripId}/pilgrims`),
  addPilgrim:    (data)       => req("POST",   "/hajj-trips/pilgrims", data),
  deletePilgrim: (id, cid)    => req("DELETE", withCaller(`/hajj-trips/pilgrims/${id}`, cid)),

  // ── Employees ─────────────────────────────────────
  getEmployees:    ()           => req("GET",    "/employees"),
  createEmployee:  (data)       => req("POST",   "/employees", data),
  updateEmployee:  (id, data, cid)=> req("PUT",  withCaller(`/employees/${id}`, cid), data),
  deleteEmployee:  (id, cid)    => req("DELETE", withCaller(`/employees/${id}`, cid)),

  // ── Salaries ──────────────────────────────────────
  getSalaries:  (periodId = 1) => req("GET",  `/salaries?period_id=${periodId}`),
  runPayroll:   (periodId = 1) => req("POST", `/salaries/run-payroll?period_id=${periodId}`),
  updateSalary: (id, data, cid)=> req("PUT",  withCaller(`/salaries/${id}`, cid), data),
};
