import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Receipt, CheckCircle, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react'

function POS() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [dineroRecibido, setDineroRecibido] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [ticketPausado, setTicketPausado] = useState(null)
  
  const bufferEscaneo = useRef('')
  const temporizadorEscaneo = useRef(null)

  const colors = {
    midnightGreen: '#024D60', prussianBlue: '#1C4EA7', lightSeaGreen: '#2CACAD',
    water: '#D9F5F0', background: '#F8F9FA', text: '#1C4EA7',
    danger: '#E11D48', success: '#10B981', gray: '#64748B', warning: '#F59E0B'
  }

  const obtenerProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').eq('activo', true)
    if (!error) setProductos(data)
  }

  useEffect(() => { obtenerProductos() }, [])

  const agregarAlCarrito = (producto, cantidadDeseada = 1) => {
    if (producto.stock_actual < cantidadDeseada) {
      mostrarAlertaTemporal("Stock insuficiente para esta cantidad.")
      return
    }

    setCarrito(prevCarrito => {
      const itemExistente = prevCarrito.find(item => item.id === producto.id)
      if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + cantidadDeseada
        if (nuevaCantidad > producto.stock_actual) {
          mostrarAlertaTemporal("Límite de stock alcanzado.")
          return prevCarrito
        }
        return prevCarrito.map(item => item.id === producto.id ? { ...item, cantidad: nuevaCantidad } : item)
      } else {
        return [...prevCarrito, { ...producto, cantidad: cantidadDeseada }]
      }
    })
  }

  useEffect(() => {
    const manejarTecladoGlobal = (e) => {
      if (e.key === 'Enter') {
        const codigoAProcesar = bufferEscaneo.current !== '' ? bufferEscaneo.current : busqueda
        if (codigoAProcesar) {
          let cantidad = 1
          let codigoFinal = codigoAProcesar

          if (codigoAProcesar.includes('*')) {
            const partes = codigoAProcesar.split('*')
            const posibleCantidad = parseInt(partes[0])
            if (!isNaN(posibleCantidad) && posibleCantidad > 0) {
              cantidad = posibleCantidad
              codigoFinal = partes[1]
            }
          }

          const productoEncontrado = productos.find(p => p.codigo_barras === codigoFinal)
          if (productoEncontrado) {
            agregarAlCarrito(productoEncontrado, cantidad)
            setBusqueda('')
          } else {
            mostrarAlertaTemporal("Producto no encontrado en la base de datos.")
          }
        }
        bufferEscaneo.current = ''
        return
      }

      if (e.target.tagName !== 'INPUT' && e.key.length === 1) {
        bufferEscaneo.current += e.key
        clearTimeout(temporizadorEscaneo.current)
        temporizadorEscaneo.current = setTimeout(() => { bufferEscaneo.current = '' }, 50)
      }
    }

    window.addEventListener('keydown', manejarTecladoGlobal)
    return () => window.removeEventListener('keydown', manejarTecladoGlobal)
  }, [productos, busqueda])

  const pausarVentaActual = () => {
    if (carrito.length === 0) return
    setTicketPausado([...carrito])
    setCarrito([])
    mostrarAlertaTemporal("Venta en pausa. Puedes atender al siguiente cliente.", true)
  }

  const recuperarVentaPausada = () => {
    if (!ticketPausado) return
    if (carrito.length > 0) {
      if(!window.confirm("Tienes productos en la venta actual. ¿Deseas reemplazarlos con el ticket en espera?")) return
    }
    setCarrito(ticketPausado)
    setTicketPausado(null)
  }

  const mostrarAlertaTemporal = (texto, esExito = false) => {
    setMensaje({ texto, tipo: esExito ? 'exito' : 'error' })
    setTimeout(() => setMensaje(null), 3000)
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prevCarrito => prevCarrito.map(item => {
      if (item.id === id) {
        const nuevaCantidad = item.cantidad + delta
        if (nuevaCantidad > 0 && nuevaCantidad <= item.stock_actual) return { ...item, cantidad: nuevaCantidad }
      }
      return item
    }))
  }

  const eliminarDelCarrito = (id) => setCarrito(prevCarrito => prevCarrito.filter(item => item.id !== id))

  const subtotal = carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0)
  const total = subtotal
  const cambio = dineroRecibido ? parseFloat(dineroRecibido) - total : 0

  const procesarVenta = async () => {
    if (carrito.length === 0) return
    if (metodoPago === 'Efectivo' && cambio < 0) {
      mostrarAlertaTemporal("El efectivo recibido es insuficiente.")
      return
    }

    setMensaje({ texto: 'Procesando venta...', tipo: 'exito' })
    
    const efectivoFinal = metodoPago === 'Efectivo' ? parseFloat(dineroRecibido) : total

    // 1. Insertar la venta general respetando el esquema SQL
    const { data: ventaData, error: errorVenta } = await supabase
      .from('ventas')
      .insert([{ 
        total_venta: total, 
        metodo_pago: metodoPago, 
        dinero_recibido: efectivoFinal 
      }])
      .select()

    if (errorVenta) {
      mostrarAlertaTemporal("Error al registrar la venta: " + errorVenta.message)
      return
    }

    const ventaId = ventaData[0].id

    // 2. Recorrer el carrito para guardar detalles y restar stock
    for (const item of carrito) {
      await supabase.from('detalles_venta').insert([{
        venta_id: ventaId,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario_historico: item.precio_venta,
        subtotal: item.cantidad * item.precio_venta
      }])

      await supabase.from('productos')
        .update({ stock_actual: item.stock_actual - item.cantidad })
        .eq('id', item.id)
    }

    mostrarAlertaTemporal("Venta registrada y stock actualizado.", true)
    setCarrito([])
    setDineroRecibido('')
    obtenerProductos()
  }

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo_barras?.includes(busqueda))

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: colors.background }}>
      
      <div style={{ flex: '7', padding: '30px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <h1 style={{ color: colors.midnightGreen, margin: 0, fontSize: '28px' }}>Punto de Venta</h1>
            <p style={{ color: colors.gray, marginTop: '5px' }}>Escanea códigos, usa formato "Cantidad*Código" o busca manual</p>
          </div>
          
          <div style={{ position: 'relative', width: '400px' }}>
            <Search size={20} color={colors.gray} style={{ position: 'absolute', left: '15px', top: '12px' }} />
            <input type="text" placeholder="Ej. 12*750123... o buscar por nombre" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }} />
          </div>
        </div>

        {mensaje && (
          <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', backgroundColor: mensaje.tipo === 'exito' ? '#D1FAE5' : '#FEE2E2', color: mensaje.tipo === 'exito' ? '#065F46' : '#991B1B', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mensaje.tipo === 'exito' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
            {mensaje.texto}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignContent: 'start' }}>
          {productosFiltrados.map((prod) => (
            <div key={prod.id} onClick={() => agregarAlCarrito(prod)} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', cursor: prod.stock_actual > 0 ? 'pointer' : 'not-allowed', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: prod.stock_actual > 0 ? 1 : 0.6 }}>
              <div>
                <span style={{ fontSize: '12px', color: colors.gray, letterSpacing: '1px' }}>{prod.codigo_barras || 'Sin código'}</span>
                <h3 style={{ margin: '8px 0', fontSize: '16px', color: colors.midnightGreen, lineHeight: '1.3' }}>{prod.nombre}</h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '15px' }}>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: colors.lightSeaGreen }}>${prod.precio_venta}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: prod.stock_actual > 0 ? colors.prussianBlue : colors.danger, backgroundColor: prod.stock_actual > 0 ? colors.water : '#FEE2E2', padding: '4px 8px', borderRadius: '6px' }}>{prod.stock_actual} ud.</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: '3', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-4px 0 15px rgba(0,0,0,0.02)' }}>
        
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={24} color={colors.midnightGreen} />
            <h2 style={{ margin: 0, color: colors.midnightGreen, fontSize: '20px' }}>Ticket</h2>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {ticketPausado && (
              <button onClick={recuperarVentaPausada} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: colors.warning, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                <PlayCircle size={16} /> Recuperar
              </button>
            )}
            <button onClick={pausarVentaActual} disabled={carrito.length === 0} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: carrito.length === 0 ? '#f1f5f9' : colors.gray, color: carrito.length === 0 ? '#cbd5e1' : 'white', border: 'none', borderRadius: '6px', cursor: carrito.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              <PauseCircle size={16} /> Pausar
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {carrito.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.gray, opacity: 0.7 }}>
              <ShoppingCart size={48} style={{ marginBottom: '15px' }} />
              <p>Esperando artículos...</p>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', marginBottom: '15px', borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', color: colors.midnightGreen, fontSize: '15px' }}>{item.nombre}</h4>
                  <span style={{ color: colors.lightSeaGreen, fontWeight: 'bold' }}>${item.precio_venta}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: colors.background, borderRadius: '8px', padding: '4px' }}>
                  <button onClick={() => cambiarCantidad(item.id, -1)} style={{ backgroundColor: 'white', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Minus size={14} color={colors.midnightGreen} /></button>
                  <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.id, 1)} style={{ backgroundColor: 'white', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Plus size={14} color={colors.midnightGreen} /></button>
                </div>
                
                <button onClick={() => eliminarDelCarrito(item.id)} style={{ backgroundColor: 'transparent', border: 'none', marginLeft: '15px', cursor: 'pointer' }}>
                  <Trash2 size={18} color={colors.danger} />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '25px', backgroundColor: colors.background, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold', color: colors.midnightGreen }}>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setMetodoPago('Efectivo')} style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: `2px solid ${metodoPago === 'Efectivo' ? colors.lightSeaGreen : '#cbd5e1'}`, backgroundColor: metodoPago === 'Efectivo' ? colors.water : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: colors.midnightGreen }}><Banknote size={18} /> Efectivo</button>
            <button onClick={() => setMetodoPago('Tarjeta')} style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: `2px solid ${metodoPago === 'Tarjeta' ? colors.lightSeaGreen : '#cbd5e1'}`, backgroundColor: metodoPago === 'Tarjeta' ? colors.water : 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: colors.midnightGreen }}><CreditCard size={18} /> Tarjeta</button>
          </div>

          {metodoPago === 'Efectivo' && (
            <div style={{ marginBottom: '20px' }}>
              <input type="number" value={dineroRecibido} onChange={(e) => setDineroRecibido(e.target.value)} placeholder="Efectivo recibido..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} />
              {dineroRecibido && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '16px', color: cambio >= 0 ? colors.success : colors.danger, fontWeight: 'bold' }}>
                  <span>Cambio:</span>
                  <span>${cambio >= 0 ? cambio.toFixed(2) : '0.00'}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={procesarVenta} disabled={carrito.length === 0} style={{ width: '100%', padding: '15px', backgroundColor: carrito.length === 0 ? '#cbd5e1' : colors.lightSeaGreen, color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: carrito.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <Receipt size={20} /> Cobrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default POS