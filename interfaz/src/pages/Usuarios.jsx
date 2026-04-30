import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Users, Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [mensaje, setMensaje] = useState(null)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  
  const [formulario, setFormulario] = useState({
    nombre_completo: '', email: '', pin_acceso: '', rol_id: 2
  })

  const colors = {
    midnightGreen: '#024D60', lightSeaGreen: '#2CACAD', background: '#F8F9FA',
    danger: '#E11D48', edit: '#3B82F6', text: '#1C4EA7'
  }

  const cargarDatos = async () => {
    // Cargar usuarios con el nombre de su rol
    const { data: dataUsuarios } = await supabase.from('usuarios').select('*, roles(nombre)').order('nombre_completo')
    if (dataUsuarios) setUsuarios(dataUsuarios)

    // Cargar catálogo de roles
    const { data: dataRoles } = await supabase.from('roles').select('*')
    if (dataRoles) setRoles(dataRoles)
  }

  useEffect(() => { cargarDatos() }, [])

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value })

  const guardarUsuario = async (e) => {
    e.preventDefault()
    
    if (formulario.pin_acceso.length !== 6) {
      alert("El PIN de acceso debe tener exactamente 6 dígitos.")
      return
    }

    if (usuarioEditando) {
      const { error } = await supabase.from('usuarios').update({
        nombre_completo: formulario.nombre_completo, email: formulario.email,
        pin_acceso: formulario.pin_acceso, rol_id: formulario.rol_id
      }).eq('id', usuarioEditando)
      if (!error) mostrarMensaje('Usuario actualizado correctamente.')
    } else {
      const { error } = await supabase.from('usuarios').insert([{
        nombre_completo: formulario.nombre_completo, email: formulario.email,
        pin_acceso: formulario.pin_acceso, rol_id: formulario.rol_id, activo: true
      }])
      if (!error) mostrarMensaje('Usuario registrado con éxito.')
      else alert(error.message)
    }
  }

  const mostrarMensaje = (texto) => {
    setMensaje(texto)
    cancelarEdicion()
    cargarDatos()
    setTimeout(() => setMensaje(null), 3000)
  }

  const prepararEdicion = (user) => {
    setUsuarioEditando(user.id)
    setFormulario({ nombre_completo: user.nombre_completo, email: user.email, pin_acceso: user.pin_acceso, rol_id: user.rol_id })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setFormulario({ nombre_completo: '', email: '', pin_acceso: '', rol_id: 2 })
    setUsuarioEditando(null)
  }

  const eliminarUsuario = async (id) => {
    if (window.confirm("¿Seguro que deseas dar de baja a este usuario?")) {
      const { error } = await supabase.from('usuarios').delete().eq('id', id)
      if (!error) mostrarMensaje('Usuario eliminado.')
    }
  }

  return (
    <div style={{ padding: '40px', backgroundColor: colors.background, minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', borderBottom: `3px solid ${colors.lightSeaGreen}`, paddingBottom: '10px' }}>
        <Users size={40} color={colors.midnightGreen} />
        <div>
          <h1 style={{ margin: 0, color: colors.midnightGreen }}>Gestión de Personal</h1>
          <p style={{ margin: 0, color: '#64748B' }}>Administra cajeros y accesos</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: `4px solid ${usuarioEditando ? colors.edit : colors.lightSeaGreen}` }}>
        <h3 style={{ margin: '0 0 20px 0', color: colors.midnightGreen, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} color={usuarioEditando ? colors.edit : colors.lightSeaGreen} /> 
          {usuarioEditando ? 'Editar Empleado' : 'Nuevo Empleado'}
        </h3>
        
        <form onSubmit={guardarUsuario} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.label}>Nombre Completo</label>
            <input required type="text" name="nombre_completo" value={formulario.nombre_completo} onChange={manejarCambio} style={styles.input} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.label}>Correo Electrónico</label>
            <input required type="email" name="email" value={formulario.email} onChange={manejarCambio} style={styles.input} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.label}>PIN de Acceso (6 dígitos)</label>
            <input required type="text" maxLength="6" name="pin_acceso" value={formulario.pin_acceso} onChange={manejarCambio} style={styles.input} placeholder="Ej. 123456" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={styles.label}>Rol del Sistema</label>
            <select name="rol_id" value={formulario.rol_id} onChange={manejarCambio} style={styles.input}>
              {roles.map(rol => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '12px', backgroundColor: usuarioEditando ? colors.edit : colors.lightSeaGreen, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>
            {usuarioEditando ? 'Actualizar' : 'Registrar'}
          </button>
        </form>
        {usuarioEditando && <button onClick={cancelarEdicion} style={{ marginTop: '15px', padding: '8px 15px', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>}
      </div>

      {mensaje && <div style={{ padding: '12px', marginBottom: '20px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}><CheckCircle size={20}/> {mensaje}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: colors.midnightGreen, color: 'white', textAlign: 'left' }}>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Rol</th>
              <th style={styles.th}>PIN</th>
              <th style={{...styles.th, textAlign: 'center'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{...styles.td, fontWeight: 'bold'}}>{user.nombre_completo}</td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>
                  <span style={{ backgroundColor: user.rol_id === 1 ? '#DBEAFE' : '#FEF3C7', color: user.rol_id === 1 ? '#1E40AF' : '#92400E', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    {user.roles?.nombre}
                  </span>
                </td>
                <td style={{...styles.td, fontFamily: 'monospace', letterSpacing: '2px'}}>{user.pin_acceso}</td>
                <td style={{...styles.td, textAlign: 'center'}}>
                  <button onClick={() => prepararEdicion(user)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', marginRight: '15px' }}><Pencil size={20} color={colors.edit} /></button>
                  <button onClick={() => eliminarUsuario(user.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><Trash2 size={20} color={colors.danger} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  th: { padding: '15px', fontSize: '14px', textTransform: 'uppercase' },
  td: { padding: '15px', fontSize: '15px', color: '#334155' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#024D60', marginBottom: '5px' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }
}

export default Usuarios