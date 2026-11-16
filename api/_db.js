
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let pool;
let initPromise;

function getPool() {
  if (!pool) {
    const ssl = process.env.DB_SSL === "true"
      ? {
          ca: fs.readFileSync(
            path.join(process.cwd(), "certs", "isrgrootx1.pem")
          ),
          rejectUnauthorized: true
        }
      : undefined;

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl
    });
  }

  return pool;
}

async function addColumn(db, table, column, definition) {
  const [rows] = await db.query(
    `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
    [column]
  );

  if (!rows.length) {
    await db.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );
  }
}

async function initialize() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) DEFAULT '',
      price DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      status ENUM('recebido','preparo','pronto','entregue')
        DEFAULT 'recebido',
      total DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id INT,
      product_name VARCHAR(120) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      CONSTRAINT fk_order_items_order
        FOREIGN KEY(order_id) REFERENCES orders(id)
    )
  `);

  await addColumn(
    db,
    "orders",
    "customer_name",
    "VARCHAR(120) NOT NULL DEFAULT 'Estudante'"
  );

  await addColumn(
    db,
    "orders",
    "customer_class",
    "VARCHAR(80) DEFAULT NULL"
  );

  await addColumn(
    db,
    "orders",
    "notes",
    "VARCHAR(500) DEFAULT NULL"
  );

  const [count] = await db.query(
    "SELECT COUNT(*) AS n FROM products"
  );

  if (Number(count[0].n) === 0) {
    await db.query(
      "INSERT INTO products(name,description,price,stock,active) VALUES ?",
      [[
        ["Sanduíche natural", "Pão, frango e salada", 8, 30, 1],
        ["Suco natural", "Laranja · 300 ml", 4, 30, 1],
        ["Fatia de bolo", "Chocolate", 5, 0, 1]
      ]]
    );
  }

  return db;
}

async function db() {
  if (!initPromise) {
    initPromise = initialize().catch(error => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

function staff(req, res) {
  const pin = process.env.STAFF_PIN;

  if (
    !pin ||
    String(req.headers["x-staff-pin"] || "") !== pin
  ) {
    res.status(401).json({
      error: "PIN inválido ou acesso não autorizado."
    });

    return false;
  }

  return true;
}

module.exports = { db, staff };
