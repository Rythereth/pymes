import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Users, Store, UserCircle, LogOut } from 'lucide-react'

// Recibimos 'usuarioActivo' y la función 'onLogout' desde App.jsx
function Layout({ usuarioActivo, onLogout }) {
  const location = useLocation()
  const colors = { midnightGreen: '#024D60', lightSeaGreen: '#2CACAD', background: '#F8F9FA' }

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, roles: [1] }, // Solo Admin
    { name: 'Punto de Venta', path: '/pos', icon: <ShoppingCart size={20} />, roles: [1, 2] }, // Admin y Cajero
    { name: 'Inventario', path: '/inventario', icon: <Package size={20} />, roles: [1] }, // Solo Admin
    { name: 'Usuarios', path: '/usuarios', icon: <Users size={20} />, roles: [1] } // Solo Admin
  ]

  // Filtramos el menú según el rol del usuario conectado (1 = Admin, 2 = Cajero)
  const menuPermitido = menuItems.filter(item => item.roles.includes(usuarioActivo?.rol_id))

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: colors.background, fontFamily: "'Segoe UI', sans-serif" }}>
      
      <aside style={{ width: '260px', backgroundColor: colors.midnightGreen, color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '25px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Store size={28} color={colors.lightSeaGreen} />
          <h2 style={{ fontSize: '20px', margin: 0, fontWeight: '600' }}>Stockly</h2>
        </div>
        
        <nav style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {menuPermitido.map((item) => {
            const activo = location.pathname === item.path
            return (
              <Link key={item.name} to={item.path} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', textDecoration: 'none', color: activo ? 'white' : '#cbd5e1', borderRadius: '8px', backgroundColor: activo ? colors.lightSeaGreen : 'transparent', transition: 'all 0.2s ease', fontWeight: activo ? '600' : '400' }}>
                {item.icon}<span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Perfil y Cerrar Sesión */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <UserCircle size={36} color="#cbd5e1" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{usuarioActivo?.nombre_completo}</span>
              <span style={{ fontSize: '12px', color: colors.lightSeaGreen }}>
                {usuarioActivo?.rol_id === 1 ? 'Administrador' : 'Cajero'}
              </span>
            </div>
          </div>
          
          <button onClick={onLogout} style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#E11D48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <LogOut size={16} /> Cerrar Turno
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
        <Outlet /> 
      </main>
    </div>
  )
}

export default Layout