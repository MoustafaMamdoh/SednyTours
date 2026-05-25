const isDev = window.location.port === "5173";
export const BASE = isDev ? `http://${window.location.hostname}:8000/api` : "/api";

async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "خطأ في الخادم");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (d) => req("POST", "/login", d),

  // Dashboard
  dashboard: () => req("GET", "/dashboard"),

  // Users
  getUsers:    ()           => req("GET",    "/users"),
  createUser:  (d)          => req("POST",   "/users", d),
  updateUser:  (id, d, uid) => req("PUT",    `/users/${id}?caller_id=${uid}`, d),
  deleteUser:  (id, uid)    => req("DELETE", `/users/${id}?caller_id=${uid}`),

  // Accounts
  getAccounts:   ()           => req("GET", "/accounts"),
  updateAccount: (id, d, uid) => req("PUT", `/accounts/${id}?caller_id=${uid}`, d),

  // Periods
  getPeriods: () => req("GET", "/periods"),

  // Receipts
  getReceipts:    ()           => req("GET",    "/receipts"),
  createReceipt:  (d)          => req("POST",   "/receipts", d),
  updateReceipt:  (id, d, uid) => req("PUT",    `/receipts/${id}?caller_id=${uid}`, d),
  deleteReceipt:  (id, uid)    => req("DELETE", `/receipts/${id}?caller_id=${uid}`),
  acceptReceipt:  (id)         => req("PATCH",  `/receipts/${id}/accept`),

  // Journal
  getJournal:          (params) => req("GET",    `/journal?${new URLSearchParams(params || {})}`),
  createJournalEntry:  (lines)  => req("POST",   "/journal", lines),
  deleteJournalEntry:  (id,uid) => req("DELETE", `/journal/${id}?caller_id=${uid}`),

  // Tickets
  getTickets:    ()           => req("GET",    "/tickets"),
  getTicketStats:()           => req("GET",    "/tickets/stats"),
  getAirlines:   ()           => req("GET",    "/tickets/airlines"),
  createTicket:  (d)          => req("POST",   "/tickets", d),
  updateTicket:  (id, d, uid) => req("PUT",    `/tickets/${id}?caller_id=${uid}`, d),
  deleteTicket:  (id, uid)    => req("DELETE", `/tickets/${id}?caller_id=${uid}`),

  // Hajj/Umrah
  getTrips:         ()           => req("GET",    "/hajj-trips"),
  createTrip:       (d)          => req("POST",   "/hajj-trips", d),
  deleteTrip:       (id, uid)    => req("DELETE", `/hajj-trips/${id}?caller_id=${uid}`),
  getPilgrims:      (tripId)     => req("GET",    `/hajj-trips/${tripId}/pilgrims`),
  addPilgrim:       (d)          => req("POST",   "/hajj-trips/pilgrims", d),
  updatePilgrim:    (id, d)      => req("PUT",    `/hajj-trips/pilgrims/${id}`, d),
  deletePilgrim:    (id, uid)    => req("DELETE", `/hajj-trips/pilgrims/${id}?caller_id=${uid}`),

  // Employees
  getEmployees:   ()           => req("GET",    "/employees"),
  createEmployee: (d)          => req("POST",   "/employees", d),
  updateEmployee: (id, d, uid) => req("PUT",    `/employees/${id}?caller_id=${uid}`, d),
  deleteEmployee: (id, uid)    => req("DELETE", `/employees/${id}?caller_id=${uid}`),
  getCommissions: (id, y, m)   => req("GET",    `/employees/${id}/commissions?year=${y}&month=${m}`),

  // Salaries
  getSalaries:  (periodId)      => req("GET",  `/salaries?period_id=${periodId}`),
  runPayroll:   (periodId)      => req("POST", `/salaries/run-payroll?period_id=${periodId}&auto_commissions=true`),
  updateSalary: (id, d, uid)   => req("PUT",  `/salaries/${id}?caller_id=${uid}`, d),

  // Backup / Restore
  restoreBackup: async (file, uid) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/restore?caller_id=${uid}`, {
      method: "POST",
      body: formData,
      // Do NOT set Content-Type header manually, let fetch set boundary
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "خطأ في الاستعادة");
    }
    return res.json();
  }
};
