import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Pencil, Trash2, Package, Edit, Plus, CheckCircle2, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

function Inventario() {
  const [productos, setProductos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [productoEditando, setProductoEditando] = useState(null)
  
  // --- NUEVOS ESTADOS PARA MOVIMIENTOS ---
  const [productoMovimiento, setProductoMovimiento] = useState(null)
  const [formMovimiento, setFormMovimiento] = useState({
    tipo_movimiento: 'Entrada', cantidad: '', motivo: ''
  })

  const [formulario, setFormulario] = useState({
    codigo_barras: '', nombre: '', precio_compra: '', precio_venta: '', stock_minimo: 5
  })

  const colors = {
    midnightGreen: '#024D60', prussianBlue: '#1C4EA7', lightSeaGreen: '#2CACAD',
    water: '#D9F5F0', background: '#F8F9FA', text: '#1C4EA7',
    danger: '#E11D48', warning: '#F59E0B', success: '#10B981', edit: '#3B82F6',
    movimiento: '#8B5CF6' // Morado para distinguir los movimientos
  }

  const obtenerProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('nombre', { ascending: true })
    if (!error) setProductos(data)
  }

  const manejarCambio = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value })
  const manejarCambioMov = (e) => setFormMovimiento({ ...formMovimiento, [e.target.name]: e.target.value })

  const guardarProducto = async (e) => {
    e.preventDefault()
    setMensaje('Procesando...')
    let errorAlGuardar = null;

    if (productoEditando) {
      const { error } = await supabase.from('productos').update({
          codigo_barras: formulario.codigo_barras, nombre: formulario.nombre,
          precio_compra: parseFloat(formulario.precio_compra), precio_venta: parseFloat(formulario.precio_venta),
          stock_minimo: parseInt(formulario.stock_minimo)
        }).eq('id', productoEditando);
      errorAlGuardar = error;
    } else {
      const { error } = await supabase.from('productos').insert([{ 
          codigo_barras: formulario.codigo_barras, nombre: formulario.nombre, 
          precio_compra: parseFloat(formulario.precio_compra), precio_venta: parseFloat(formulario.precio_venta), 
          stock_actual: 0, stock_minimo: parseInt(formulario.stock_minimo)
        }]);
      errorAlGuardar = error;
    }

    if (errorAlGuardar) setMensaje('Error: ' + errorAlGuardar.message)
    else {
      setMensaje(productoEditando ? '¡Producto actualizado!' : '¡Producto guardado con éxito!')
      cancelarEdicion()
      obtenerProductos()
    }
    setTimeout(() => setMensaje(''), 3000)
  }

  // --- LÓGICA DE MOVIMIENTOS ---
  const prepararMovimiento = (producto) => {
    setProductoMovimiento(producto)
    setFormMovimiento({ tipo_movimiento: 'Entrada', cantidad: '', motivo: '' })
    cancelarEdicion() // Cerramos el otro form si estaba abierto
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const guardarMovimiento = async (e) => {
    e.preventDefault()
    setMensaje('Registrando movimiento...')
    
    const cantidadMovimiento = parseInt(formMovimiento.cantidad)
    
    // Regla de negocio: No se puede sacar más de lo que hay
    if (formMovimiento.tipo_movimiento === 'Salida' && cantidadMovimiento > productoMovimiento.stock_actual) {
      alert("Error: No puedes retirar más stock del que tienes actualmente.")
      setMensaje('')
      return
    }

    const nuevoStock = formMovimiento.tipo_movimiento === 'Entrada' 
      ? productoMovimiento.stock_actual + cantidadMovimiento 
      : productoMovimiento.stock_actual - cantidadMovimiento;

    // 1. Guardamos el historial en movimientos_inventario
    const { error: errorMov } = await supabase.from('movimientos_inventario').insert([{
      producto_id: productoMovimiento.id,
      tipo_movimiento: formMovimiento.tipo_movimiento,
      cantidad: cantidadMovimiento,
      motivo: formMovimiento.motivo || 'Ajuste de inventario'
    }])

    if (errorMov) {
      setMensaje('Error: ' + errorMov.message)
      return
    }

    // 2. Actualizamos el stock en la tabla de productos
    const { error: errorProd } = await supabase.from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', productoMovimiento.id)

    if (!errorProd) {
      setMensaje('¡Movimiento registrado correctamente!')
      setProductoMovimiento(null)
      obtenerProductos()
    }
    setTimeout(() => setMensaje(''), 3000)
  }
  const prepararEdicion = (producto) => {
    setProductoEditando(producto.id)
    setFormulario({
      codigo_barras: producto.codigo_barras || '',
      nombre: producto.nombre,
      precio_compra: producto.precio_compra,
      precio_venta: producto.precio_venta,
      stock_minimo: producto.stock_minimo
    })
    setProductoMovimiento(null) // Si el panel morado estaba abierto, lo cerramos
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setFormulario({ codigo_barras: '', nombre: '', precio_compra: '', precio_venta: '', stock_minimo: 5 })
    setProductoEditando(null)
  }

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (!error) {
        setMensaje('Producto eliminado.')
        obtenerProductos()
      } else alert("Error al eliminar: " + error.message)
    }
  }

  useEffect(() => { obtenerProductos() }, [])

  return (
    <div style={{ backgroundColor: colors.background, minHeight: '100vh', padding: '40px', fontFamily: "'Segoe UI', sans-serif", color: colors.text }}>
      <header style={{ marginBottom: '30px', borderBottom: `3px solid ${colors.lightSeaGreen}`, paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Package size={40} color={colors.midnightGreen} />
        <div>
          <h1 style={{ color: colors.midnightGreen, margin: 0 }}>Inventario</h1>
          <p style={{ color: '#666', marginTop: '5px', marginBottom: 0 }}>Gestión de Inventario Local</p>
        </div>
      </header>

      {/* --- PANEL DINÁMICO: MUESTRA MOVIMIENTO O FORMULARIO NORMAL --- */}
      {productoMovimiento ? (
        <div style={{ backgroundColor: '#F3F4F6', border: `2px dashed ${colors.movimiento}`, padding: '25px', borderRadius: '12px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: colors.movimiento, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={20}/> Ajuste de Inventario: {productoMovimiento.nombre}
            </h3>
            <button onClick={() => setProductoMovimiento(null)} style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
          
          <form onSubmit={guardarMovimiento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '15px', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>Tipo de Movimiento</label>
              <select name="tipo_movimiento" value={formMovimiento.tipo_movimiento} onChange={manejarCambioMov} style={styles.input}>
                <option value="Entrada">Entrada (+)</option>
                <option value="Salida">Salida (-)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>Cantidad</label>
              <input required type="number" min="1" name="cantidad" value={formMovimiento.cantidad} onChange={manejarCambioMov} style={styles.input} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>Motivo (Opcional)</label>
              <input type="text" name="motivo" value={formMovimiento.motivo} onChange={manejarCambioMov} style={styles.input} placeholder="Ej. Compra a proveedor, Merma..." />
            </div>
            <button type="submit" style={{ padding: '12px', backgroundColor: colors.movimiento, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>
              Registrar
            </button>
          </form>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: productoEditando ? `4px solid ${colors.edit}` : `4px solid ${colors.lightSeaGreen}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: colors.midnightGreen, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {productoEditando ? <><Edit size={20} color={colors.edit}/> Editando Producto</> : <><Plus size={20} color={colors.lightSeaGreen}/> Registrar Nuevo Producto</>}
            </h3>
            {productoEditando && (
              <button onClick={cancelarEdicion} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: 'bold' }}>
                Cancelar Edición
              </button>
            )}
          </div>
          <form onSubmit={guardarProducto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>Código</label>
              <input required type="text" name="codigo_barras" value={formulario.codigo_barras} onChange={manejarCambio} style={styles.input} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>Nombre</label>
              <input required type="text" name="nombre" value={formulario.nombre} onChange={manejarCambio} style={styles.input} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>P. Compra</label>
              <input required type="number" step="0.01" name="precio_compra" value={formulario.precio_compra} onChange={manejarCambio} style={styles.input} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={styles.label}>P. Venta</label>
              <input required type="number" step="0.01" name="precio_venta" value={formulario.precio_venta} onChange={manejarCambio} style={styles.input} />
            </div>
            <button type="submit" style={{ padding: '12px', backgroundColor: productoEditando ? colors.edit : colors.lightSeaGreen, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>
              {productoEditando ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        </div>
      )}

      {mensaje && <p style={{ color: colors.success, fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle2 size={18}/> {mensaje}</p>}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: colors.midnightGreen, color: 'white' }}>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Producto</th>
              <th style={styles.th}>P. Venta</th>
              <th style={styles.th}>Stock Actual</th>
              <th style={{...styles.th, textAlign: 'center'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => (
              <tr key={prod.id} style={{ borderBottom: `1px solid ${colors.water}` }}>
                <td style={styles.td}>{prod.codigo_barras}</td>
                <td style={{ ...styles.td, fontWeight: '600' }}>{prod.nombre}</td>
                <td style={styles.td}>${prod.precio_venta}</td>
                <td style={styles.td}>
                  <span style={{ 
                    backgroundColor: prod.stock_actual === 0 ? '#FEE2E2' : (prod.stock_actual <= prod.stock_minimo ? '#FEF3C7' : colors.water), 
                    color: prod.stock_actual === 0 ? colors.danger : (prod.stock_actual <= prod.stock_minimo ? colors.warning : colors.midnightGreen),
                    padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold'
                  }}>
                    {prod.stock_actual === 0 ? 'AGOTADO' : `${prod.stock_actual} unidades`}
                  </span>
                </td>
                <td style={{...styles.td, textAlign: 'center'}}>
                  {/* Botón de Movimiento */}
                  <button onClick={() => prepararMovimiento(prod)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginRight: '15px' }} title="Registrar Entrada/Salida">
                    <ArrowRightLeft size={20} color={colors.movimiento} />
                  </button>
                  <button onClick={() => prepararEdicion(prod)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginRight: '15px' }} title="Editar">
                    <Pencil size={20} color={colors.edit} />
                  </button>
                  <button onClick={() => eliminarProducto(prod.id)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} title="Eliminar">
                    <Trash2 size={20} color={colors.danger} />
                  </button>
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
  th: { padding: '15px', textAlign: 'left', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' },
  td: { padding: '15px', fontSize: '15px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#024D60', marginBottom: '5px' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', outline: 'none' }
}

export default Inventario