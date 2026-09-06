import axios from 'axios';

// Em desenvolvimento, o proxy do Vite (vite.config.ts) já redireciona
// `/api` para localhost:5000, então VITE_API_URL pode ficar vazio. Em
// produção, defina VITE_API_URL com a URL real do backend no ambiente de
// build (ex: https://api.seurestaurante.com/api) — sem isso, o build de
// produção ficaria preso apontando para localhost, inutilizável fora da
// máquina de quem gerou o build.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  // Necessário para o navegador enviar/receber o cookie httpOnly de
  // autenticação (ver backend/src/controllers/auth.controller.ts). Sem
  // isso, o cookie setado no login nunca seria enviado de volta nas
  // próximas requisições.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
