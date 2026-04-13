-- 1. Catálogo de Roles
CREATE TABLE roles (
  id int2 PRIMARY KEY,
  nombre text UNIQUE NOT NULL,
  descripcion text
);

-- Insertamos los dos roles básicos de una vez
INSERT INTO roles (id, nombre, descripcion) VALUES 
(1, 'Administrador', 'Acceso total al sistema'),
(2, 'Cajero', 'Solo puede registrar ventas y ver productos');

-- 2. Catálogo de Categorías
CREATE TABLE categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  color_hex text,
  updated_at timestamptz DEFAULT now()
);

-- 3. Entidad: Usuarios
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id int2 REFERENCES roles(id),
  nombre_completo text NOT NULL,
  email text UNIQUE NOT NULL,
  pin_acceso varchar(6),
  activo boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 4. Entidad: Productos
CREATE TABLE productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES categorias(id),
  codigo_barras text UNIQUE,
  nombre text NOT NULL,
  precio_compra numeric(10,2) NOT NULL,
  precio_venta numeric(10,2) NOT NULL,
  stock_actual int4 DEFAULT 0,
  stock_minimo int4 DEFAULT 5,
  activo boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 5. Transaccional: Movimientos de Inventario (Kardex)
CREATE TABLE movimientos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid REFERENCES productos(id),
  usuario_id uuid REFERENCES usuarios(id),
  tipo_movimiento text NOT NULL,
  cantidad int4 NOT NULL,
  motivo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Transaccional: Ventas (Cabecera)
CREATE TABLE ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id),
  metodo_pago text NOT NULL,
  total_venta numeric(10,2) NOT NULL,
  dinero_recibido numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Transaccional: Detalles de Venta (Cuerpo del ticket)
CREATE TABLE detalles_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid REFERENCES ventas(id),
  producto_id uuid REFERENCES productos(id),
  cantidad int4 NOT NULL,
  precio_unitario_historico numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  updated_at timestamptz DEFAULT now()
);