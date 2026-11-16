const { db, staff } = require("./_db");

module.exports = async (req, res) => {
  try {
    const p = await db();

    // CADASTRAR PEDIDO
    if (req.method === "POST") {
      const {
        items,
        customerName,
        customerClass = "",
        notes = ""
      } = req.body || {};

      const name = String(customerName || "").trim();
      const className = String(customerClass || "").trim();
      const observation = String(notes || "").trim();

      if (!name) {
        return res.status(400).json({
          error: "Informe seu nome para identificar o pedido."
        });
      }

      if (
        name.length > 120 ||
        className.length > 80 ||
        observation.length > 500
      ) {
        return res.status(400).json({
          error: "Confira o tamanho dos campos."
        });
      }

      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({
          error: "Carrinho vazio."
        });
      }

      const connection = await p.getConnection();

      try {
        await connection.beginTransaction();

        let total = 0;
        const chosen = [];

        for (const item of items) {
          const id = Number(item.productId);
          const quantity = Number(item.quantity);

          if (
            !Number.isInteger(id) ||
            id < 1 ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 30
          ) {
            throw new Error("Quantidade inválida.");
          }

          const [rows] = await connection.query(
            `SELECT id, name, price, stock
             FROM products
             WHERE id = ? AND active = 1
             FOR UPDATE`,
            [id]
          );

          if (
            !rows.length ||
            Number(rows[0].stock) < quantity
          ) {
            throw new Error(
              "Produto indisponível ou estoque insuficiente."
            );
          }

          const product = {
            ...rows[0],
            price: Number(rows[0].price),
            quantity
          };

          total += product.price * quantity;
          chosen.push(product);
        }

        const [result] = await connection.query(
          `INSERT INTO orders
            (status, total, customer_name, customer_class, notes)
           VALUES ('recebido', ?, ?, ?, ?)`,
          [
            total,
            name,
            className || null,
            observation || null
          ]
        );

        for (const product of chosen) {
          await connection.query(
            `INSERT INTO order_items
              (order_id, product_id, product_name, quantity, unit_price)
             VALUES (?, ?, ?, ?, ?)`,
            [
              result.insertId,
              product.id,
              product.name,
              product.quantity,
              product.price
            ]
          );

          await connection.query(
            `UPDATE products
             SET stock = stock - ?
             WHERE id = ?`,
            [product.quantity, product.id]
          );
        }

        await connection.commit();

        return res.status(201).json({
          order: {
            id: Number(result.insertId),
            orderNumber: String(result.insertId).padStart(3, "0"),
            status: "recebido",
            total,
            customerName: name,
            customerClass: className,
            notes: observation,
            items: chosen.map(product => ({
              name: product.name,
              quantity: product.quantity,
              lineTotal: product.price * product.quantity
            }))
          }
        });

      } catch (error) {
        await connection.rollback();

        return res.status(400).json({
          error: error.message
        });

      } finally {
        connection.release();
      }
    }

    // LISTAR PEDIDOS PARA A ATENDENTE
    if (req.method === "GET") {
      if (!staff(req, res)) return;

      const search = String(req.query.search || "").trim();
      const status = String(req.query.status || "").trim();

      let sql = `
        SELECT
          id,
          status,
          total,
          created_at,
          customer_name,
          customer_class,
          notes
        FROM orders
        WHERE 1 = 1
      `;

      const args = [];

      if (search) {
        sql += `
          AND (
            customer_name LIKE ?
            OR customer_class LIKE ?
            OR CAST(id AS CHAR) = ?
          )
        `;

        args.push(
          `%${search}%`,
          `%${search}%`,
          search.replace(/^0+/, "") || "0"
        );
      }

      if (
        ["recebido", "preparo", "pronto", "entregue"].includes(status)
      ) {
        sql += " AND status = ?";
        args.push(status);
      }

      sql += " ORDER BY id DESC LIMIT 200";

      const [orders] = await p.query(sql, args);

      const ids = orders.map(order => order.id);
      const itemsByOrder = {};

      if (ids.length) {
        const [items] = await p.query(
          `SELECT
             order_id,
             product_name,
             quantity,
             unit_price
           FROM order_items
           WHERE order_id IN (?)`,
          [ids]
        );

        for (const item of items) {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }

          itemsByOrder[item.order_id].push({
            name: item.product_name,
            quantity: Number(item.quantity),
            lineTotal:
              Number(item.unit_price) * Number(item.quantity)
          });
        }
      }

      return res.status(200).json({
        orders: orders.map(order => ({
          id: Number(order.id),
          orderNumber: String(order.id).padStart(3, "0"),
          status: order.status,
          total: Number(order.total),
          createdAt: order.created_at,
          customerName: order.customer_name,
          customerClass: order.customer_class,
          notes: order.notes,
          items: itemsByOrder[order.id] || []
        }))
      });
    }

    return res.status(405).json({
      error: "Método não permitido."
    });

  } catch (error) {
    console.error("Erro em api/orders.js:", error);

    return res.status(500).json({
      error: "Erro ao acessar pedidos."
    });
  }
};
