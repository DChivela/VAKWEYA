import { catalog } from '../data/catalog';

const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || 'Não foi possível concluir a ação.');
    error.status = response.status;
    throw error;
  }

  return payload;
}

export async function getCatalog() {
  try {
    return await request('/catalog');
  } catch (error) {
    return { ...catalog, source: 'local' };
  }
}

export async function getAssistantSuggestions() {
  try {
    return await request('/assistant/suggestions');
  } catch (error) {
    return { suggestions: [], source: 'local' };
  }
}

export async function askAssistant(message) {
  return request('/assistant/chat', {
    method: 'POST',
    body: { message }
  });
}

export async function createReservation(data, token) {
  try {
    return await request('/reservations', {
      method: 'POST',
      token,
      body: data
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }

    return {
      ok: true,
      demo: true,
      message:
        'Reserva registada no modo demonstração. Ligue a base de dados para persistência real.'
    };
  }
}

export async function getMyReservations(token) {
  return request('/reservations/me', { token });
}

export async function getAvailableDrivers(scheduledAt) {
  const params = new URLSearchParams();

  if (scheduledAt) {
    params.set('scheduledAt', scheduledAt);
  }

  const query = params.toString();
  return request(`/drivers/available${query ? `?${query}` : ''}`);
}

export async function getDriverDashboard(token) {
  return request('/driver/dashboard', { token });
}

export async function updateDriverAvailability(token, data) {
  return request('/driver/availability', {
    method: 'PATCH',
    token,
    body: data
  });
}

export async function uploadImage(data, token) {
  return request('/uploads', {
    method: 'POST',
    token,
    body: data
  });
}

export async function registerUser(data) {
  return request('/auth/register', {
    method: 'POST',
    body: data
  });
}

export async function loginUser(data) {
  return request('/auth/login', {
    method: 'POST',
    body: data
  });
}

export async function getCurrentUser(token) {
  return request('/auth/me', { token });
}

export async function sendContactMessage(data) {
  try {
    return await request('/contacts', {
      method: 'POST',
      body: data
    });
  } catch (error) {
    if (error.status) {
      throw error;
    }

    return {
      ok: true,
      demo: true,
      message:
        'Mensagem recebida no modo demonstração. A API guardará quando o MySQL estiver ativo.'
    };
  }
}

export async function adminLogin(credentials) {
  return request('/admin/login', {
    method: 'POST',
    body: credentials
  });
}

export async function getAdminOverview(token) {
  return request('/admin/overview', { token });
}

export async function getAdminReservations(token) {
  return request('/admin/reservations', { token });
}

export async function updateAdminReservationStatus(token, reservationId, status) {
  return request(`/admin/reservations/${reservationId}/status`, {
    method: 'PATCH',
    token,
    body: { status }
  });
}

export async function getAdminAssistantFaqs(token) {
  return request('/admin/assistant/faqs', { token });
}

export async function createAdminAssistantFaq(token, data) {
  return request('/admin/assistant/faqs', {
    method: 'POST',
    token,
    body: data
  });
}

export async function updateAdminAssistantFaq(token, id, data) {
  return request(`/admin/assistant/faqs/${id}`, {
    method: 'PUT',
    token,
    body: data
  });
}

export async function deleteAdminAssistantFaq(token, id) {
  return request(`/admin/assistant/faqs/${id}`, {
    method: 'DELETE',
    token
  });
}

export async function getAdminAssistantLogs(token) {
  return request('/admin/assistant/logs', { token });
}

export async function createAdminResource(token, resource, data) {
  return request(`/admin/content/${resource}`, {
    method: 'POST',
    token,
    body: data
  });
}

export async function updateAdminResource(token, resource, id, data) {
  return request(`/admin/content/${resource}/${id}`, {
    method: 'PUT',
    token,
    body: data
  });
}

export async function deleteAdminResource(token, resource, id) {
  return request(`/admin/content/${resource}/${id}`, {
    method: 'DELETE',
    token
  });
}

export async function getAdminUsers(token) {
  return request('/admin/users', { token });
}

export async function getAdminDrivers(token) {
  return request('/admin/drivers', { token });
}

export async function updateAdminDriver(token, userId, data) {
  return request(`/admin/drivers/${userId}`, {
    method: 'PUT',
    token,
    body: data
  });
}

export async function assignReservationDriver(token, reservationId, driverId) {
  return request(`/admin/reservations/${reservationId}/assign-driver`, {
    method: 'PATCH',
    token,
    body: { driverId }
  });
}

export async function updateAdminUser(token, id, data) {
  return request(`/admin/users/${id}`, {
    method: 'PUT',
    token,
    body: data
  });
}

export async function updateAdminUserRole(token, id, role) {
  return request(`/admin/users/${id}/role`, {
    method: 'PATCH',
    token,
    body: { role }
  });
}

export async function deleteAdminUser(token, id) {
  return request(`/admin/users/${id}`, {
    method: 'DELETE',
    token
  });
}
