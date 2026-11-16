
const { db, staff } = require("./_db");

module.exports = async (req, res) => {
  try {
    const connection = await db();

    // LISTAR PRODUTOS
    if (req.method === "GET") {
      const isStaff =
        process.env.STAFF_PIN &&
        String(req.headers["x-staff-pin"] || "") ===
          process.env.STAFF_PIN;

      const sql = isStaff
        ? `SELECT id, name, description, price, stock, active
           FROM products
           ORDER BY name`
        : `SELECT id, name, description, price, stock, active
           FROM products
           WHERE active = 1
           ORDER BY name`;

      const [rows] = await connection.query(sql);

      res.setHeader("Cache-Control", "no-store");

      return res.status(200).json({
        products: rows.map((product) => ({
          ...product,
          price: Number(product.price),
          stock: Number(product.stock),
          active: Boolean(product.active)
        }))
      });
    }

    // CADASTRAR PRODUTO
    if (req.method === "POST") {
      if (!staff(req, res)) return;

      const {
        name,
        description = "",
        price,
        stock = 0
      } = req.body || {};

      const productName = String(name || "").trim();
      const productPrice = Number(price);
      const productStock = Number(stock);

      if (
        !productName ||
        productName.length > 120 ||
        !Number.isFinite(productPrice) ||
        productPrice <= 0 ||
        !Number.isInteger(productStock) ||
        productStock < 0
      ) {
        return res.status(400).json({
          error:
            "Informe um nome válido, preço positivo e estoque inteiro não negativo."
        });
      }

      const [result] = await connection.query(
        `INSERT INTO products
          (name, description, price, stock, active)
         VALUES (?, ?, ?, ?, 1)`,
        [
          productName,
          String(description).trim().slice(0, 255),
          productPrice,
          productStock
        ]
      );

      return res.status(201).json({
        ok: true,
        id: result.insertId
      });
    }

    // EDITAR PRODUTO
    if (req.method === "PATCH") {
      if (!staff(req, res)) return;

      const {
        id,
        name,
        description = "",
        price,
        stock,
        active
      } = req.body || {};

      const productId = Number(id);
      const productName = String(name || "").trim();
      const productPrice = Number(price);
      const productStock = Number(stock);

      if (
        !Number.isInteger(productId) ||
        productId < 1 ||
        !productName ||
        productName.length > 120 ||
        !Number.isFinite(productPrice) ||
        productPrice <= 0 ||
        !Number.isInteger(productStock) ||
        productStock < 0
      ) {
        return res.status(400).json({
          error: "Dados do produto inválidos."
        });
      }

      const [result] = await connection.query(
        `UPDATE products
         SET name = ?,
             description = ?,
             price = ?,
             stock = ?,
             active = ?
         WHERE id = ?`,
        [
          productName,
          String(description).trim().slice(0, 255),
          productPrice,
          productStock,
          active === false ? 0 : 1,
          productId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Produto não encontrado."
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Produto atualizado com sucesso."
      });
    }

    // MÉTODO NÃO PERMITIDO
    return res.status(405).json({
      error: "Método não permitido."
    });

  } catch (error) {
    console.error("Erro em api/products.js:", error);

    return res.status(500).json({
      error: "Erro ao acessar os produtos."
    });
  }
};
