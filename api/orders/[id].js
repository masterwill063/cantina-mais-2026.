
const { db } = require("../_db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const connection = await db();
    const id = Number(req.query.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: "Número de pedido inválido."
      });
    }

    const [orders] = await connection.query(
      `SELECT id, status, total, created_at
       FROM orders
       WHERE id = ?`,
      [id]
    );

    if (!orders.length) {
      return res.status(404).json({
        error: "Pedido não encontrado."
      });
    }

    const [items] = await connection.query(
      `SELECT product_name, quantity, unit_price
       FROM order_items
       WHERE order_id = ?`,
      [id]
    );

    const order = orders[0];

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      order: {
        id: Number(order.id),
        orderNumber: String(order.id).padStart(3, "0"),
        status: order.status,
        total: Number(order.total),
        createdAt: order.created_at,
        items: items.map(item => ({
          name: item.product_name,
          quantity: Number(item.quantity),
          lineTotal:
            Number(item.unit_price) * Number(item.quantity)
        }))
      }
    });

  } catch (error) {
    console.error("Erro ao consultar pedido:", error);

    return res.status(500).json({
      error: "Erro ao consultar pedido."
    });
  }
};
