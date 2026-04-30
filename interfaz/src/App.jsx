import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import POS from './pages/POS'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios' // Importamos el nuevo módulo

function App() {
  // Estado global de la sesión. Si es null, muestra el teclado de Login.
  const [usuarioActivo, setUsuarioActivo] = useState(null)

  // Pantalla de bloqueo
  if (!usuarioActivo) {
    return <Login onLoginExitoso={(datosUsuario) => setUsuarioActivo(datosUsuario)} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout usuarioActivo={usuarioActivo} onLogout={() => setUsuarioActivo(null)} />}>
          
          {/* Rutas exclusivas para el Administrador (rol_id === 1) */}
          {usuarioActivo.rol_id === 1 && (
            <>
              <Route index element={<Dashboard />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="usuarios" element={<Usuarios />} />
            </>
          )}

          {/* Ruta compartida (Admin y Cajero) */}
          <Route path="pos" element={<POS />} />

          {/* Redirección automática si un cajero inicia sesión o intenta ir a la raíz */}
          {usuarioActivo.rol_id === 2 && (
            <Route index element={<Navigate to="/pos" replace />} />
          )}
          
          {/* Si alguien intenta poner una URL que no le corresponde, lo mandamos al POS */}
          <Route path="*" element={<Navigate to={usuarioActivo.rol_id === 1 ? "/" : "/pos"} replace />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App